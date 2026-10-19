//! Directory walk shared by the scan command and deletion size reporting.
//!
//! The scan root is canonicalized once. Each directory is listed with the
//! platform bulk API (getattrlistbulk, getdents64+statx, or FindFirstFileExW).
//! macOS and Linux then open child directories with `openat` on that fd.
//! Symlinks are the only names that get a second lookup, and only to decide
//! whether the target is inside the root.
//!
//! The resulting tree is an arena: one node `Vec`, one name string, and a side
//! table of child indexes. The webview receives that arena as parallel arrays
//! (`n`, `s`, `m`, `k`, `r`) instead of one JSON object per file.

mod disk;
mod platform;
mod tree;

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::thread;

use platform::{EntryKind, EntryStat, FileId, FollowKind, LinkResolve, RawEntry};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;
use tree::{PackedForest, Tree};

const BATCH_SIZE: usize = 10000;
const PATH_UPDATE_INTERVAL: usize = 10;
/// Parallel subdirectory walks pay off once a directory is wide enough to hide
/// rayon overhead. Metadata is already bulk-fetched, so only directory walks
/// are spawned — not one task per file.
const PARALLEL_MIN_ENTRIES: usize = 64;

static CURRENT_SCAN_STATE: OnceLock<Mutex<Option<ScanState>>> = OnceLock::new();

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNode {
    pub name: String,
    pub size: u64,
    pub path: String,
    pub children: Option<Vec<FileNode>>,
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
}

#[derive(Clone, Serialize)]
pub struct PartialScanResult {
    nodes: Vec<FileNode>,
    /// Packed subtrees. Each element is a flat forest, not one object per node.
    compact_nodes: Vec<PackedForest>,
    total_scanned: u64,
    total_size: u64,
    is_complete: bool,
    root_node: Option<FileNode>,
    compact_root: Option<FileNode>,
    disk_info: Option<DiskInfo>,
    current_path: Option<String>,
}

#[derive(Clone, Serialize)]
pub struct DiskInfo {
    total_space: u64,
    available_space: u64,
    used_space: u64,
}

struct VisitSet {
    ids: Mutex<HashSet<FileId>>,
    paths: Mutex<HashSet<PathBuf>>,
}

impl VisitSet {
    fn new() -> Self {
        Self {
            ids: Mutex::new(HashSet::new()),
            paths: Mutex::new(HashSet::new()),
        }
    }

    fn claim_id(&self, id: FileId) -> bool {
        self.ids
            .lock()
            .unwrap_or_else(|err| err.into_inner())
            .insert(id)
    }

    fn claim_path(&self, path: &Path) -> bool {
        self.paths
            .lock()
            .unwrap_or_else(|err| err.into_inner())
            .insert(path.to_path_buf())
    }
}

#[derive(Clone)]
struct ScanState {
    counter: Arc<AtomicU64>,
    scanned_size: Arc<AtomicU64>,
    visits: Arc<VisitSet>,
    packed: Arc<Mutex<PackedForest>>,
    cancelled: Arc<AtomicBool>,
    current_path: Arc<Mutex<String>>,
    path_tick: Arc<AtomicUsize>,
}

impl ScanState {
    fn new() -> Self {
        Self {
            counter: Arc::new(AtomicU64::new(0)),
            scanned_size: Arc::new(AtomicU64::new(0)),
            visits: Arc::new(VisitSet::new()),
            packed: Arc::new(Mutex::new(PackedForest::new())),
            cancelled: Arc::new(AtomicBool::new(false)),
            current_path: Arc::new(Mutex::new(String::new())),
            path_tick: Arc::new(AtomicUsize::new(0)),
        }
    }

    fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::Relaxed)
    }

    fn cancel(&self) {
        self.cancelled.store(true, Ordering::Relaxed)
    }

    fn increment(&self) {
        self.counter.fetch_add(1, Ordering::Relaxed);
    }

    fn add_size(&self, size: u64) {
        self.scanned_size.fetch_add(size, Ordering::Relaxed);
    }

    fn stats(&self) -> (u64, u64) {
        (
            self.counter.load(Ordering::Relaxed),
            self.scanned_size.load(Ordering::Relaxed),
        )
    }

    fn set_current_path(&self, path: &str) {
        *self
            .current_path
            .lock()
            .unwrap_or_else(|err| err.into_inner()) = path.to_string();
    }

    fn current_path(&self) -> String {
        self.current_path
            .lock()
            .unwrap_or_else(|err| err.into_inner())
            .clone()
    }

    fn tick_path(&self) -> bool {
        let n = self.path_tick.fetch_add(1, Ordering::Relaxed);
        (n + 1) % PATH_UPDATE_INTERVAL == 0
    }

    fn push_subtree(&self, tree: &Tree, id: u32) -> Option<PackedForest> {
        let mut pack = self.packed.lock().unwrap_or_else(|err| err.into_inner());
        tree.append_packed(id, &mut pack);
        if pack.root_count() >= BATCH_SIZE {
            Some(std::mem::take(&mut *pack))
        } else {
            None
        }
    }

    fn drain_packed(&self) -> PackedForest {
        std::mem::take(&mut *self.packed.lock().unwrap_or_else(|err| err.into_inner()))
    }
}

struct Walk<'a> {
    channel: Option<&'a Channel<PartialScanResult>>,
    state: &'a ScanState,
    canonical_root: Option<&'a Path>,
}

#[derive(Clone, Copy)]
enum Disposition {
    Skip,
    Zero,
    File(u64),
    Directory,
}

#[tauri::command]
pub async fn scan_directory_streaming(
    path: String,
    on_batch: Channel<PartialScanResult>,
) -> Result<(), String> {
    if !Path::new(&path).exists() {
        return Err("路徑不存在".to_string());
    }
    let disk_info = disk::info_if_root(&path);
    spawn_scan(path, on_batch, disk_info);
    Ok(())
}

#[tauri::command]
pub fn cancel_scan() -> Result<(), String> {
    let Some(slot) = CURRENT_SCAN_STATE.get() else {
        return Err("No active scan to cancel".to_string());
    };
    let guard = slot.lock().unwrap_or_else(|err| err.into_inner());
    if let Some(state) = guard.as_ref() {
        state.cancel();
        Ok(())
    } else {
        Err("No active scan to cancel".to_string())
    }
}

pub fn path_disk_usage(path: &Path) -> u64 {
    let state = ScanState::new();
    let canonical_root = platform::canonicalize(path);
    let ctx = Walk {
        channel: None,
        state: &state,
        canonical_root: canonical_root.as_deref(),
    };
    match scan_root(&ctx, path, false) {
        Ok(tree) => tree.size_of(tree.root),
        Err(_) => 0,
    }
}

fn spawn_scan(path: String, channel: Channel<PartialScanResult>, disk_info: Option<DiskInfo>) {
    thread::spawn(move || {
        let state = ScanState::new();
        register_scan(&state);
        let _clear = ClearScan {
            cancelled: Arc::clone(&state.cancelled),
        };
        let root = PathBuf::from(&path);
        if let Err(err) = walk(&root, Some(&channel), &state, disk_info) {
            eprintln!("Scan failed: {err}");
        }
    });
}

fn register_scan(state: &ScanState) {
    let slot = CURRENT_SCAN_STATE.get_or_init(|| Mutex::new(None));
    *slot.lock().unwrap_or_else(|err| err.into_inner()) = Some(state.clone());
}

struct ClearScan {
    cancelled: Arc<AtomicBool>,
}

impl Drop for ClearScan {
    fn drop(&mut self) {
        let Some(slot) = CURRENT_SCAN_STATE.get() else {
            return;
        };
        let mut guard = slot.lock().unwrap_or_else(|err| err.into_inner());
        let still_ours = guard
            .as_ref()
            .is_some_and(|state| Arc::ptr_eq(&state.cancelled, &self.cancelled));
        if still_ours {
            *guard = None;
        }
    }
}

fn walk(
    path: &Path,
    channel: Option<&Channel<PartialScanResult>>,
    state: &ScanState,
    disk_info: Option<DiskInfo>,
) -> Result<FileNode, String> {
    if let Some(channel) = channel {
        if let Some(info) = disk_info.clone() {
            let _ = channel.send(event(
                Vec::new(),
                state,
                false,
                None,
                Some(info),
                Some(path.to_string_lossy().into_owned()),
            ));
        }
    }

    let canonical_root = platform::canonicalize(path);
    let ctx = Walk {
        channel,
        state,
        canonical_root: canonical_root.as_deref(),
    };
    let tree = scan_root(&ctx, path, channel.is_some())?;
    let node = if channel.is_some() {
        shell_node(&tree, path)
    } else {
        materialize(&tree, tree.root, path)
    };
    if let Some(channel) = channel {
        finish(channel, state, &node, disk_info);
    }
    Ok(node)
}

