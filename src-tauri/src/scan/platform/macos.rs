//! macOS directory reads via `getattrlistbulk` on an open directory fd.
//!
//! One syscall returns a batch of names, vnode types, device ids, file ids,
//! flags, and allocated sizes. `FSOPT_NOFOLLOW` keeps a symlink's own inode
//! and block count. `ATTR_FILE_ALLOCSIZE` is in bytes and matches
//! `st_blocks * 512` for the files this scanner charges.
//!
//! Record layout (attribute order is bit order, not request order):
//! `u32` length, then `attribute_set` (20 bytes), then the requested common
//! attributes. `u64` fields are packed on a 4-byte boundary. The name is an
//! `attrreference` whose offset is relative to the reference itself and
//! includes the trailing NUL. File attributes are omitted for directories
//! even when `FSOPT_PACK_INVAL_ATTRS` is set, so the parser follows the
//! returned attribute bits.

use std::cell::RefCell;
use std::io;
use std::path::Path;

use super::{cstring_path, DirBatch, EntryKind, FileId};

const FSOPT_NOFOLLOW: u64 = 0x1;
const FSOPT_PACK_INVAL_ATTRS: u64 = 0x8;
const ATTR_BIT_MAP_COUNT: u16 = 5;
const ATTR_CMN_NAME: u32 = 0x0000_0001;
const ATTR_CMN_DEVID: u32 = 0x0000_0002;
const ATTR_CMN_OBJTYPE: u32 = 0x0000_0008;
const ATTR_CMN_FLAGS: u32 = 0x0004_0000;
const ATTR_CMN_FILEID: u32 = 0x0200_0000;
const ATTR_CMN_ERROR: u32 = 0x2000_0000;
const ATTR_CMN_RETURNED_ATTRS: u32 = 0x8000_0000;
const ATTR_FILE_ALLOCSIZE: u32 = 0x0000_0004;

const VREG: u32 = 1;
const VDIR: u32 = 2;
const VLNK: u32 = 5;

const O_RDONLY: i32 = 0;
const O_NOFOLLOW: i32 = 0x0100;
const O_DIRECTORY: i32 = 0x0010_0000;
const O_CLOEXEC: i32 = 0x0100_0000;
const AT_SYMLINK_NOFOLLOW: i32 = 0x0020;

const DEFAULT_BUF: usize = 256 * 1024;
const MAX_BUF: usize = 8 * 1024 * 1024;

const S_IFMT: u16 = 0o170000;
const S_IFREG: u16 = 0o100000;
const S_IFDIR: u16 = 0o040000;
const S_IFLNK: u16 = 0o120000;

thread_local! {
    static ATTR_BUF: RefCell<Vec<u64>> = RefCell::new(Vec::new());
}

#[repr(C)]
struct AttrList {
    bitmapcount: u16,
    reserved: u16,
    commonattr: u32,
    volattr: u32,
    dirattr: u32,
    fileattr: u32,
    forkattr: u32,
}

#[repr(C)]
struct DirEnt {
    d_ino: u64,
    d_seekoff: u64,
    d_reclen: u16,
    d_namlen: u16,
    d_type: u8,
    d_name: [u8; 1024],
}

extern "C" {
    fn open(path: *const i8, flags: i32, ...) -> i32;
    fn openat(dirfd: i32, path: *const i8, flags: i32, ...) -> i32;
    fn close(fd: i32) -> i32;
    fn dup(fd: i32) -> i32;
    fn getattrlistbulk(
        dirfd: i32,
        alist: *mut AttrList,
        buf: *mut u8,
        size: usize,
        options: u64,
    ) -> i32;
    fn fdopendir(fd: i32) -> *mut std::ffi::c_void;
    fn readdir(dir: *mut std::ffi::c_void) -> *mut DirEnt;
    fn closedir(dir: *mut std::ffi::c_void) -> i32;
    fn fstatat(dirfd: i32, path: *const i8, buf: *mut u8, flags: i32) -> i32;
    fn __error() -> *mut i32;
}

struct OwnedFd(i32);

impl Drop for OwnedFd {
    fn drop(&mut self) {
        unsafe { close(self.0) };
    }
}

#[cfg(test)]
pub fn read_directory(path: &Path) -> io::Result<DirBatch> {
    read_directory_buffered(path, DEFAULT_BUF)
}

#[cfg(test)]
pub fn read_directory_buffered(path: &Path, buf_size: usize) -> io::Result<DirBatch> {
    let fd = open_path(path)?;
    let fd = OwnedFd(fd);
    read_fd(fd.0, buf_size)
}

/// Open `path` itself. Callers that descend use [`open_child`] so later
/// directories do not walk every parent component again.
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
/// Real directories use `O_NOFOLLOW` so the fd is this entry, not a link target.
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

pub fn read_open_fd(fd: i32) -> io::Result<DirBatch> {
    read_fd(fd, DEFAULT_BUF)
}

