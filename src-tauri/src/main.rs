// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::collections::HashSet;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::ipc::Channel;
use rayon::prelude::*;
use sysinfo::Disks;
#[cfg(unix)]
use std::os::unix::fs::MetadataExt;
use filesize::PathExt;

// Constants
const BATCH_SIZE: usize = 10000;
const MAX_DEPTH: usize = 100; // Increased depth limit
const PATH_UPDATE_INTERVAL: usize = 10; // Update path display every N files

// Global scan state for cancellation
use std::sync::OnceLock;
static CURRENT_SCAN_STATE: OnceLock<Arc<Mutex<Option<ScanState>>>> = OnceLock::new();

#[derive(Debug, Clone, Serialize, Deserialize)]
struct FileNode {
    name: String,
    size: u64,
    path: String,
    children: Option<Vec<FileNode>>,
    #[serde(rename = "isDirectory")]
    is_directory: bool,
}

// Compact version - remove redundant path info
#[derive(Debug, Clone, Serialize)]
struct CompactFileNode {
    #[serde(rename = "n")]
    name: String,
    #[serde(rename = "s")]
    size: u64,
    #[serde(rename = "c", skip_serializing_if = "Option::is_none")]
    children: Option<Vec<CompactFileNode>>,
    #[serde(rename = "d")]
    is_directory: bool,
}

#[derive(Clone, Serialize)]
struct PartialScanResult {
    nodes: Vec<FileNode>,
    compact_nodes: Vec<CompactFileNode>, // Batch of compact nodes
    total_scanned: u64,
    total_size: u64,
    is_complete: bool,
    root_node: Option<FileNode>,
    compact_root: Option<CompactFileNode>,
    disk_info: Option<DiskInfo>,
    current_path: Option<String>,
}

#[derive(Clone, Serialize)]
struct DiskInfo {
    total_space: u64,
    available_space: u64,
    used_space: u64,
}

// Helper struct for shared state
#[derive(Clone)]
struct ScanState {
    counter: Arc<Mutex<u64>>,
    scanned_size: Arc<Mutex<u64>>,
    compact_batch_buffer: Arc<Mutex<Vec<CompactFileNode>>>, // Buffer for compact nodes
    #[cfg(unix)]
    visited_inodes: Arc<Mutex<HashSet<u64>>>,
    recursion_stack: Arc<Mutex<HashSet<PathBuf>>>,
    cancelled: Arc<AtomicBool>,
    current_path: Arc<Mutex<String>>,
    path_update_counter: Arc<Mutex<usize>>,
}

impl ScanState {
    fn new() -> Self {
        Self {
            counter: Arc::new(Mutex::new(0)),
            scanned_size: Arc::new(Mutex::new(0)),
            compact_batch_buffer: Arc::new(Mutex::new(Vec::new())),
            #[cfg(unix)]
            visited_inodes: Arc::new(Mutex::new(HashSet::new())),
            recursion_stack: Arc::new(Mutex::new(HashSet::new())),
            cancelled: Arc::new(AtomicBool::new(false)),
            current_path: Arc::new(Mutex::new(String::new())),
            path_update_counter: Arc::new(Mutex::new(0)),
        }
    }

    fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::Relaxed)
    }

    fn cancel(&self) {
        self.cancelled.store(true, Ordering::Relaxed)
    }

    fn increment_counter(&self) {
        if let Ok(mut count) = self.counter.lock() {
            *count += 1;
        }
    }

    fn add_size(&self, size: u64) {
        if let Ok(mut total) = self.scanned_size.lock() {
            *total += size;
        }
    }

    fn get_stats(&self) -> (u64, u64) {
        let count = self.counter.lock().unwrap();
        let size = self.scanned_size.lock().unwrap();
        (*count, *size)
    }

    fn add_compact_to_buffer(&self, node: CompactFileNode) -> bool {
        if let Ok(mut buffer) = self.compact_batch_buffer.lock() {
            buffer.push(node);
            buffer.len() >= BATCH_SIZE
        } else {
            false
        }
    }

    fn clear_compact_buffer(&self) -> Vec<CompactFileNode> {
        if let Ok(mut buffer) = self.compact_batch_buffer.lock() {
            buffer.drain(..).collect()
        } else {
            Vec::new()
        }
    }

    #[cfg(unix)]
    fn is_visited_inode(&self, inode: u64) -> bool {
        if let Ok(visited) = self.visited_inodes.lock() {
            visited.contains(&inode)
        } else {
            false
        }
    }

    #[cfg(unix)]
    fn mark_visited_inode(&self, inode: u64) -> bool {
        if let Ok(mut visited) = self.visited_inodes.lock() {
            visited.insert(inode)
        } else {
            false
        }
    }

    fn push_to_recursion_stack(&self, path: &Path) -> bool {
        if let Ok(mut stack) = self.recursion_stack.lock() {
            stack.insert(path.to_path_buf())
        } else {
            false
        }
    }

    fn pop_from_recursion_stack(&self, path: &Path) {
        if let Ok(mut stack) = self.recursion_stack.lock() {
            stack.remove(path);
        }
    }

    fn is_in_recursion_stack(&self, path: &Path) -> bool {
        if let Ok(stack) = self.recursion_stack.lock() {
            stack.contains(path)
        } else {
            false
        }
    }

    fn set_current_path(&self, path: &str) {
        if let Ok(mut current) = self.current_path.lock() {
            *current = path.to_string();
        }
    }

    fn get_current_path(&self) -> String {
        if let Ok(current) = self.current_path.lock() {
            current.clone()
        } else {
            String::new()
        }
    }

    fn should_send_path_update(&self) -> bool {
        if let Ok(mut counter) = self.path_update_counter.lock() {
            *counter += 1;
            if *counter >= PATH_UPDATE_INTERVAL {
                *counter = 0;
                return true;
            }
        }
        false
    }

}