fn scan_root(ctx: &Walk<'_>, path: &Path, pack_children: bool) -> Result<Tree, String> {
    if ctx.state.is_cancelled() {
        return Err("Scan cancelled".to_string());
    }
    let stat = platform::stat_path(path).map_err(|err| err.to_string())?;
    let name = entry_name(path);
    let mut tree = Tree::new();
    let root = match disposition(path, &stat, ctx.canonical_root, &ctx.state.visits) {
        Disposition::Skip => return Err("無法掃描此路徑".to_string()),
        Disposition::Zero => tree.add_leaf(name.as_bytes(), 0),
        Disposition::File(size) => {
            ctx.state.increment();
            ctx.state.add_size(size);
            tree.add_leaf(name.as_bytes(), size)
        }
        Disposition::Directory => {
            ctx.state.increment();
            let kids = if ctx.state.is_cancelled() {
                Vec::new()
            } else {
                match platform::list_path(path) {
                    Ok(listed) => build_children(ctx, &mut tree, path, listed, pack_children),
                    Err(_) => Vec::new(),
                }
            };
            let size = tree.sum(&kids);
            tree.add_dir(name.as_bytes(), size, &kids)
        }
    };
    tree.root = root;
    Ok(tree)
}

fn build_children(
    ctx: &Walk<'_>,
    tree: &mut Tree,
    dir: &Path,
    listed: platform::ListedDir,
    pack_root_children: bool,
) -> Vec<u32> {
    if ctx.state.is_cancelled() || listed.batch.is_empty() {
        return Vec::new();
    }
    let plans = plan_entries(ctx, dir, &listed.batch, pack_root_children);
    let dir_jobs: Vec<usize> = plans
        .iter()
        .enumerate()
        .filter(|(_, action)| matches!(action, Disposition::Directory))
        .map(|(index, _)| index)
        .collect();

    let ids = if listed.batch.len() >= PARALLEL_MIN_ENTRIES
        && dir_jobs.len() >= 2
        && !ctx.state.is_cancelled()
    {
        assemble_parallel(ctx, tree, dir, &listed, &plans, &dir_jobs)
    } else {
        assemble_sequential(ctx, tree, dir, &listed, &plans)
    };

    if pack_root_children {
        emit_root_children(ctx, tree, &ids);
    }
    ids
}

fn assemble_sequential(
    ctx: &Walk<'_>,
    tree: &mut Tree,
    dir: &Path,
    listed: &platform::ListedDir,
    plans: &[Disposition],
) -> Vec<u32> {
    let mut ids = Vec::with_capacity(plans.len());
    for (index, action) in plans.iter().enumerate() {
        if ctx.state.is_cancelled() {
            break;
        }
        let entry = &listed.batch.entries()[index];
        let name = listed.batch.name_bytes(entry);
        match *action {
            Disposition::Skip => {}
            Disposition::Zero => ids.push(tree.add_leaf(name, 0)),
            Disposition::File(size) => {
                ctx.state.increment();
                ctx.state.add_size(size);
                ids.push(tree.add_leaf(name, size));
            }
            Disposition::Directory => {
                ctx.state.increment();
                let child = platform::joined(dir, name);
                let follow = entry.kind == EntryKind::Symlink;
                let kids = match platform::list_child(&listed.token, &child, name, follow) {
                    Ok(child_listed) => build_children(ctx, tree, &child, child_listed, false),
                    Err(_) => Vec::new(),
                };
                let size = tree.sum(&kids);
                ids.push(tree.add_dir(name, size, &kids));
            }
        }
    }
    ids
}

