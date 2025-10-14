// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::sync::{Arc, Mutex};
use tauri::Emitter;
use sysinfo::Disks;

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
struct ScanResult {
    node: FileNode,
    disk_info: Option<DiskInfo>,
}

#[derive(Clone, Serialize)]
struct ScanProgress {
    current_path: String,
    files_scanned: u64,
    scanned_size: u64,
    estimated_total: u64,
}

#[derive(Clone, Serialize)]
struct DiskInfo {
    total_space: u64,
    available_space: u64,
    used_space: u64,
}

#[tauri::command]
fn scan_directory(path: String, app_handle: tauri::AppHandle) -> Result<ScanResult, String> {
    let root_path = Path::new(&path);

    if !root_path.exists() {
        return Err("路徑不存在".to_string());
    }

    // Try to get disk information for the drive (only if scanning root)
    let estimated_total = Arc::new(Mutex::new(0u64));
    let disks = Disks::new_with_refreshed_list();

    // Check if this is a disk root (like D:\, C:\, etc.)
    let is_disk_root = root_path.parent().is_none() || root_path.to_string_lossy().ends_with(":\\");
    let mut disk_info_result: Option<DiskInfo> = None;

    if is_disk_root {
        // Find the disk that matches this path
        for disk in &disks {
            let mount_point = disk.mount_point();
            if root_path == mount_point {
                // Use disk total space - available space as the estimated total
                let total_space = disk.total_space();
                let available_space = disk.available_space();
                let used_space = total_space.saturating_sub(available_space);
                *estimated_total.lock().unwrap() = used_space;

                disk_info_result = Some(DiskInfo {
                    total_space,
                    available_space,
                    used_space,
                });

                let _ = app_handle.emit("scan-progress", ScanProgress {
                    current_path: format!("磁碟: {} (總計: {} GB)", mount_point.display(), total_space / (1024 * 1024 * 1024)),
                    files_scanned: 0,
                    scanned_size: 0,
                    estimated_total: used_space,
                });
                break;
            }
        }
    }
    // For folders, don't estimate - just scan directly without pre-scan

    let counter = Arc::new(Mutex::new(0u64));
    let scanned_size = Arc::new(Mutex::new(0u64));
    let node = scan_dir_recursive(root_path, &app_handle, counter, scanned_size, estimated_total)?;

    Ok(ScanResult {
        node,
        disk_info: disk_info_result,
    })
}

fn scan_dir_recursive(
    path: &Path,
    app_handle: &tauri::AppHandle,
    counter: Arc<Mutex<u64>>,
    scanned_size: Arc<Mutex<u64>>,
    estimated_total: Arc<Mutex<u64>>
) -> Result<FileNode, String> {
    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();
    let path_str = path.to_string_lossy().to_string();

    // Update progress counter
    {
        let mut count = counter.lock().unwrap();
        *count += 1;

        // Emit progress event every 10 files or directories for more frequent updates
        if *count % 10 == 0 {
            let size = scanned_size.lock().unwrap();
            let total = estimated_total.lock().unwrap();
            let _ = app_handle.emit("scan-progress", ScanProgress {
                current_path: path_str.clone(),
                files_scanned: *count,
                scanned_size: *size,
                estimated_total: *total,
            });
        }
    }

    if metadata.is_file() {
        let file_size = metadata.len();
        // Add file size to total
        {
            let mut size = scanned_size.lock().unwrap();
            *size += file_size;
        }

        return Ok(FileNode {
            name,
            size: file_size,
            path: path_str,
            children: None,
            is_directory: false,
        });
    }

    // 掃描目錄
    let mut children = Vec::new();
    let mut dir_total_size = 0u64;

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Ok(child_node) = scan_dir_recursive(&entry.path(), app_handle, counter.clone(), scanned_size.clone(), estimated_total.clone()) {
                dir_total_size += child_node.size;
                children.push(child_node);
            }
        }
    }

    Ok(FileNode {
        name,
        size: dir_total_size,
        path: path_str,
        children: Some(children),
        is_directory: true,
    })
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![scan_directory])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
