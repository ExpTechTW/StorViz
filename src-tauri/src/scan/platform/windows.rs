//! Windows directory reads via `FindFirstFileExW`.
//!
//! `FindExInfoBasic` plus `FIND_FIRST_EX_LARGE_FETCH` asks the kernel for a
//! large directory buffer and skips the short 8.3 name. File size comes from
//! that `WIN32_FIND_DATA`. `GetCompressedFileSizeW` runs only for compressed
//! or sparse files. File hard links are not deduplicated: opening every file
//! for a file index costs more than counting each name, which is what the
//! previous scanner did. Directory handles are opened only when the walker
//! needs a volume serial and file index to stop junction cycles.

use std::fs::{self, Metadata};
use std::io;
use std::os::windows::ffi::OsStrExt;
use std::os::windows::fs::{FileTypeExt, MetadataExt};
use std::path::Path;

use super::{DirBatch, EntryKind, EntryStat, FileId, FollowKind, Followed, LinkResolve};

const FILE_ATTRIBUTE_DEVICE: u32 = 0x0000_0040;
const FILE_ATTRIBUTE_DIRECTORY: u32 = 0x0000_0010;
const FILE_ATTRIBUTE_SPARSE_FILE: u32 = 0x0000_0200;
const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x0000_0400;
const FILE_ATTRIBUTE_COMPRESSED: u32 = 0x0000_0800;
const FILE_FLAG_OPEN_REPARSE_POINT: u32 = 0x0020_0000;
const FILE_FLAG_BACKUP_SEMANTICS: u32 = 0x0200_0000;
const FILE_SHARE_READ: u32 = 0x1;
const FILE_SHARE_WRITE: u32 = 0x2;
const FILE_SHARE_DELETE: u32 = 0x4;
const OPEN_EXISTING: u32 = 3;
const ERROR_NO_MORE_FILES: u32 = 18;
const FIND_EX_INFO_BASIC: i32 = 1;
const FIND_EX_SEARCH_NAME_MATCH: i32 = 0;
const FIND_FIRST_EX_LARGE_FETCH: u32 = 0x2;
const INVALID_HANDLE: isize = -1;

#[repr(C)]
#[allow(dead_code)]
struct FileTime {
    low: u32,
    high: u32,
}

#[repr(C)]
struct Win32FindDataW {
    file_attributes: u32,
    creation_time: FileTime,
    last_access_time: FileTime,
    last_write_time: FileTime,
    file_size_high: u32,
    file_size_low: u32,
    reserved0: u32,
    reserved1: u32,
    file_name: [u16; 260],
    alternate_file_name: [u16; 14],
}

/// Layout matches Win32 `BY_HANDLE_FILE_INFORMATION`. Fields we do not read are
/// still required so the struct size and offsets stay ABI-compatible.
#[repr(C)]
#[allow(dead_code)]
struct ByHandleFileInformation {
    file_attributes: u32,
    creation_time: FileTime,
    last_access_time: FileTime,
    last_write_time: FileTime,
    volume_serial: u32,
    file_size_high: u32,
    file_size_low: u32,
    number_of_links: u32,
    file_index_high: u32,
    file_index_low: u32,
}

struct OwnedHandle(*mut std::ffi::c_void);

impl Drop for OwnedHandle {
    fn drop(&mut self) {
        unsafe {
            CloseHandle(self.0);
        }
    }
}

struct FindHandle(*mut std::ffi::c_void);

impl Drop for FindHandle {
    fn drop(&mut self) {
        unsafe {
            FindClose(self.0);
        }
    }
}

#[link(name = "kernel32")]
extern "system" {
    fn CreateFileW(
        file_name: *const u16,
        desired_access: u32,
        share_mode: u32,
        security: *mut std::ffi::c_void,
        disposition: u32,
        flags: u32,
        template: *mut std::ffi::c_void,
    ) -> *mut std::ffi::c_void;
    fn CloseHandle(handle: *mut std::ffi::c_void) -> i32;
    fn GetFileInformationByHandle(
        handle: *mut std::ffi::c_void,
        info: *mut ByHandleFileInformation,
    ) -> i32;
    fn GetCompressedFileSizeW(file_name: *const u16, file_size_high: *mut u32) -> u32;
    fn GetLastError() -> u32;
    fn FindFirstFileExW(
        file_name: *const u16,
        info_level: i32,
        find_data: *mut Win32FindDataW,
        search_op: i32,
        search_filter: *mut std::ffi::c_void,
        additional_flags: u32,
    ) -> *mut std::ffi::c_void;
    fn FindNextFileW(find: *mut std::ffi::c_void, find_data: *mut Win32FindDataW) -> i32;
    fn FindClose(find: *mut std::ffi::c_void) -> i32;
}