fn assemble_parallel(
    ctx: &Walk<'_>,
    tree: &mut Tree,
    dir: &Path,
    listed: &platform::ListedDir,
    plans: &[Disposition],
    dir_jobs: &[usize],
) -> Vec<u32> {
    let built: HashMap<usize, Tree> = dir_jobs
        .par_iter()
        .filter_map(|&index| {
            if ctx.state.is_cancelled() {
                return None;
            }
            let entry = &listed.batch.entries()[index];
            let name = listed.batch.name_bytes(entry);
            let child = platform::joined(dir, name);
            let follow = entry.kind == EntryKind::Symlink;
            let child_listed = platform::list_child(&listed.token, &child, name, follow).ok();
            Some((index, build_directory_tree(ctx, &child, name, child_listed)))
        })
        .collect();

    let mut built = built;
    let mut ids = Vec::with_capacity(plans.len());
    for (index, action) in plans.iter().enumerate() {
        let entry = &listed.batch.entries()[index];
        let name = listed.batch.name_bytes(entry);
        match *action {
            Disposition::Directory => {
                if let Some(sub) = built.remove(&index) {
                    ids.push(tree.absorb(sub));
                }
            }
            Disposition::Skip => {}
            Disposition::Zero => {
                if !ctx.state.is_cancelled() {
                    ids.push(tree.add_leaf(name, 0));
                }
            }
            Disposition::File(size) => {
                if ctx.state.is_cancelled() {
                    continue;
                }
                ctx.state.increment();
                ctx.state.add_size(size);
                ids.push(tree.add_leaf(name, size));
            }
        }
    }
    ids
}

fn build_directory_tree(
    ctx: &Walk<'_>,
    path: &Path,
    name: &[u8],
    listed: Option<platform::ListedDir>,
) -> Tree {
    ctx.state.increment();
    let mut tree = Tree::new();
    let kids = match listed {
        Some(listed) => build_children(ctx, &mut tree, path, listed, false),
        None => Vec::new(),
    };
    let size = tree.sum(&kids);
    let id = tree.add_dir(name, size, &kids);
    tree.root = id;
    tree
}

fn plan_entries(
    ctx: &Walk<'_>,
    dir: &Path,
    batch: &platform::DirBatch,
    force_path: bool,
) -> Vec<Disposition> {
    let mut plans = Vec::with_capacity(batch.len());
    for entry in batch.entries() {
        if ctx.state.is_cancelled() {
            plans.push(Disposition::Skip);
            continue;
        }
        let interval = ctx.state.tick_path();
        let send_now = ctx.channel.is_some() && (force_path || interval);
        let needs_path = send_now
            || matches!(entry.kind, EntryKind::Symlink | EntryKind::Other)
            || (entry.kind == EntryKind::Directory && entry.id.is_none());
        if needs_path {
            let child = platform::joined(dir, batch.name_bytes(entry));
            if send_now {
                let text = child.to_string_lossy().into_owned();
                ctx.state.set_current_path(&text);
                send_path_update(ctx);
            }
            let stat = stat_for(entry, Some(&child));
            plans.push(disposition(
                &child,
                &stat,
                ctx.canonical_root,
                &ctx.state.visits,
            ));
        } else {
            let stat = stat_for(entry, None);
            plans.push(disposition(
                dir,
                &stat,
                ctx.canonical_root,
                &ctx.state.visits,
            ));
        }
    }
    plans
}

fn stat_for(entry: &RawEntry, path: Option<&Path>) -> EntryStat {
    let mut stat = EntryStat {
        kind: entry.kind,
        size_on_disk: entry.size_on_disk,
        id: entry.id,
        link_is_dir: entry.link_is_dir,
    };
    if stat.kind == EntryKind::Directory && stat.id.is_none() {
        if let Some(path) = path {
            stat.id = platform::directory_id(path);
        }
    }
    stat
}

fn emit_root_children(ctx: &Walk<'_>, tree: &Tree, ids: &[u32]) {
    let mut dirs = Vec::new();
    let mut files = Vec::new();
    for id in ids {
        if tree.is_dir(*id) {
            dirs.push(*id);
        } else {
            files.push(*id);
        }
    }
    for id in dirs.into_iter().chain(files) {
        if let Some(forest) = ctx.state.push_subtree(tree, id) {
            send_forest(ctx, forest);
        }
    }
}