// Get disk space information using sysinfo
fn get_disk_info(path: &Path) -> Option<DiskInfo> {
    let disks = Disks::new_with_refreshed_list();

    // Convert path to string for comparison
    let path_str = path.to_string_lossy();

    #[cfg(target_os = "macos")]
    {
        // First, try to find an exact or most specific mount point match
        // This handles external drives before falling back to root
        let mut best_match: Option<(&sysinfo::Disk, usize)> = None;

        for disk in disks.list() {
            let disk_path = disk.mount_point().to_string_lossy();

            // Check if path starts with this mount point
            if path_str.starts_with(&*disk_path) {
                let match_length = disk_path.len();

                // Keep the longest (most specific) match
                if let Some((_, current_length)) = best_match {
                    if match_length > current_length {
                        best_match = Some((disk, match_length));
                    }
                } else {
                    best_match = Some((disk, match_length));
                }
            }
        }

        // If we found a best match
        if let Some((matched_disk, _)) = best_match {
            let disk_path = matched_disk.mount_point().to_string_lossy();

            // For root scan ("/"), sum all system-related volumes
            if path_str == "/" && disk_path == "/" {
                let mut total_space = 0u64;
                let mut total_available = 0u64;
                let mut total_used = 0u64;
                let mut found_any = false;

                for disk in disks.list() {
                    let dp = disk.mount_point().to_string_lossy();

                    if dp == "/" ||
                       dp.starts_with("/System/Volumes/Data") ||
                       dp.starts_with("/System/Volumes/Preboot") ||
                       dp.starts_with("/System/Volumes/VM") ||
                       dp.starts_with("/System/Volumes/Update") {

                        let used = disk.total_space() - disk.available_space();
                        println!("📊 macOS partition {}: used={} GB",
                            dp,
                            used / 1024 / 1024 / 1024
                        );

                        // Sum the used space from each partition
                        total_used += used;

                        // Total and available are shared across all APFS volumes
                        total_space = disk.total_space();
                        total_available = disk.available_space();
                        found_any = true;
                    }
                }

                if found_any {
                    println!("✅ Total macOS disk usage: {} GB (total: {} GB, available: {} GB)",
                        total_used / 1024 / 1024 / 1024,
                        total_space / 1024 / 1024 / 1024,
                        total_available / 1024 / 1024 / 1024
                    );

                    return Some(DiskInfo {
                        total_space,
                        available_space: total_available,
                        used_space: total_used,
                    });
                }
            } else {
                // For non-root paths (including external drives), use the specific disk
                let total = matched_disk.total_space();
                let available = matched_disk.available_space();
                let used = total - available;

                println!("📊 Disk info for '{}' (mount: {}): total={} GB, available={} GB, used={} GB",
                    path_str,
                    disk_path,
                    total / 1024 / 1024 / 1024,
                    available / 1024 / 1024 / 1024,
                    used / 1024 / 1024 / 1024
                );

                return Some(DiskInfo {
                    total_space: total,
                    available_space: available,
                    used_space: used,
                });
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        // Windows/Linux: Simple disk usage
        for disk in disks.list() {
            let disk_path = disk.mount_point().to_string_lossy();

            if path_str.starts_with(&*disk_path) {
                let total = disk.total_space();
                let available = disk.available_space();
                let used = total - available;

                println!("💾 Disk Info for {}: total={} GB, available={} GB, used={} GB",
                    disk_path,
                    total / 1024 / 1024 / 1024,
                    available / 1024 / 1024 / 1024,
                    used / 1024 / 1024 / 1024
                );

                return Some(DiskInfo {
                    total_space: total,
                    available_space: available,
                    used_space: used,
                });
            }
        }
    }

    None
}

// Check if path is a root directory
fn is_root_directory(path: &str) -> bool {
    #[cfg(unix)]
    {
        // Check for actual root directory
        if path == "/" || path == "\\" {
            return true;
        }
        
        // Check for macOS volume mount points (e.g., /Volumes/YuYu1015)
        if path.starts_with("/Volumes/") {
            let parts: Vec<&str> = path.split('/').collect();
            // Should be exactly ["", "Volumes", "VolumeName"]
            if parts.len() == 3 && parts[0] == "" && parts[1] == "Volumes" && !parts[2].is_empty() {
                return true;
            }
        }
        
        // Check for Linux mount points (e.g., /mnt/disk, /media/user/disk)
        if path.starts_with("/mnt/") || path.starts_with("/media/") {
            let parts: Vec<&str> = path.split('/').collect();
            // Should be exactly ["", "mnt", "diskname"] or ["", "media", "user", "diskname"]
            if (parts.len() == 3 && parts[0] == "" && parts[1] == "mnt" && !parts[2].is_empty()) ||
               (parts.len() == 4 && parts[0] == "" && parts[1] == "media" && !parts[2].is_empty() && !parts[3].is_empty()) {
                return true;
            }
        }
        
        false
    }
    
    #[cfg(windows)]
    {
        path.len() == 3 && path.ends_with(":\\") // e.g., "C:\"
    }
    
    #[cfg(not(any(unix, windows)))]
    {
        false
    }
}

#[tauri::command]
async fn scan_directory_streaming(path: String, on_batch: Channel<PartialScanResult>) -> Result<(), String> {
    let root_path = Path::new(&path);
    if !root_path.exists() {
        return Err("路徑不存在".to_string());
    }

    // Spawn background scanning task
    std::thread::spawn(move || {
        let state = ScanState::new();

        // Register the current scan state for cancellation
        let global_state = CURRENT_SCAN_STATE.get_or_init(|| Arc::new(Mutex::new(None)));
        if let Ok(mut current) = global_state.lock() {
            *current = Some(state.clone());
        }

        let root_path = Path::new(&path);

        // Get disk info for root directory scans
        let is_root = is_root_directory(&path);

        let disk_info = if is_root {
            get_disk_info(root_path)
        } else {
            None
        };

        // Send initial message with disk_info for progress calculation
        if disk_info.is_some() {
            let initial_payload = PartialScanResult {
                nodes: Vec::new(),
                compact_nodes: Vec::new(),
                total_scanned: 0,
                total_size: 0,
                is_complete: false,
                root_node: None,
                compact_root: None,
                disk_info: disk_info.clone(),
                current_path: Some(path.clone()),
            };
            let _ = on_batch.send(initial_payload);
        }

        match scan_directory_recursive(root_path, &on_batch, &state, root_path) {
            Ok(root_node) => {
                let limited_root = build_limited_depth_node(&root_node, MAX_DEPTH);
                send_final_batch(&on_batch, &state, limited_root, disk_info);
            }
            Err(e) => {
                eprintln!("Scan failed: {}", e);
            }
        }

        // Clear the current scan state when done
        if let Some(global_state) = CURRENT_SCAN_STATE.get() {
            if let Ok(mut current) = global_state.lock() {
                *current = None;
            }
        }
    });

    Ok(())
}

#[tauri::command]
fn cancel_scan() -> Result<(), String> {
    if let Some(global_state) = CURRENT_SCAN_STATE.get() {
        if let Ok(current) = global_state.lock() {
            if let Some(state) = &*current {
                state.cancel();
                return Ok(());
            }
        }
    }
    Err("No active scan to cancel".to_string())
}

// Deletion progress message
#[derive(Clone, Serialize)]
struct DeletionProgress {
    current: usize,
    total: usize,
    current_path: String,
    success: bool,
    completed: bool,
    deleted_size: Option<u64>,
    deleted_count: Option<usize>,
}

#[tauri::command]
async fn delete_files_batch(paths: Vec<String>, on_progress: Channel<DeletionProgress>) -> Result<(), String> {
    let total = paths.len();

    // Spawn background deletion task
    std::thread::spawn(move || {
        let mut deleted_count = 0usize;
        let mut deleted_size = 0u64;

        for (index, path) in paths.iter().enumerate() {
            let path_obj = Path::new(path);
            let current_path = path.clone();

            // Calculate size before deletion
            let size_before = if path_obj.exists() {
                if path_obj.is_file() {
                    path_obj.size_on_disk().unwrap_or(0)
                } else if path_obj.is_dir() {
                    calculate_dir_size(path_obj)
                } else {
                    0
                }
            } else {
                0
            };

            // Send progress update
            let progress = DeletionProgress {
                current: index + 1,
                total,
                current_path: current_path.clone(),
                success: false,
                completed: false,
                deleted_size: None,
                deleted_count: None,
            };
            let _ = on_progress.send(progress);

            // Attempt deletion
            let deletion_result = if path_obj.is_file() {
                fs::remove_file(path_obj)
            } else if path_obj.is_dir() {
                fs::remove_dir_all(path_obj)
            } else {
                Err(std::io::Error::new(std::io::ErrorKind::Other, "Not a file or directory"))
            };

            match deletion_result {
                Ok(_) => {
                    deleted_count += 1;
                    deleted_size += size_before;
                    println!("✅ Deleted: {} (size: {} bytes)", current_path, size_before);
                }
                Err(e) => {
                    eprintln!("❌ Failed to delete {}: {}", current_path, e);
                }
            }
        }

        // Send completion message
        let completion = DeletionProgress {
            current: total,
            total,
            current_path: String::from("完成"),
            success: true,
            completed: true,
            deleted_size: Some(deleted_size),
            deleted_count: Some(deleted_count),
        };
        let _ = on_progress.send(completion);
    });

    Ok(())
}

// Helper function to calculate directory size recursively
fn calculate_dir_size(path: &Path) -> u64 {
    let mut total_size = 0u64;

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            if entry_path.is_file() {
                total_size += entry_path.size_on_disk().unwrap_or(0);
            } else if entry_path.is_dir() {
                total_size += calculate_dir_size(&entry_path);
            }
        }
    }

    total_size
}

