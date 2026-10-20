//! Directory entry records.
//!
//! The walker asks for one bulk listing per directory. Platform modules turn
//! that listing into [`DirBatch`]. Symlink targets are resolved separately,
//! and only for names that are actually links.

use std::fs;
#[cfg(not(windows))]
use std::fs::Metadata;
use std::io;
use std::path::{Path, PathBuf};

#[cfg(not(any(target_os = "macos", target_os = "linux", windows)))]
mod fallback;
#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(windows)]
mod windows;

/// `st_dev` + `st_ino` on Unix, volume serial + file index on Windows.
#[derive(Clone, Copy, PartialEq, Eq, Hash, Debug)]
pub struct FileId {
    pub dev: u64,
    pub ino: u64,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum EntryKind {
    File,
    Directory,
    /// Symlink, or a Windows name-surrogate reparse point (junction).
    Symlink,
    Other,
}

/// What a symlink or junction points at, after one follow.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum FollowKind {
    File,
    Dir,
    Other,
}

#[derive(Clone, Debug)]
pub struct EntryStat {
    pub kind: EntryKind,
    /// Allocated size for a file or for the link itself. Directories stay 0;
    /// the walker sums children instead of charging the directory inode.
    pub size_on_disk: u64,
    /// Identity of this entry, not of a symlink target.
    /// `None` when the platform cannot provide it without opening every file.
    pub id: Option<FileId>,
    /// Windows directory entries know whether a reparse point is a directory
    /// without following it. Unix listings leave this `None`.
    pub link_is_dir: Option<bool>,
}

#[derive(Clone, Debug)]
pub struct Followed {
    pub kind: FollowKind,
    pub id: Option<FileId>,
    /// Populated when `canonicalize` succeeded. Used as a cycle key only if
    /// the platform could not produce [`FileId`].
    pub canonical: Option<PathBuf>,
}

#[derive(Clone, Debug)]
pub enum LinkResolve {
    /// Dangling link. The walker omits it.
    Broken,
    /// Target is outside the canonical scan root. Counted as a zero leaf.
    Outside,
    Inside(Followed),
}

#[derive(Clone, Debug)]
pub struct RawEntry {
    name_off: u32,
    name_len: u32,
    pub kind: EntryKind,
    pub size_on_disk: u64,
    pub id: Option<FileId>,
    pub link_is_dir: Option<bool>,
}

/// Names for one directory, packed into a single buffer.
#[derive(Clone, Debug)]
pub struct DirBatch {
    names: Vec<u8>,
    entries: Vec<RawEntry>,
}

impl DirBatch {
    fn new() -> Self {
        Self {
            names: Vec::new(),
            entries: Vec::new(),
        }
    }

    pub fn len(&self) -> usize {
        self.entries.len()
    }

    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    pub fn entries(&self) -> &[RawEntry] {
        &self.entries
    }

    pub fn name_bytes(&self, entry: &RawEntry) -> &[u8] {
        let start = entry.name_off as usize;
        let end = start + entry.name_len as usize;
        &self.names[start..end]
    }

    #[cfg(test)]
    pub fn name_str(&self, entry: &RawEntry) -> std::borrow::Cow<'_, str> {
        String::from_utf8_lossy(self.name_bytes(entry))
    }

    fn push(
        &mut self,
        name: &[u8],
        kind: EntryKind,
        size_on_disk: u64,
        id: Option<FileId>,
        link_is_dir: Option<bool>,
    ) {
        let name_off = self.names.len() as u32;
        self.names.extend_from_slice(name);
        self.entries.push(RawEntry {
            name_off,
            name_len: name.len() as u32,
            kind,
            size_on_disk,
            id,
            link_is_dir,
        });
    }
}