pub fn read_fd(fd: i32, buf_size: usize) -> io::Result<DirBatch> {
    match read_bulk(fd, buf_size.max(64)) {
        Ok(batch) => Ok(batch),
        Err(err) if is_unsupported(&err) => read_fstatat_fd(fd),
        Err(err) => Err(err),
    }
}

fn read_bulk(fd: i32, buf_size: usize) -> io::Result<DirBatch> {
    let mut list = AttrList {
        bitmapcount: ATTR_BIT_MAP_COUNT,
        reserved: 0,
        commonattr: ATTR_CMN_RETURNED_ATTRS
            | ATTR_CMN_NAME
            | ATTR_CMN_DEVID
            | ATTR_CMN_OBJTYPE
            | ATTR_CMN_FLAGS
            | ATTR_CMN_FILEID
            | ATTR_CMN_ERROR,
        volattr: 0,
        dirattr: 0,
        fileattr: ATTR_FILE_ALLOCSIZE,
        forkattr: 0,
    };

    ATTR_BUF.with(|cell| {
        let mut words = cell.borrow_mut();
        let mut size = buf_size;
        let mut batch = DirBatch::new();
        loop {
            let word_len = size.div_ceil(8);
            if words.len() < word_len {
                words.resize(word_len, 0);
            }
            let n = unsafe {
                getattrlistbulk(
                    fd,
                    &mut list,
                    words.as_mut_ptr() as *mut u8,
                    size,
                    FSOPT_NOFOLLOW | FSOPT_PACK_INVAL_ATTRS,
                )
            };
            if n == 0 {
                return Ok(batch);
            }
            if n < 0 {
                let err = io::Error::last_os_error();
                match err.raw_os_error() {
                    Some(4) => continue, // EINTR
                    Some(34) if size < MAX_BUF => {
                        // ERANGE: the buffer cannot hold one entry. The directory
                        // offset does not advance, so growing and retrying is safe.
                        size = (size.saturating_mul(2)).min(MAX_BUF);
                        continue;
                    }
                    _ => return Err(err),
                }
            }
            let bytes = unsafe { std::slice::from_raw_parts(words.as_ptr() as *const u8, size) };
            parse_records(bytes, n, &mut batch)?;
        }
    })
}

#[cfg(test)]
pub fn read_directory_fstatat(path: &Path) -> io::Result<DirBatch> {
    let fd = open_path(path)?;
    let fd = OwnedFd(fd);
    read_fstatat_fd(fd.0)
}

/// List via `fstatat` without consuming `fd`, so a bulk-attr fallback can
/// still `openat` children from the same directory.
fn read_fstatat_fd(fd: i32) -> io::Result<DirBatch> {
    let dir_fd = unsafe { dup(fd) };
    if dir_fd < 0 {
        return Err(io::Error::last_os_error());
    }
    let stat_fd = unsafe { dup(fd) };
    if stat_fd < 0 {
        let err = io::Error::last_os_error();
        unsafe { close(dir_fd) };
        return Err(err);
    }
    let stat_fd = OwnedFd(stat_fd);
    // `fdopendir` takes ownership of `dir_fd`. `stat_fd` stays usable for `fstatat`.
    let dir = unsafe { fdopendir(dir_fd) };
    if dir.is_null() {
        let err = io::Error::last_os_error();
        unsafe { close(dir_fd) };
        return Err(err);
    }

    let mut batch = DirBatch::new();
    loop {
        unsafe { *__error() = 0 };
        let ent = unsafe { readdir(dir) };
        if ent.is_null() {
            let err = unsafe { *__error() };
            unsafe { closedir(dir) };
            if err == 0 {
                return Ok(batch);
            }
            return Err(io::Error::from_raw_os_error(err));
        }
        let ent = unsafe { &*ent };
        let len = ent.d_namlen as usize;
        if len == 0 || len > ent.d_name.len() {
            continue;
        }
        let name = &ent.d_name[..len];
        if name == b"." || name == b".." {
            continue;
        }
        let Ok(c_name) = std::ffi::CString::new(name) else {
            continue;
        };
        let mut raw = [0u8; 144];
        let rc = unsafe {
            fstatat(
                stat_fd.0,
                c_name.as_ptr(),
                raw.as_mut_ptr(),
                AT_SYMLINK_NOFOLLOW,
            )
        };
        if rc != 0 {
            continue;
        }
        push_stat(&mut batch, name, &raw);
    }
}

fn is_unsupported(err: &io::Error) -> bool {
    // ENOTSUP, EOPNOTSUPP, ENOTTY: some volumes have no bulk getattr.
    matches!(err.raw_os_error(), Some(45 | 102 | 25))
}

fn parse_records(buf: &[u8], count: i32, batch: &mut DirBatch) -> io::Result<()> {
    let mut off = 0usize;
    for _ in 0..count {
        if off + 4 > buf.len() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "getattrlistbulk record truncated",
            ));
        }
        let len = read_u32(buf, off)? as usize;
        if len < 4 || off + len > buf.len() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "getattrlistbulk record length",
            ));
        }
        parse_one(&buf[off..off + len], batch)?;
        off += len;
    }
    Ok(())
}