// Convert FileNode to compact format (removes path, uses short keys)
fn to_compact_node(node: &FileNode) -> CompactFileNode {
    CompactFileNode {
        name: node.name.clone(),
        size: node.size,
        children: node.children.as_ref().map(|children| {
            children.iter().map(|child| to_compact_node(child)).collect()
        }),
        is_directory: node.is_directory,
    }
}

fn send_final_batch(channel: &Channel<PartialScanResult>, state: &ScanState, root_node: FileNode, disk_info: Option<DiskInfo>) {
    let (total_items, total_size) = state.get_stats();
    let mut remaining_compact_nodes = state.clear_compact_buffer();

    // Add root-level files as compact nodes (directories were already added during scan)
    if let Some(ref children) = root_node.children {
        let root_files: Vec<CompactFileNode> = children
            .iter()
            .filter(|child| !child.is_directory)
            .map(|child| to_compact_node(child))
            .collect();

        if !root_files.is_empty() {
            remaining_compact_nodes.extend(root_files);
        }
    }

    // Send remaining compact nodes if any
    if !remaining_compact_nodes.is_empty() {
        let batch_payload = PartialScanResult {
            nodes: Vec::new(),
            compact_nodes: remaining_compact_nodes,
            total_scanned: total_items,
            total_size,
            is_complete: false,
            root_node: None,
            compact_root: None,
            disk_info: None,
            current_path: None,
        };
        let _ = channel.send(batch_payload);
    }

    // Send final completion message with root metadata only
    let root_metadata = FileNode {
        name: root_node.name.clone(),
        size: root_node.size,
        path: root_node.path.clone(),
        children: Some(Vec::new()),
        is_directory: true,
    };

    let payload = PartialScanResult {
        nodes: Vec::new(),
        compact_nodes: Vec::new(),
        total_scanned: total_items,
        total_size,
        is_complete: true,
        root_node: Some(root_metadata),
        compact_root: None,
        disk_info,
        current_path: None,
    };

    let _ = channel.send(payload);
}