/// An open directory. On macOS and Linux the walker uses this fd with
/// `openat` so child directories are not looked up from the filesystem root.
pub struct ListedDir {
    pub token: DirToken,
    pub batch: DirBatch,
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
pub struct DirToken {
    fd: i32,
}

#[cfg(not(any(target_os = "macos", target_os = "linux")))]
pub struct DirToken;

#[cfg(any(target_os = "macos", target_os = "linux"))]
impl Drop for DirToken {
    fn drop(&mut self) {
        unsafe { close_dir(self.fd) };
    }
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
extern "C" {
    fn close(fd: i32) -> i32;
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
unsafe fn close_dir(fd: i32) {
    unsafe { close(fd) };
}

pub fn list_path(path: &Path) -> io::Result<ListedDir> {
    #[cfg(target_os = "macos")]
    {
        let fd = macos::open_path(path)?;
        let batch = match macos::read_open_fd(fd) {
            Ok(batch) => batch,
            Err(err) => {
                unsafe { close_dir(fd) };
                return Err(err);
            }
        };
        return Ok(ListedDir {
            token: DirToken { fd },
            batch,
        });
    }
    #[cfg(target_os = "linux")]
    {
        let fd = linux::open_path(path)?;
        let batch = match linux::read_fd(fd) {
            Ok(Some(batch)) => batch,
            Ok(None) => match read_directory_std(path) {
                Ok(batch) => batch,
                Err(err) => {
                    unsafe { close_dir(fd) };
                    return Err(err);
                }
            },
            Err(err) => {
                unsafe { close_dir(fd) };
                return Err(err);
            }
        };
        return Ok(ListedDir {
            token: DirToken { fd },
            batch,
        });
    }
    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    {
        Ok(ListedDir {
            token: DirToken,
            batch: read_directory(path)?,
        })
    }
}

pub fn list_child(
    parent: &DirToken,
    path: &Path,
    name: &[u8],
    follow: bool,
) -> io::Result<ListedDir> {
    #[cfg(target_os = "macos")]
    {
        let fd = match macos::open_child(parent.fd, name, follow) {
            Ok(fd) => fd,
            Err(_) => macos::open_path(path)?,
        };
        let batch = match macos::read_open_fd(fd) {
            Ok(batch) => batch,
            Err(err) => {
                unsafe { close_dir(fd) };
                return Err(err);
            }
        };
        return Ok(ListedDir {
            token: DirToken { fd },
            batch,
        });
    }
    #[cfg(target_os = "linux")]
    {
        let fd = match linux::open_child(parent.fd, name, follow) {
            Ok(fd) => fd,
            Err(_) => linux::open_path(path)?,
        };
        let batch = match linux::read_fd(fd) {
            Ok(Some(batch)) => batch,
            Ok(None) => match read_directory_std(path) {
                Ok(batch) => batch,
                Err(err) => {
                    unsafe { close_dir(fd) };
                    return Err(err);
                }
            },
            Err(err) => {
                unsafe { close_dir(fd) };
                return Err(err);
            }
        };
        return Ok(ListedDir {
            token: DirToken { fd },
            batch,
        });
    }
    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    {
        let _ = (parent, name, follow);
        list_path(path)
    }
}

#[cfg(any(test, not(any(target_os = "macos", target_os = "linux"))))]
pub fn read_directory(path: &Path) -> io::Result<DirBatch> {
    #[cfg(target_os = "macos")]
    {
        macos::read_directory(path)
    }
    #[cfg(target_os = "linux")]
    {
        linux::read_directory(path)
    }
    #[cfg(windows)]
    {
        windows::read_directory(path)
    }
    #[cfg(not(any(target_os = "macos", target_os = "linux", windows)))]
    {
        fallback::read_directory(path)
    }
}

#[cfg(all(test, target_os = "macos"))]
pub fn read_directory_buffered(path: &Path, buf_size: usize) -> io::Result<DirBatch> {
    macos::read_directory_buffered(path, buf_size)
}

#[cfg(all(test, target_os = "macos"))]
pub fn read_directory_fstatat(path: &Path) -> io::Result<DirBatch> {
    macos::read_directory_fstatat(path)
}

pub fn stat_path(path: &Path) -> io::Result<EntryStat> {
    #[cfg(windows)]
    {
        windows::stat_path(path)
    }
    #[cfg(not(windows))]
    {
        from_std_meta(&fs::symlink_metadata(path)?)
    }
}

pub fn resolve_link(path: &Path, root: Option<&Path>, link_is_dir: Option<bool>) -> LinkResolve {
    #[cfg(windows)]
    {
        windows::resolve_link(path, root, link_is_dir)
    }
    #[cfg(not(windows))]
    {
        let _ = link_is_dir;
        resolve_link_std(path, root)
    }
}

/// Identity of a directory inode. Unix listings already carry it.
/// Windows opens one handle so junctions can be tied to a directory already walked.
pub fn directory_id(path: &Path) -> Option<FileId> {
    #[cfg(windows)]
    {
        windows::directory_id(path)
    }
    #[cfg(not(windows))]
    {
        let _ = path;
        None
    }
}

pub fn canonicalize(path: &Path) -> Option<PathBuf> {
    fs::canonicalize(path).ok()
}

pub fn push_component(path: &mut PathBuf, name: &[u8]) {
    #[cfg(unix)]
    {
        use std::os::unix::ffi::OsStrExt;
        path.push(std::ffi::OsStr::from_bytes(name));
    }
    #[cfg(not(unix))]
    {
        path.push(String::from_utf8_lossy(name).as_ref());
    }
}

pub fn joined(parent: &Path, name: &[u8]) -> PathBuf {
    let mut path = parent.to_path_buf();
    push_component(&mut path, name);
    path
}

#[cfg(unix)]
pub(crate) fn cstring_path(path: &Path) -> io::Result<std::ffi::CString> {
    use std::os::unix::ffi::OsStrExt;
    std::ffi::CString::new(path.as_os_str().as_bytes())
        .map_err(|_| io::Error::new(io::ErrorKind::InvalidInput, "path contains an interior NUL"))
}

#[cfg(not(windows))]
fn resolve_link_std(path: &Path, root: Option<&Path>) -> LinkResolve {
    let followed = match fs::metadata(path) {
        Ok(meta) => meta,
        Err(_) => return LinkResolve::Broken,
    };
    let canonical = fs::canonicalize(path).ok();
    if let (Some(root), Some(canon)) = (root, canonical.as_ref()) {
        if !canon.starts_with(root) {
            return LinkResolve::Outside;
        }
    }
    let kind = if followed.is_dir() {
        FollowKind::Dir
    } else if followed.is_file() {
        FollowKind::File
    } else {
        FollowKind::Other
    };
    LinkResolve::Inside(Followed {
        kind,
        id: file_id_of(&followed),
        canonical,
    })
}

#[cfg(unix)]
fn file_id_of(meta: &Metadata) -> Option<FileId> {
    use std::os::unix::fs::MetadataExt;
    Some(FileId {
        dev: meta.dev(),
        ino: meta.ino(),
    })
}

#[cfg(not(any(unix, windows)))]
fn file_id_of(_meta: &Metadata) -> Option<FileId> {
    None
}

#[cfg(not(windows))]
fn from_std_meta(meta: &Metadata) -> io::Result<EntryStat> {
    let ft = meta.file_type();
    let kind = if ft.is_symlink() {
        EntryKind::Symlink
    } else if ft.is_dir() {
        EntryKind::Directory
    } else if ft.is_file() {
        EntryKind::File
    } else {
        EntryKind::Other
    };
    let size_on_disk = match kind {
        EntryKind::File | EntryKind::Symlink => allocated_len(meta),
        EntryKind::Directory | EntryKind::Other => 0,
    };
    Ok(EntryStat {
        kind,
        size_on_disk,
        id: file_id_of(meta),
        link_is_dir: None,
    })
}

#[cfg(unix)]
fn allocated_len(meta: &Metadata) -> u64 {
    use std::os::unix::fs::MetadataExt;
    meta.blocks().saturating_mul(512)
}

#[cfg(not(any(unix, windows)))]
fn allocated_len(meta: &Metadata) -> u64 {
    meta.len()
}

#[cfg(not(any(target_os = "macos", windows)))]
pub(crate) fn read_directory_std(path: &Path) -> io::Result<DirBatch> {
    let mut batch = DirBatch::new();
    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let meta = entry.metadata()?;
        let stat = from_std_meta(&meta)?;
        let name = entry.file_name();
        #[cfg(unix)]
        let bytes = {
            use std::os::unix::ffi::OsStrExt;
            name.as_bytes().to_vec()
        };
        #[cfg(not(unix))]
        let bytes = name.to_string_lossy().into_owned().into_bytes();
        batch.push(
            &bytes,
            stat.kind,
            stat.size_on_disk,
            stat.id,
            stat.link_is_dir,
        );
    }
    Ok(batch)
}
