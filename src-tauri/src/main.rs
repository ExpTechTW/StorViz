// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::sync::{Arc, Mutex};
use tauri::ipc::Channel;
use rayon::prelude::*;

// Constants
const BATCH_SIZE: usize = 10000;
const MAX_DEPTH: usize = 10;

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
}

// Helper struct for shared state
#[derive(Clone)]
struct ScanState {
    counter: Arc<Mutex<u64>>,
    scanned_size: Arc<Mutex<u64>>,
    batch_buffer: Arc<Mutex<Vec<FileNode>>>,
}

impl ScanState {
    fn new() -> Self {
        Self {
            counter: Arc::new(Mutex::new(0)),
            scanned_size: Arc::new(Mutex::new(0)),
            batch_buffer: Arc::new(Mutex::new(Vec::new())),
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
        
        if let Ok(root_node) = scan_directory_recursive(root_path, &on_batch, &state) {
            let limited_root = build_limited_depth_node(&root_node, MAX_DEPTH);
            send_final_batch(&on_batch, &state, limited_root);
        }
    });

    Ok(())
}

fn send_final_batch(channel: &Channel<PartialScanResult>, state: &ScanState, root_node: FileNode) {
    let (total_items, total_size) = state.get_stats();
    let remaining_nodes = state.clear_buffer();
    
    let payload = PartialScanResult {
        nodes: remaining_nodes,
        total_scanned: total_items,
        total_size,
        is_complete: true,
        root_node: Some(root_node),
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
) -> Result<FileNode, String> {
    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
    let path_str = path.to_string_lossy().to_string();

    state.increment_counter();

    if metadata.is_file() {
        let file_size = metadata.len();
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
        let entries_vec: Vec<_> = entries.flatten().collect();
        
        let children: Vec<FileNode> = entries_vec
            .par_iter()
            .filter_map(|entry| {
                scan_directory_recursive(&entry.path(), channel, state).ok()
            })
            .collect();

        let dir_total_size: u64 = children.iter().map(|c| c.size).sum();

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