fn disposition(
    path: &Path,
    stat: &EntryStat,
    root: Option<&Path>,
    visits: &VisitSet,
) -> Disposition {
    match stat.kind {
        EntryKind::File => {
            if let Some(id) = stat.id {
                if !visits.claim_id(id) {
                    return Disposition::Zero;
                }
            }
            Disposition::File(stat.size_on_disk)
        }
        EntryKind::Directory | EntryKind::Other => {
            if !claim_entry(visits, stat, path) {
                return Disposition::Zero;
            }
            // Sockets and devices fail `read_dir` and stay empty directories,
            // which is what the previous walker produced.
            Disposition::Directory
        }
        EntryKind::Symlink => match platform::resolve_link(path, root, stat.link_is_dir) {
            LinkResolve::Broken => Disposition::Skip,
            LinkResolve::Outside => Disposition::Zero,
            LinkResolve::Inside(follow) => match follow.kind {
                FollowKind::Dir => {
                    if !claim_target(visits, follow.id, follow.canonical.as_deref()) {
                        return Disposition::Zero;
                    }
                    Disposition::Directory
                }
                FollowKind::File => {
                    // Own lstat identity only. The target file keeps its bytes.
                    if let Some(id) = stat.id {
                        if !visits.claim_id(id) {
                            return Disposition::Zero;
                        }
                    }
                    Disposition::File(stat.size_on_disk)
                }
                FollowKind::Other => {
                    if let Some(id) = stat.id {
                        if !visits.claim_id(id) {
                            return Disposition::Zero;
                        }
                    }
                    Disposition::Directory
                }
            },
        },
    }
}

fn claim_entry(visits: &VisitSet, stat: &EntryStat, path: &Path) -> bool {
    if let Some(id) = stat.id {
        visits.claim_id(id)
    } else {
        let key = platform::canonicalize(path).unwrap_or_else(|| path.to_path_buf());
        visits.claim_path(&key)
    }
}

fn claim_target(visits: &VisitSet, id: Option<FileId>, canonical: Option<&Path>) -> bool {
    if let Some(id) = id {
        visits.claim_id(id)
    } else if let Some(path) = canonical {
        visits.claim_path(path)
    } else {
        true
    }
}

fn finish(
    channel: &Channel<PartialScanResult>,
    state: &ScanState,
    root: &FileNode,
    disk_info: Option<DiskInfo>,
) {
    let remaining = state.drain_packed();
    if !remaining.is_empty() {
        let _ = channel.send(event(
            vec![remaining],
            state,
            false,
            None,
            None,
            Some(state.current_path()),
        ));
    }

    let root_metadata = FileNode {
        name: root.name.clone(),
        size: root.size,
        path: root.path.clone(),
        children: if root.is_directory {
            Some(Vec::new())
        } else {
            None
        },
        is_directory: root.is_directory,
    };
    let _ = channel.send(event(
        Vec::new(),
        state,
        true,
        Some(root_metadata),
        disk_info,
        None,
    ));
}

fn send_path_update(ctx: &Walk<'_>) {
    let Some(channel) = ctx.channel else {
        return;
    };
    let _ = channel.send(event(
        Vec::new(),
        ctx.state,
        false,
        None,
        None,
        Some(ctx.state.current_path()),
    ));
}

fn send_forest(ctx: &Walk<'_>, forest: PackedForest) {
    let Some(channel) = ctx.channel else {
        return;
    };
    let _ = channel.send(event(
        vec![forest],
        ctx.state,
        false,
        None,
        None,
        Some(ctx.state.current_path()),
    ));
}

fn event(
    compact_nodes: Vec<PackedForest>,
    state: &ScanState,
    is_complete: bool,
    root_node: Option<FileNode>,
    disk_info: Option<DiskInfo>,
    current_path: Option<String>,
) -> PartialScanResult {
    let (total_scanned, total_size) = state.stats();
    PartialScanResult {
        nodes: Vec::new(),
        compact_nodes,
        total_scanned,
        total_size,
        is_complete,
        root_node,
        compact_root: None,
        disk_info,
        current_path,
    }
}

fn shell_node(tree: &Tree, path: &Path) -> FileNode {
    let is_directory = tree.is_dir(tree.root);
    FileNode {
        name: tree.name(tree.root).to_string(),
        size: tree.size_of(tree.root),
        path: path.to_string_lossy().into_owned(),
        children: if is_directory { Some(Vec::new()) } else { None },
        is_directory,
    }
}

fn materialize(tree: &Tree, id: u32, path: &Path) -> FileNode {
    let is_directory = tree.is_dir(id);
    let children = if is_directory {
        Some(
            tree.children(id)
                .iter()
                .map(|child| {
                    let child_path = path.join(tree.name(*child));
                    materialize(tree, *child, &child_path)
                })
                .collect(),
        )
    } else {
        None
    };
    FileNode {
        name: tree.name(id).to_string(),
        size: tree.size_of(id),
        path: path.to_string_lossy().into_owned(),
        children,
        is_directory,
    }
}

