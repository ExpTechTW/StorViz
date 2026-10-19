//! Linux directory reads: `getdents64` for names, then `statx` on the
//! directory fd (`STATX_BASIC_STATS`, `AT_SYMLINK_NOFOLLOW`).
//!
//! `statx` avoids walking parent components again. `stx_blocks` is in
//! 512-byte units, the same as `st_blocks`. Device numbers are rebuilt with
//! glibc's `makedev` so they match `MetadataExt::dev` used for symlink targets.
//! Kernels without `statx` fall back to `std::fs::read_dir`.

use std::cell::RefCell;
use std::io;
use std::path::Path;

use super::{cstring_path, read_directory_std, DirBatch, EntryKind, FileId};

const O_RDONLY: i32 = 0;
const O_NOFOLLOW: i32 = 0x20000;
const O_DIRECTORY: i32 = 0x10000;
const O_CLOEXEC: i32 = 0x80000;

const AT_SYMLINK_NOFOLLOW: i32 = 0x100;
const AT_NO_AUTOMOUNT: i32 = 0x800;
const AT_STATX_DONT_SYNC: i32 = 0x4000;
const STATX_BASIC_STATS: u32 = 0x7ff;

const DEFAULT_BUF: usize = 64 * 1024;
const ENOSYS: i32 = 38;

const S_IFMT: u16 = 0o170000;
const S_IFREG: u16 = 0o100000;
const S_IFDIR: u16 = 0o040000;
const S_IFLNK: u16 = 0o120000;

extern "C" {
    fn open(path: *const i8, flags: i32, ...) -> i32;
    fn openat(dirfd: i32, path: *const i8, flags: i32, ...) -> i32;
    fn close(fd: i32) -> i32;
}

thread_local! {
    static DENT_BUF: RefCell<Vec<u8>> = RefCell::new(vec![0u8; DEFAULT_BUF]);
}

struct OwnedFd(i32);

impl Drop for OwnedFd {
    fn drop(&mut self) {
        unsafe { close(self.0) };
    }
}

#[cfg_attr(not(test), allow(dead_code))]
pub fn read_directory(path: &Path) -> io::Result<DirBatch> {
    let fd = open_path(path)?;
    let fd = OwnedFd(fd);
    match read_fd(fd.0)? {
        Some(batch) => Ok(batch),
        None => read_directory_std(path),
    }
}

pub fn open_path(path: &Path) -> io::Result<i32> {
    let c_path = cstring_path(path)?;
    let fd = unsafe { open(c_path.as_ptr(), O_RDONLY | O_DIRECTORY | O_CLOEXEC) };
    if fd < 0 {
        Err(io::Error::last_os_error())
    } else {
        Ok(fd)
    }
}

/// `follow` is set only for a directory symlink the walker has decided to expand.
pub fn open_child(dirfd: i32, name: &[u8], follow: bool) -> io::Result<i32> {
    let c_name = std::ffi::CString::new(name)
        .map_err(|_| io::Error::new(io::ErrorKind::InvalidInput, "directory name contains NUL"))?;
    let mut flags = O_RDONLY | O_DIRECTORY | O_CLOEXEC;
    if !follow {
        flags |= O_NOFOLLOW;
    }
    let fd = unsafe { openat(dirfd, c_name.as_ptr(), flags) };
    if fd < 0 {
        Err(io::Error::last_os_error())
    } else {
        Ok(fd)
    }
}

/// `Ok(None)` means `statx` returned `ENOSYS`. The caller lists by path instead.
/// The directory fd stays open so children can still use `openat`.
pub fn read_fd(fd: i32) -> io::Result<Option<DirBatch>> {
    let listed = DENT_BUF.with(|cell| -> io::Result<Result<DirBatch, ()>> {
        let mut buf = cell.borrow_mut();
        if buf.len() < DEFAULT_BUF {
            buf.resize(DEFAULT_BUF, 0);
        }
        let mut batch = DirBatch::new();
        loop {
            let n = syscall_getdents(fd, buf.as_mut_ptr(), buf.len())?;
            if n == 0 {
                return Ok(Ok(batch));
            }
            let mut off = 0usize;
            while off + 19 <= n {
                let reclen = u16::from_ne_bytes([buf[off + 16], buf[off + 17]]) as usize;
                if reclen < 19 || off + reclen > n {
                    return Err(io::Error::new(
                        io::ErrorKind::InvalidData,
                        "getdents64 record length",
                    ));
                }
                let name_at = off + 19;
                let region = &buf[name_at..off + reclen];
                let nul = region
                    .iter()
                    .position(|byte| *byte == 0)
                    .unwrap_or(region.len());
                let name = &region[..nul];
                if name.is_empty() || name == b"." || name == b".." {
                    off += reclen;
                    continue;
                }
                // Copy out of the dent buffer before `statx` so the name bytes
                // and the syscall pointer are not aliases of that buffer.
                let Ok(c_name) = std::ffi::CString::new(name) else {
                    off += reclen;
                    continue;
                };
                match statx_at(fd, c_name.as_ptr() as *const u8) {
                    Ok(parsed) => batch.push(c_name.as_bytes(), parsed.0, parsed.1, parsed.2, None),
                    Err(err) if err.raw_os_error() == Some(ENOSYS) => return Ok(Err(())),
                    Err(_) => {}
                }
                off += reclen;
            }
            if off != n {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    "getdents64 leftover bytes",
                ));
            }
        }
    })?;
    match listed {
        Ok(batch) => Ok(Some(batch)),
        Err(()) => Ok(None),
    }
}

struct Parsed(EntryKind, u64, Option<FileId>);