fn send_compact_batch(channel: &Channel<PartialScanResult>, state: &ScanState) {
    let (total_items, total_size) = state.get_stats();
    let compact_nodes = state.clear_compact_buffer();
    let current_path = state.get_current_path();

    let payload = PartialScanResult {
        nodes: Vec::new(),
        compact_nodes,
        total_scanned: total_items,
        total_size,
        is_complete: false,
        root_node: None,
        compact_root: None,
        disk_info: None,
        current_path: Some(current_path),
    };

    let _ = channel.send(payload);
}

fn send_path_update(channel: &Channel<PartialScanResult>, state: &ScanState) {
    let (total_items, total_size) = state.get_stats();
    let current_path = state.get_current_path();

    let payload = PartialScanResult {
        nodes: Vec::new(),
        compact_nodes: Vec::new(),
        total_scanned: total_items,
        total_size,
        is_complete: false,
        root_node: None,
        compact_root: None,
        disk_info: None,
        current_path: Some(current_path),
    };

    let _ = channel.send(payload);
}

fn build_limited_depth_node(node: &FileNode, max_depth: usize) -> FileNode {
    build_limited_depth_node_recursive(node, 0, max_depth)
}

fn build_limited_depth_node_recursive(node: &FileNode, current_depth: usize, max_depth: usize) -> FileNode {
    if current_depth >= max_depth {
        return FileNode {
            name: node.name.clone(),
            size: node.size,
            path: node.path.clone(),
            children: if node.is_directory { Some(Vec::new()) } else { None },
            is_directory: node.is_directory,
        };
    }

    let limited_children = node.children.as_ref().map(|children| {
        children
            .iter()
            .map(|child| build_limited_depth_node_recursive(child, current_depth + 1, max_depth))
            .collect()
    });

    FileNode {
        name: node.name.clone(),
        size: node.size,
        path: node.path.clone(),
        children: limited_children,
        is_directory: node.is_directory,
    }
}