pub fn read_directory(path: &Path) -> io::Result<DirBatch> {
    let wide = search_pattern(path);
    let mut data = unsafe { std::mem::zeroed::<Win32FindDataW>() };
    let handle = unsafe {
        FindFirstFileExW(
            wide.as_ptr(),
            FIND_EX_INFO_BASIC,
            &mut data,
            FIND_EX_SEARCH_NAME_MATCH,
            std::ptr::null_mut(),
            FIND_FIRST_EX_LARGE_FETCH,
        )
    };
    if handle.is_null() || handle as isize == INVALID_HANDLE {
        return Err(io::Error::last_os_error());
    }
    let handle = FindHandle(handle);
    let mut batch = DirBatch::new();
    loop {
        push_find_data(path, &data, &mut batch);
        let more = unsafe { FindNextFileW(handle.0, &mut data) };
        if more == 0 {
            let err = unsafe { GetLastError() };
            if err == ERROR_NO_MORE_FILES {
                break;
            }
            return Err(io::Error::from_raw_os_error(err as i32));
        }
    }
    Ok(batch)
}

fn push_find_data(parent: &Path, data: &Win32FindDataW, batch: &mut DirBatch) {
    let wide_name = match c_wide(&data.file_name) {
        Some(name) if !is_dot(name) => name,
        _ => return,
    };
    let name = String::from_utf16_lossy(wide_name);
    let attrs = data.file_attributes;
    let reparse = attrs & FILE_ATTRIBUTE_REPARSE_POINT != 0;
    let directory = attrs & FILE_ATTRIBUTE_DIRECTORY != 0;
    let (kind, link_is_dir) = if reparse {
        (EntryKind::Symlink, Some(directory))
    } else if directory {
        (EntryKind::Directory, None)
    } else if attrs & FILE_ATTRIBUTE_DEVICE != 0 {
        (EntryKind::Other, None)
    } else {
        (EntryKind::File, None)
    };
    let mut size_on_disk = 0u64;
    if matches!(kind, EntryKind::File | EntryKind::Symlink) {
        size_on_disk = (u64::from(data.file_size_high) << 32) | u64::from(data.file_size_low);
        if kind == EntryKind::File
            && attrs & (FILE_ATTRIBUTE_COMPRESSED | FILE_ATTRIBUTE_SPARSE_FILE) != 0
        {
            let child = parent.join(&name);
            if let Some(size) = compressed_size(&child) {
                size_on_disk = size;
            }
        }
    }
    batch.push(name.as_bytes(), kind, size_on_disk, None, link_is_dir);
}

pub fn stat_path(path: &Path) -> io::Result<EntryStat> {
    let meta = fs::symlink_metadata(path)?;
    let mut stat = stat_from_meta(&meta);
    if stat.kind == EntryKind::Directory {
        stat.id = directory_id(path);
    } else if stat.kind == EntryKind::File && sparse_or_compressed(&meta) {
        if let Some(size) = compressed_size(path) {
            stat.size_on_disk = size;
        }
    }
    Ok(stat)
}

pub fn resolve_link(path: &Path, root: Option<&Path>, link_is_dir: Option<bool>) -> LinkResolve {
    if link_is_dir == Some(false) {
        return resolve_file_link(path, root);
    }

    let canonical = match fs::canonicalize(path) {
        Ok(canon) => canon,
        Err(_) => return LinkResolve::Broken,
    };
    if let Some(root) = root {
        if !canonical.starts_with(root) {
            return LinkResolve::Outside;
        }
    }

    let id = followed_id(path);
    let kind = if link_is_dir == Some(true) || canonical.is_dir() {
        FollowKind::Dir
    } else if canonical.is_file() {
        FollowKind::File
    } else {
        FollowKind::Other
    };
    LinkResolve::Inside(Followed {
        kind,
        id,
        canonical: Some(canonical),
    })
}