fn entry_name(path: &Path) -> String {
    path.file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("")
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use std::sync::Mutex as StdMutex;
    use std::time::{SystemTime, UNIX_EPOCH};

    struct TempDir(PathBuf);

    impl Drop for TempDir {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    fn scratch(label: &str) -> TempDir {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path =
            std::env::temp_dir().join(format!("storviz-{label}-{}-{nanos}", std::process::id()));
        std::fs::create_dir_all(&path).unwrap();
        TempDir(path)
    }

    fn write_file(path: &Path, bytes: usize) {
        let mut file = std::fs::File::create(path).unwrap();
        file.write_all(&vec![7u8; bytes]).unwrap();
    }

    fn scan(path: &Path) -> (FileNode, u64, u64) {
        let state = ScanState::new();
        let node = walk(path, None, &state, None).unwrap();
        let (count, size) = state.stats();
        (node, count, size)
    }

    fn on_disk(path: &Path) -> u64 {
        platform::stat_path(path).unwrap().size_on_disk
    }

    #[test]
    fn directory_size_is_files_only() {
        let dir = scratch("files");
        let file = dir.0.join("data.bin");
        write_file(&file, 128 * 1024);
        std::fs::create_dir(dir.0.join("empty")).unwrap();

        let (node, count, size) = scan(&dir.0);
        let file_size = on_disk(&file);
        assert!(file_size > 0, "fixture should allocate blocks");
        assert_eq!(size, file_size);
        assert_eq!(node.size, size);
        assert_eq!(path_disk_usage(&dir.0), size);
        // root + empty dir + file
        assert_eq!(count, 3);
        assert!(node.is_directory);
    }

    #[cfg(unix)]
    #[test]
    fn hardlink_counted_once() {
        let dir = scratch("hard");
        let original = dir.0.join("original.bin");
        write_file(&original, 128 * 1024);
        std::fs::hard_link(&original, dir.0.join("alias.bin")).unwrap();

        let (node, count, size) = scan(&dir.0);
        assert_eq!(size, on_disk(&original));
        assert_eq!(node.size, size);
        assert_eq!(path_disk_usage(&dir.0), size);
        // root + one of the two names
        assert_eq!(count, 2);
        let children = node.children.unwrap();
        assert_eq!(children.len(), 2);
        let sizes: Vec<u64> = children.iter().map(|child| child.size).collect();
        assert!(sizes.contains(&size));
        assert!(sizes.contains(&0));
    }

    #[cfg(unix)]
    #[test]
    fn symlink_file_keeps_target_size() {
        let dir = scratch("sylink");
        let original = dir.0.join("original.bin");
        write_file(&original, 64 * 1024);
        std::os::unix::fs::symlink(&original, dir.0.join("link.bin")).unwrap();

        let (node, count, size) = scan(&dir.0);
        let link_size = on_disk(&dir.0.join("link.bin"));
        assert_eq!(size, on_disk(&original).saturating_add(link_size));
        assert_eq!(node.size, size);
        assert_eq!(count, 3);
        assert_eq!(path_disk_usage(&dir.0), size);
    }

    #[cfg(unix)]
    #[test]
    fn symlink_outside_and_directory_cycle_are_not_followed_twice() {
        let dir = scratch("escape");
        let outside = scratch("outside");
        let outside_file = outside.0.join("secret.bin");
        write_file(&outside_file, 128 * 1024);
        std::os::unix::fs::symlink(&outside_file, dir.0.join("out")).unwrap();
        std::os::unix::fs::symlink(".", dir.0.join("loop")).unwrap();

        let (node, count, size) = scan(&dir.0);
        assert_eq!(size, 0);
        assert_eq!(node.size, 0);
        // root only; the outside link and the cycle are zero leaves
        assert_eq!(count, 1);
        assert_eq!(node.children.unwrap().len(), 2);
        assert_eq!(path_disk_usage(&dir.0), 0);
    }

    #[cfg(unix)]
    #[test]
    fn directory_symlink_counts_children_once() {
        let dir = scratch("dirlink");
        let real = dir.0.join("real");
        std::fs::create_dir(&real).unwrap();
        let file = real.join("data.bin");
        write_file(&file, 32 * 1024);
        std::os::unix::fs::symlink(&real, dir.0.join("link")).unwrap();

        let (node, count, size) = scan(&dir.0);
        assert_eq!(size, on_disk(&file));
        assert_eq!(node.size, size);
        assert_eq!(count, 3);
        assert_eq!(path_disk_usage(&dir.0), size);
    }

    #[cfg(unix)]
    #[test]
    fn mutual_directory_links_terminate() {
        let dir = scratch("cycle");
        let a = dir.0.join("a");
        let b = dir.0.join("b");
        std::fs::create_dir(&a).unwrap();
        std::fs::create_dir(&b).unwrap();
        let file = b.join("data.bin");
        write_file(&file, 16 * 1024);
        std::os::unix::fs::symlink(&b, a.join("to-b")).unwrap();
        std::os::unix::fs::symlink(&a, b.join("to-a")).unwrap();

        let (node, count, size) = scan(&dir.0);
        assert_eq!(size, on_disk(&file));
        assert_eq!(node.size, size);
        assert_eq!(count, 4);
        assert_eq!(path_disk_usage(&dir.0), size);
    }

    #[cfg(unix)]
    #[test]
    fn broken_symlink_is_omitted() {
        let dir = scratch("broken");
        std::os::unix::fs::symlink("missing-target", dir.0.join("broken")).unwrap();
        let (_node, count, size) = scan(&dir.0);
        assert_eq!(size, 0);
        assert_eq!(count, 1);
    }

    #[test]
    fn wide_directory_keeps_record_totals() {
        let dir = scratch("wide");
        for index in 0..70 {
            write_file(&dir.0.join(format!("f{index}.bin")), 4096);
        }
        std::fs::create_dir(dir.0.join("d0")).unwrap();
        std::fs::create_dir(dir.0.join("d1")).unwrap();
        write_file(&dir.0.join("d0").join("inner.bin"), 8192);

        let (node, count, size) = scan(&dir.0);
        assert_eq!(count, 74);
        assert_eq!(node.children.as_ref().unwrap().len(), 72);
        assert_eq!(node.size, size);
        assert_eq!(path_disk_usage(&dir.0), size);
        assert!(size > 0);
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn bulk_read_matches_lstat_and_fstatat() {
        use std::collections::HashMap;
        use std::os::unix::fs::MetadataExt;

        let dir = scratch("bulk");
        write_file(&dir.0.join("hello.bin"), 100_000);
        std::os::unix::fs::symlink("hello.bin", dir.0.join("link.bin")).unwrap();
        std::fs::hard_link(dir.0.join("hello.bin"), dir.0.join("hard.bin")).unwrap();
        std::fs::create_dir(dir.0.join("sub")).unwrap();

        let bulk = platform::read_directory(&dir.0).unwrap();
        let fallback = platform::read_directory_fstatat(&dir.0).unwrap();
        assert_eq!(bulk.len(), 4);
        assert_eq!(fallback.len(), bulk.len());

        let mut from_bulk = HashMap::new();
        for entry in bulk.entries() {
            let name = bulk.name_str(entry).into_owned();
            let id = entry.id.expect("file id");
            from_bulk.insert(name, (entry.kind, entry.size_on_disk, id.dev, id.ino));
        }
        for entry in fallback.entries() {
            let name = fallback.name_str(entry).into_owned();
            let id = entry.id.expect("fstatat id");
            let (kind, size, dev, ino) = from_bulk[&name];
            assert_eq!(kind, entry.kind, "{name}");
            assert_eq!(size, entry.size_on_disk, "{name}");
            assert_eq!(dev, id.dev, "{name}");
            assert_eq!(ino, id.ino, "{name}");
        }

        for (name, (kind, size, dev, ino)) in &from_bulk {
            let meta = std::fs::symlink_metadata(dir.0.join(name)).unwrap();
            assert_eq!(*dev, meta.dev(), "{name}");
            assert_eq!(*ino, meta.ino(), "{name}");
            let expect_kind = if meta.file_type().is_symlink() {
                EntryKind::Symlink
            } else if meta.is_dir() {
                EntryKind::Directory
            } else if meta.is_file() {
                EntryKind::File
            } else {
                EntryKind::Other
            };
            assert_eq!(*kind, expect_kind, "{name}");
            let expect_size = match expect_kind {
                EntryKind::File | EntryKind::Symlink => meta.blocks().saturating_mul(512),
                _ => 0,
            };
            assert_eq!(*size, expect_size, "{name}");
        }

        let link = from_bulk["link.bin"];
        let hello = from_bulk["hello.bin"];
        assert_ne!(link.3, hello.3, "symlink must keep its own inode");
        assert_eq!(from_bulk["hard.bin"].3, hello.3);
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn bulk_read_spans_small_buffers() {
        let dir = scratch("span");
        for index in 0..100 {
            write_file(&dir.0.join(format!("f{index}.bin")), 1);
        }
        let batch = platform::read_directory_buffered(&dir.0, 1024).unwrap();
        assert_eq!(batch.len(), 100);
    }

    #[test]
    fn stream_contract_matches_frontend_fields() {
        let dir = scratch("stream");
        write_file(&dir.0.join("a.bin"), 4096);
        let sub = dir.0.join("sub");
        std::fs::create_dir(&sub).unwrap();
        write_file(&sub.join("b.bin"), 8192);

        let messages = Arc::new(StdMutex::new(Vec::<String>::new()));
        let collect = messages.clone();
        let channel = Channel::new(move |body| {
            if let tauri::ipc::InvokeResponseBody::Json(json) = body {
                collect.lock().unwrap().push(json);
            }
            Ok(())
        });

        let state = ScanState::new();
        let node = walk(&dir.0, Some(&channel), &state, None).unwrap();
        let (count, size) = state.stats();
        assert_eq!(node.size, size);
        assert_eq!(
            size,
            on_disk(&dir.0.join("a.bin")) + on_disk(&sub.join("b.bin"))
        );

        let stored = messages.lock().unwrap();
        assert!(!stored.is_empty());
        let mut complete = None;
        let mut names = Vec::new();
        for json in stored.iter() {
            let value: serde_json::Value = serde_json::from_str(json).unwrap();
            assert!(value.get("total_scanned").is_some());
            assert!(value.get("total_size").is_some());
            assert!(value.get("compact_nodes").is_some());
            assert!(value.get("disk_info").is_some());
            if value["is_complete"].as_bool() == Some(true) {
                assert_eq!(value["root_node"]["isDirectory"], true);
                assert_eq!(value["root_node"]["size"], size);
                assert_eq!(value["root_node"]["path"], node.path);
                assert_eq!(value["total_scanned"], count);
                assert!(value["root_node"]["children"]
                    .as_array()
                    .unwrap()
                    .is_empty());
                complete = Some(value);
            } else if let Some(forests) = value["compact_nodes"].as_array() {
                for forest in forests {
                    collect_packed_names(forest, &mut names);
                }
            }
        }
        assert!(complete.is_some());
        assert!(names.iter().any(|(name, dir)| name == "a.bin" && !dir));
        assert!(names.iter().any(|(name, dir)| name == "sub" && *dir));
        assert!(names.iter().any(|(name, _)| name == "b.bin"));
    }

    fn collect_packed_names(forest: &serde_json::Value, names: &mut Vec<(String, bool)>) {
        let n = forest["n"].as_array().expect("names");
        let s = forest["s"].as_array().expect("sizes");
        let m = forest["m"].as_array().expect("meta");
        let k = forest["k"].as_array().expect("kids");
        let roots = forest["r"].as_array().expect("roots");
        assert_eq!(m.len(), n.len() * 3);
        assert_eq!(s.len(), n.len());
        for root in roots {
            let index = root.as_u64().unwrap() as usize;
            walk_packed(n, m, s, k, index, names);
        }
    }

    fn walk_packed(
        n: &[serde_json::Value],
        m: &[serde_json::Value],
        s: &[serde_json::Value],
        k: &[serde_json::Value],
        index: usize,
        names: &mut Vec<(String, bool)>,
    ) {
        assert!(s[index].as_u64().is_some());
        let is_dir = m[index * 3 + 2].as_u64().unwrap() & 1 == 1;
        names.push((n[index].as_str().unwrap().to_string(), is_dir));
        let child_off = m[index * 3].as_u64().unwrap() as usize;
        let child_count = m[index * 3 + 1].as_u64().unwrap() as usize;
        for child in 0..child_count {
            let next = k[child_off + child].as_u64().unwrap() as usize;
            walk_packed(n, m, s, k, next, names);
        }
    }
}