fn statx_at(dirfd: i32, name: *const u8) -> io::Result<Parsed> {
    let mut raw = [0u8; 256];
    let flags = AT_SYMLINK_NOFOLLOW | AT_NO_AUTOMOUNT | AT_STATX_DONT_SYNC;
    syscall_statx(dirfd, name, flags, STATX_BASIC_STATS, raw.as_mut_ptr())?;
    let mode = u16::from_ne_bytes([raw[28], raw[29]]);
    let ino = u64::from_ne_bytes(raw[32..40].try_into().unwrap());
    let blocks = u64::from_ne_bytes(raw[48..56].try_into().unwrap());
    let major = u32::from_ne_bytes(raw[136..140].try_into().unwrap());
    let minor = u32::from_ne_bytes(raw[140..144].try_into().unwrap());
    let kind = match mode & S_IFMT {
        S_IFREG => EntryKind::File,
        S_IFDIR => EntryKind::Directory,
        S_IFLNK => EntryKind::Symlink,
        _ => EntryKind::Other,
    };
    let size_on_disk = match kind {
        EntryKind::File | EntryKind::Symlink => blocks.saturating_mul(512),
        EntryKind::Directory | EntryKind::Other => 0,
    };
    Ok(Parsed(
        kind,
        size_on_disk,
        Some(FileId {
            dev: makedev(major, minor),
            ino,
        }),
    ))
}

/// glibc `gnu_dev_makedev`, so `statx` device ids match libc `st_dev`.
fn makedev(major: u32, minor: u32) -> u64 {
    let major = u64::from(major);
    let minor = u64::from(minor);
    ((major & 0xfff) << 8) | ((major & !0xfff) << 32) | (minor & 0xff) | ((minor & !0xff) << 12)
}

fn syscall_getdents(fd: i32, buf: *mut u8, len: usize) -> io::Result<usize> {
    #[cfg(target_arch = "x86_64")]
    let n = 217isize;
    #[cfg(target_arch = "aarch64")]
    let n = 61isize;
    #[cfg(target_arch = "riscv64")]
    let n = 61isize;
    #[cfg(not(any(
        target_arch = "x86_64",
        target_arch = "aarch64",
        target_arch = "riscv64"
    )))]
    {
        let _ = (fd, buf, len);
        return Err(io::Error::from_raw_os_error(ENOSYS));
    }
    #[cfg(any(
        target_arch = "x86_64",
        target_arch = "aarch64",
        target_arch = "riscv64"
    ))]
    cvt(unsafe { syscall3(n, fd as usize, buf as usize, len) })
}

fn syscall_statx(
    dirfd: i32,
    name: *const u8,
    flags: i32,
    mask: u32,
    out: *mut u8,
) -> io::Result<()> {
    #[cfg(target_arch = "x86_64")]
    let n = 332isize;
    #[cfg(target_arch = "aarch64")]
    let n = 291isize;
    #[cfg(target_arch = "riscv64")]
    let n = 291isize;
    #[cfg(not(any(
        target_arch = "x86_64",
        target_arch = "aarch64",
        target_arch = "riscv64"
    )))]
    {
        let _ = (dirfd, name, flags, mask, out);
        return Err(io::Error::from_raw_os_error(ENOSYS));
    }
    #[cfg(any(
        target_arch = "x86_64",
        target_arch = "aarch64",
        target_arch = "riscv64"
    ))]
    {
        cvt(unsafe {
            syscall5(
                n,
                dirfd as usize,
                name as usize,
                flags as usize,
                mask as usize,
                out as usize,
            )
        })?;
        Ok(())
    }
}

fn cvt(result: isize) -> io::Result<usize> {
    if result < 0 {
        Err(io::Error::from_raw_os_error((-result) as i32))
    } else {
        Ok(result as usize)
    }
}

#[cfg(target_arch = "x86_64")]
unsafe fn syscall3(n: isize, a0: usize, a1: usize, a2: usize) -> isize {
    syscall5(n, a0, a1, a2, 0, 0)
}

#[cfg(target_arch = "x86_64")]
unsafe fn syscall5(n: isize, a0: usize, a1: usize, a2: usize, a3: usize, a4: usize) -> isize {
    let ret: isize;
    std::arch::asm!(
        "syscall",
        inlateout("rax") n => ret,
        in("rdi") a0,
        in("rsi") a1,
        in("rdx") a2,
        in("r10") a3,
        in("r8") a4,
        in("r9") 0usize,
        out("rcx") _,
        out("r11") _,
    );
    ret
}

#[cfg(target_arch = "aarch64")]
unsafe fn syscall3(n: isize, a0: usize, a1: usize, a2: usize) -> isize {
    syscall5(n, a0, a1, a2, 0, 0)
}

#[cfg(target_arch = "aarch64")]
unsafe fn syscall5(n: isize, a0: usize, a1: usize, a2: usize, a3: usize, a4: usize) -> isize {
    let ret: usize;
    std::arch::asm!(
        "svc #0",
        in("x8") n,
        inlateout("x0") a0 => ret,
        in("x1") a1,
        in("x2") a2,
        in("x3") a3,
        in("x4") a4,
        in("x5") 0usize,
    );
    ret as isize
}

#[cfg(target_arch = "riscv64")]
unsafe fn syscall3(n: isize, a0: usize, a1: usize, a2: usize) -> isize {
    syscall5(n, a0, a1, a2, 0, 0)
}

#[cfg(target_arch = "riscv64")]
unsafe fn syscall5(n: isize, a0: usize, a1: usize, a2: usize, a3: usize, a4: usize) -> isize {
    let ret: usize;
    std::arch::asm!(
        "ecall",
        in("a7") n,
        inlateout("a0") a0 => ret,
        in("a1") a1,
        in("a2") a2,
        in("a3") a3,
        in("a4") a4,
        in("a5") 0usize,
    );
    ret as isize
}