pub fn directory_id(path: &Path) -> Option<FileId> {
    let handle = open_meta(path, false).ok()?;
    let info = handle_info(&handle).ok()?;
    Some(id_from(&info))
}

fn resolve_file_link(path: &Path, root: Option<&Path>) -> LinkResolve {
    let canonical = match fs::canonicalize(path) {
        Ok(canon) => canon,
        Err(_) => return LinkResolve::Broken,
    };
    if let Some(root) = root {
        if !canonical.starts_with(root) {
            return LinkResolve::Outside;
        }
    }
    LinkResolve::Inside(Followed {
        kind: FollowKind::File,
        id: None,
        canonical: Some(canonical),
    })
}

fn stat_from_meta(meta: &Metadata) -> EntryStat {
    let ft = meta.file_type();
    let (kind, link_is_dir) = if ft.is_symlink() {
        (EntryKind::Symlink, Some(ft.is_symlink_dir()))
    } else if ft.is_dir() {
        (EntryKind::Directory, None)
    } else if ft.is_file() {
        (EntryKind::File, None)
    } else {
        (EntryKind::Other, None)
    };
    let size_on_disk = match kind {
        EntryKind::File | EntryKind::Symlink => meta.len(),
        EntryKind::Directory | EntryKind::Other => 0,
    };
    EntryStat {
        kind,
        size_on_disk,
        id: None,
        link_is_dir,
    }
}

fn sparse_or_compressed(meta: &Metadata) -> bool {
    let attrs = meta.file_attributes();
    attrs & (FILE_ATTRIBUTE_COMPRESSED | FILE_ATTRIBUTE_SPARSE_FILE) != 0
}

fn followed_id(path: &Path) -> Option<FileId> {
    let handle = open_meta(path, true).ok()?;
    let info = handle_info(&handle).ok()?;
    Some(id_from(&info))
}

fn id_from(info: &ByHandleFileInformation) -> FileId {
    FileId {
        dev: u64::from(info.volume_serial),
        ino: (u64::from(info.file_index_high) << 32) | u64::from(info.file_index_low),
    }
}

fn compressed_size(path: &Path) -> Option<u64> {
    let wide = wide_path(path);
    let mut high = 0u32;
    let low = unsafe { GetCompressedFileSizeW(wide.as_ptr(), &mut high) };
    if low == u32::MAX {
        let err = unsafe { GetLastError() };
        if err != 0 {
            return None;
        }
    }
    Some((u64::from(high) << 32) | u64::from(low))
}

fn open_meta(path: &Path, follow: bool) -> io::Result<OwnedHandle> {
    let wide = wide_path(path);
    let mut flags = FILE_FLAG_BACKUP_SEMANTICS;
    if !follow {
        flags |= FILE_FLAG_OPEN_REPARSE_POINT;
    }
    let handle = unsafe {
        CreateFileW(
            wide.as_ptr(),
            0,
            FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
            std::ptr::null_mut(),
            OPEN_EXISTING,
            flags,
            std::ptr::null_mut(),
        )
    };
    if handle.is_null() || handle as isize == INVALID_HANDLE {
        Err(io::Error::last_os_error())
    } else {
        Ok(OwnedHandle(handle))
    }
}

fn handle_info(handle: &OwnedHandle) -> io::Result<ByHandleFileInformation> {
    let mut info = unsafe { std::mem::zeroed() };
    let ok = unsafe { GetFileInformationByHandle(handle.0, &mut info) };
    if ok == 0 {
        Err(io::Error::last_os_error())
    } else {
        Ok(info)
    }
}

fn wide_path(path: &Path) -> Vec<u16> {
    path.as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect()
}

fn search_pattern(path: &Path) -> Vec<u16> {
    let mut wide: Vec<u16> = path.as_os_str().encode_wide().collect();
    let slash = b'\\' as u16;
    let slash_alt = b'/' as u16;
    if !wide.ends_with(&[slash]) && !wide.ends_with(&[slash_alt]) {
        wide.push(slash);
    }
    wide.push(b'*' as u16);
    wide.push(0);
    wide
}

fn c_wide(buf: &[u16]) -> Option<&[u16]> {
    let end = buf.iter().position(|unit| *unit == 0)?;
    Some(&buf[..end])
}

fn is_dot(name: &[u16]) -> bool {
    name == [u16::from(b'.')] || name == [u16::from(b'.'), u16::from(b'.')]
}