fn parse_one(rec: &[u8], batch: &mut DirBatch) -> io::Result<()> {
    if rec.len() < 24 {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "getattrlistbulk record header",
        ));
    }
    let common = read_u32(rec, 4)?;
    let file = read_u32(rec, 16)?;
    // `ATTR_CMN_ERROR`, when returned, sits immediately after the attribute
    // set rather than in bit order. The remaining common attributes follow
    // their bit order.
    let mut cursor = 24usize;
    let mut name_at: Option<(usize, usize)> = None;
    let mut dev = 0u64;
    let mut objtype = 0u32;
    let mut file_id: Option<u64> = None;
    let mut entry_errno = 0u32;
    let mut alloc: Option<u64> = None;

    if common & ATTR_CMN_ERROR != 0 {
        entry_errno = read_u32(rec, cursor)?;
        cursor += 4;
    }
    if common & ATTR_CMN_NAME != 0 {
        let rel = read_i32(rec, cursor)?;
        let nlen = read_u32(rec, cursor + 4)? as usize;
        let pos = cursor as isize + rel as isize;
        if pos >= 0 {
            name_at = Some((pos as usize, nlen));
        }
        cursor += 8;
    }
    if common & ATTR_CMN_DEVID != 0 {
        dev = u64::from(read_u32(rec, cursor)?);
        cursor += 4;
    }
    if common & ATTR_CMN_OBJTYPE != 0 {
        objtype = read_u32(rec, cursor)?;
        cursor += 4;
    }
    if common & ATTR_CMN_FLAGS != 0 {
        // Flags are fetched so the cursor stays aligned with the kernel record.
        // Allocated size already reflects compression, so flags do not change
        // what the walker charges.
        let _flags = read_u32(rec, cursor)?;
        cursor += 4;
    }
    if common & ATTR_CMN_FILEID != 0 {
        let id = read_u64(rec, cursor)?;
        if id != u64::MAX {
            file_id = Some(id);
        }
        cursor += 8;
    }
    if file & ATTR_FILE_ALLOCSIZE != 0 {
        let size = read_u64(rec, cursor)?;
        if size != u64::MAX {
            alloc = Some(size);
        }
        cursor += 8;
    }
    if cursor > rec.len() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "getattrlistbulk attribute overrun",
        ));
    }
    if entry_errno != 0 {
        return Ok(());
    }
    let Some((pos, nlen)) = name_at else {
        return Ok(());
    };
    if nlen == 0 || pos >= rec.len() {
        return Ok(());
    }
    let end = pos + nlen.min(rec.len() - pos);
    let raw = &rec[pos..end];
    let name = match raw.iter().position(|byte| *byte == 0) {
        Some(0) => return Ok(()),
        Some(index) => &raw[..index],
        None => raw,
    };
    if name.is_empty() {
        return Ok(());
    }

    let kind = match objtype {
        VREG => EntryKind::File,
        VDIR => EntryKind::Directory,
        VLNK => EntryKind::Symlink,
        _ => EntryKind::Other,
    };
    let size_on_disk = match kind {
        EntryKind::File | EntryKind::Symlink => alloc.unwrap_or(0),
        EntryKind::Directory | EntryKind::Other => 0,
    };
    let id = file_id.map(|ino| FileId { dev, ino });
    batch.push(name, kind, size_on_disk, id, None);
    Ok(())
}

fn push_stat(batch: &mut DirBatch, name: &[u8], raw: &[u8; 144]) {
    let dev = u64::from(u32::from_ne_bytes(raw[0..4].try_into().unwrap()));
    let mode = u16::from_ne_bytes(raw[4..6].try_into().unwrap());
    let ino = u64::from_ne_bytes(raw[8..16].try_into().unwrap());
    let blocks = i64::from_ne_bytes(raw[104..112].try_into().unwrap());
    let kind = match mode & S_IFMT {
        S_IFREG => EntryKind::File,
        S_IFDIR => EntryKind::Directory,
        S_IFLNK => EntryKind::Symlink,
        _ => EntryKind::Other,
    };
    let size_on_disk = match kind {
        EntryKind::File | EntryKind::Symlink if blocks > 0 => (blocks as u64).saturating_mul(512),
        _ => 0,
    };
    batch.push(name, kind, size_on_disk, Some(FileId { dev, ino }), None);
}

fn read_u32(buf: &[u8], off: usize) -> io::Result<u32> {
    let bytes = buf
        .get(off..off + 4)
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidData, "getattrlistbulk short read"))?;
    let mut raw = [0u8; 4];
    raw.copy_from_slice(bytes);
    Ok(u32::from_ne_bytes(raw))
}

fn read_i32(buf: &[u8], off: usize) -> io::Result<i32> {
    Ok(read_u32(buf, off)? as i32)
}

fn read_u64(buf: &[u8], off: usize) -> io::Result<u64> {
    let bytes = buf
        .get(off..off + 8)
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidData, "getattrlistbulk short read"))?;
    let mut raw = [0u8; 8];
    raw.copy_from_slice(bytes);
    Ok(u64::from_ne_bytes(raw))
}
