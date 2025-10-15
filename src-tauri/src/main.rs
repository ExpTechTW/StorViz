// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::collections::HashSet;
use tauri::ipc::Channel;
use rayon::prelude::*;
use sysinfo::Disks;
#[cfg(unix)]
use std::os::unix::fs::MetadataExt;
use filesize::PathExt;

// Constants
const BATCH_SIZE: usize = 10000;
const MAX_DEPTH: usize = 100; // Increased depth limit

#[derive(Debug, Clone, Serialize, Deserialize)]
struct FileNode {
    name: String,
    size: u64,
    path: String,
    children: Option<Vec<FileNode>>,
    #[serde(rename = "isDirectory")]
    is_directory: bool,
}

#[derive(Clone, Serialize)]
struct PartialScanResult {
    nodes: Vec<FileNode>,
    total_scanned: u64,
    total_size: u64,
    is_complete: bool,
    root_node: Option<FileNode>,
    disk_info: Option<DiskInfo>,
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
    batch_buffer: Arc<Mutex<Vec<FileNode>>>,
    visited_inodes: Arc<Mutex<HashSet<u64>>>,
    recursion_stack: Arc<Mutex<HashSet<PathBuf>>>,
}

impl ScanState {
    fn new() -> Self {
        Self {
            counter: Arc::new(Mutex::new(0)),
            scanned_size: Arc::new(Mutex::new(0)),
            batch_buffer: Arc::new(Mutex::new(Vec::new())),
            visited_inodes: Arc::new(Mutex::new(HashSet::new())),
            recursion_stack: Arc::new(Mutex::new(HashSet::new())),
        }
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

    fn add_to_buffer(&self, node: FileNode) -> bool {
        if let Ok(mut buffer) = self.batch_buffer.lock() {
            buffer.push(node);
            buffer.len() >= BATCH_SIZE
        } else {
            false
        }
    }

    fn get_stats(&self) -> (u64, u64) {
        let count = self.counter.lock().unwrap();
        let size = self.scanned_size.lock().unwrap();
        (*count, *size)
    }

    fn clear_buffer(&self) -> Vec<FileNode> {
        if let Ok(mut buffer) = self.batch_buffer.lock() {
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
}

// Get disk space information using sysinfo
fn get_disk_info(path: &Path) -> Option<DiskInfo> {
    let disks = Disks::new_with_refreshed_list();
    
    // Convert path to string for comparison
    let path_str = path.to_string_lossy();
    
    // Find the disk that contains this path
    // We need to find the most specific match (longest mount point)
    let mut best_match: Option<(usize, DiskInfo)> = None;
    
    for disk in disks.list() {
        let disk_path = disk.mount_point().to_string_lossy();
        
        // Only log when we find a match to reduce noise
        if path_str.starts_with(&*disk_path) {
            println!("DEBUG: Found matching disk '{}' for path '{}'", disk_path, path_str);
        }
        
        // Check if the path is on this disk
        if path_str.starts_with(&*disk_path) {
            let disk_info = DiskInfo {
                total_space: disk.total_space(),
                available_space: disk.available_space(),
                used_space: disk.total_space() - disk.available_space(),
            };
            
            // Keep track of the longest (most specific) match
            let mount_point_len = disk_path.len();
            if best_match.is_none() || mount_point_len > best_match.as_ref().unwrap().0 {
                best_match = Some((mount_point_len, disk_info));
                println!("DEBUG: New best match with mount point '{}' (length: {})", disk_path, mount_point_len);
            }
        }
    }
    
    if let Some((_, disk_info)) = best_match {
        println!("DEBUG: Using best match for path '{}'", path_str);
        Some(disk_info)
    } else {
        println!("DEBUG: No matching disk found for path '{}'", path_str);
        None
    }
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
        let root_path = Path::new(&path);
        
        // Get disk info for root directory scans
        let disk_info = if is_root_directory(&path) {
            println!("DEBUG: Detected root directory: {}", path);
            let info = get_disk_info(root_path);
            if let Some(ref disk) = info {
                println!("DEBUG: Disk info - Total: {} GB, Available: {} GB", 
                    disk.total_space / (1024*1024*1024), 
                    disk.available_space / (1024*1024*1024));
            } else {
                println!("DEBUG: Failed to get disk info for path: {}", path);
            }
            info
        } else {
            println!("DEBUG: Not a root directory: {}", path);
            None
        };
        
        if let Ok(root_node) = scan_directory_recursive(root_path, &on_batch, &state, root_path) {
            let limited_root = build_limited_depth_node(&root_node, MAX_DEPTH);
            send_final_batch(&on_batch, &state, limited_root, disk_info);
        }
    });

    Ok(())
}

fn send_final_batch(channel: &Channel<PartialScanResult>, state: &ScanState, root_node: FileNode, disk_info: Option<DiskInfo>) {
    let (total_items, total_size) = state.get_stats();
    let remaining_nodes = state.clear_buffer();
    
    let payload = PartialScanResult {
        nodes: remaining_nodes,
        total_scanned: total_items,
        total_size,
        is_complete: true,
        root_node: Some(root_node),
        disk_info,
    };
    
    let _ = channel.send(payload);
}

fn send_batch(channel: &Channel<PartialScanResult>, state: &ScanState) {
    let (total_items, total_size) = state.get_stats();
    let nodes = state.clear_buffer();
    
    let payload = PartialScanResult {
        nodes,
        total_scanned: total_items,
        total_size,
        is_complete: false,
        root_node: None,
        disk_info: None,
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
    let path_str = path.to_string_lossy().to_string();
    
    // Prevent scanning above the root path to avoid duplicate counting
    // Use canonicalized paths for accurate comparison
    if let Ok(canonical_root) = fs::canonicalize(root_path) {
        if let Ok(canonical_path) = fs::canonicalize(path) {
            if !canonical_path.starts_with(&canonical_root) {
                println!("DEBUG: Skipping path above root: {} (canonical: {}) (root canonical: {})", 
                         path_str, canonical_path.display(), canonical_root.display());
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
            println!("DEBUG: Detected circular path: {} (canonical: {})", path_str, canonical_path.display());
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
            println!("DEBUG: Skipping already visited inode: {} ({})", inode, path_str);
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
        println!("DEBUG: Following symlink: {}", path_str);
        // Try to follow the symlink
        if let Ok(target_path) = fs::read_link(path) {
            if let Ok(target_metadata) = fs::metadata(&target_path) {
                if target_metadata.is_file() {
                    // Use filesize to get actual disk usage for symlinked files
                    let file_size = target_path.size_on_disk().unwrap_or(0);
                    println!("DEBUG: Symlink '{}' points to file of actual size: {} bytes", path_str, file_size);
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
                                println!("DEBUG: Symlink '{}' points to directory above root: {} (canonical: {}) (root canonical: {})", 
                                         path_str, target_path.display(), canonical_target.display(), canonical_root.display());
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
                            println!("DEBUG: Symlink '{}' points to directory already in recursion stack: {}", path_str, canonical_target.display());
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
                    println!("DEBUG: Symlink '{}' points to directory, scanning target", path_str);
                    return scan_directory_recursive(&target_path, channel, state, root_path);
                }
            }
        }
        
        // If we can't follow the symlink, return size 0
        println!("DEBUG: Cannot follow symlink: {}", path_str);
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
        
        // Log very large files (>100MB) for debugging
        if file_size > 100_000_000 {
            println!("DEBUG: Very large file '{}' actual size: {} bytes", name, file_size);
        }
        
        // Only log large files (>10MB) to reduce noise
        if file_size > 10_000_000 {
            println!("DEBUG: Large file '{}' actual size: {} bytes", name, file_size);
        }
        state.add_size(file_size);

        let node = FileNode {
            name,
            size: file_size,
            path: path_str,
            children: None,
            is_directory: false,
        };

        if state.add_to_buffer(node.clone()) {
            send_batch(channel, state);
        }

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
        
        let children: Vec<FileNode> = filtered_entries
            .par_iter()
            .filter_map(|entry| {
                scan_directory_recursive(&entry.path(), channel, state, root_path).ok()
            })
            .collect();
        
        // Remove current directory from recursion stack
        if let Ok(canonical_path) = fs::canonicalize(path) {
            state.pop_from_recursion_stack(&canonical_path);
        }

        let dir_total_size: u64 = children.iter().map(|c| c.size).sum();
        
        // Only log large directories (>100MB) to reduce noise
        if dir_total_size > 100_000_000 {
            println!("DEBUG: Large directory '{}' total size: {} bytes ({} children)", 
                     name, dir_total_size, children.len());
        }

        Ok(FileNode {
            name,
            size: dir_total_size,
            path: path_str,
            children: Some(children),
            is_directory: true,
        })
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
        .invoke_handler(tauri::generate_handler![scan_directory_streaming])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