fn scan_directory_recursive(
    path: &Path,
    channel: &Channel<PartialScanResult>,
    state: &ScanState,
    root_path: &Path,
) -> Result<FileNode, String> {
    // Check if scan has been cancelled
    if state.is_cancelled() {
        return Err("Scan cancelled".to_string());
    }

    let path_str = path.to_string_lossy().to_string();

    // Update current scanning path
    state.set_current_path(&path_str);

    // Send path update if interval reached
    if state.should_send_path_update() {
        send_path_update(channel, state);
    }

    // Prevent scanning above the root path to avoid duplicate counting
    // Use canonicalized paths for accurate comparison
    if let Ok(canonical_root) = fs::canonicalize(root_path) {
        if let Ok(canonical_path) = fs::canonicalize(path) {
            if !canonical_path.starts_with(&canonical_root) {
                return Ok(FileNode {
                    name: path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string(),
                    size: 0,
                    path: path_str,
                    children: None,
                    is_directory: false,
                });
            }
        }
    }
    
    // Check for circular path using canonicalized path
    if let Ok(canonical_path) = fs::canonicalize(path) {
        if state.is_in_recursion_stack(&canonical_path) {
            return Ok(FileNode {
                name: path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string(),
                size: 0,
                path: path_str,
                children: None,
                is_directory: false,
            });
        }
    }
    
    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    
    // Check if we've already visited this inode (prevents symlink loops and hard link duplicates)
    // Only use inode tracking on Unix systems
    #[cfg(unix)]
    {
        let inode = metadata.ino();
        if state.is_visited_inode(inode) {
            return Ok(FileNode {
                name: path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string(),
                size: 0,
                path: path_str,
                children: None,
                is_directory: false,
            });
        }
        state.mark_visited_inode(inode);
    }
    
    let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
    state.increment_counter();

    // Handle symlinks by following them
    if metadata.file_type().is_symlink() {
        // Try to follow the symlink
        if let Ok(target_path) = fs::read_link(path) {
            if let Ok(target_metadata) = fs::metadata(&target_path) {
                if target_metadata.is_file() {
                    // Use filesize to get actual disk usage for symlinked files
                    let file_size = target_path.size_on_disk().unwrap_or(0);
                    state.add_size(file_size);
                    
                    return Ok(FileNode {
                        name,
                        size: file_size,
                        path: path_str,
                        children: None,
                        is_directory: false,
                    });
                } else if target_metadata.is_dir() {
                    // For directory symlinks, check if target is above root path or in recursion stack
                    if let Ok(canonical_root) = fs::canonicalize(root_path) {
                        if let Ok(canonical_target) = fs::canonicalize(&target_path) {
                            if !canonical_target.starts_with(&canonical_root) {
                                return Ok(FileNode {
                                    name,
                                    size: 0,
                                    path: path_str,
                                    children: None,
                                    is_directory: false,
                                });
                            }
                        }
                    }
                    
                    if let Ok(canonical_target) = fs::canonicalize(&target_path) {
                        if state.is_in_recursion_stack(&canonical_target) {
                            return Ok(FileNode {
                                name,
                                size: 0,
                                path: path_str,
                                children: None,
                                is_directory: false,
                            });
                        }
                    }
                    
                    // Safe to scan the target directory
                    return scan_directory_recursive(&target_path, channel, state, root_path);
                }
            }
        }
        
        // If we can't follow the symlink, return size 0
        return Ok(FileNode {
            name,
            size: 0,
            path: path_str,
            children: None,
            is_directory: false,
        });
    }

    if metadata.is_file() {
        // Use filesize to get actual disk usage (handles sparse files correctly)
        let file_size = path.size_on_disk().unwrap_or(0);

        state.add_size(file_size);

        // Don't add files to batch buffer - only send directories to reduce IPC load
        let node = FileNode {
            name,
            size: file_size,
            path: path_str,
            children: None,
            is_directory: false,
        };

        return Ok(node);
    }

    // Scan directory with parallel processing
    if let Ok(entries) = fs::read_dir(path) {
        // Add current directory to recursion stack
        if let Ok(canonical_path) = fs::canonicalize(path) {
            state.push_to_recursion_stack(&canonical_path);
        }

        let entries_vec: Vec<_> = entries.flatten().collect();

        // No filtering - scan everything
        let filtered_entries = entries_vec;

        // For root directory's direct children, send immediate progress updates
        let is_root_level = path == root_path;

        let children: Vec<FileNode> = filtered_entries
            .par_iter()
            .filter_map(|entry| {
                // Send progress update before scanning each root-level directory
                if is_root_level {
                    send_path_update(channel, state);
                }
                scan_directory_recursive(&entry.path(), channel, state, root_path).ok()
            })
            .collect();
        
        // Remove current directory from recursion stack
        if let Ok(canonical_path) = fs::canonicalize(path) {
            state.pop_from_recursion_stack(&canonical_path);
        }

        let dir_total_size: u64 = children.iter().map(|c| c.size).sum();

        // Create directory node for return (with full children tree)
        let dir_node_with_children = FileNode {
            name: name.clone(),
            size: dir_total_size,
            path: path_str.clone(),
            children: Some(children),
            is_directory: true,
        };

        // Only send compact nodes for direct children of root (depth 1)
        // This prevents sending duplicate nested directories
        if let Some(parent) = path.parent() {
            if parent == root_path {
                // This is a direct child of root - send it with full subtree
                let compact_dir = to_compact_node(&dir_node_with_children);
                if state.add_compact_to_buffer(compact_dir) {
                    send_compact_batch(channel, state);
                }
            }
        }

        Ok(dir_node_with_children)
    } else {
        Ok(FileNode {
            name,
            size: 0,
            path: path_str,
            children: Some(Vec::new()),
            is_directory: true,
        })
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![scan_directory_streaming, cancel_scan, delete_files_batch])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
