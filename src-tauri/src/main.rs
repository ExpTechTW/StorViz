// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// Modified to trigger recompile

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::sync::{Arc, Mutex};
use tauri::ipc::Channel;
use rayon::prelude::*;

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

#[tauri::command]
async fn scan_directory_streaming(path: String, on_batch: Channel<PartialScanResult>) -> Result<(), String> {
    println!("🔍 開始流式掃描目錄: {}", path);

    let root_path = Path::new(&path);

    if !root_path.exists() {
        println!("❌ 路徑不存在: {}", root_path.display());
        return Err("路徑不存在".to_string());
    }

    println!("🚀 開始完整掃描（流式傳輸）...");

    // Clone variables for the background task
    let path_clone = path.clone();

    // Spawn blocking task in a separate thread to avoid blocking the event loop
    std::thread::spawn(move || {
        println!("🧵 掃描線程已啟動");
        let root_path = Path::new(&path_clone);
        let counter = Arc::new(Mutex::new(0u64));
        let scanned_size = Arc::new(Mutex::new(0u64));
        let batch_buffer = Arc::new(Mutex::new(Vec::new()));
        let batch_size = 10000;

        // Scan recursively and send batches via channel
        if let Ok(root_node) = scan_dir_streaming_channel(
            root_path,
            &on_batch,
            counter.clone(),
            scanned_size.clone(),
            batch_buffer.clone(),
            batch_size
        ) {
            // Build limited depth root node (10 levels for visualization)
            let limited_root = build_limited_depth_node(&root_node, 10);

            // Send final batch if there are remaining items
            {
                let mut buffer = batch_buffer.lock().unwrap();
                let total_items = *counter.lock().unwrap();
                let total_size = *scanned_size.lock().unwrap();

                if !buffer.is_empty() {
                    println!("📤 發送最後一批: {} 個項目", buffer.len());
                    let payload = PartialScanResult {
                        nodes: buffer.clone(),
                        total_scanned: total_items,
                        total_size,
                        is_complete: true,
                        root_node: Some(limited_root.clone()),
                    };

                    // Send via channel
                    match on_batch.send(payload) {
                        Ok(_) => println!("✅ 最後一批事件發送成功"),
                        Err(e) => println!("❌ 最後一批事件發送失敗: {:?}", e),
                    }
                    buffer.clear();
                } else {
                    // Send completion message with root node even if buffer is empty
                    println!("📤 發送完成訊息（包含根節點）");
                    let payload = PartialScanResult {
                        nodes: Vec::new(),
                        total_scanned: total_items,
                        total_size,
                        is_complete: true,
                        root_node: Some(limited_root),
                    };

                    match on_batch.send(payload) {
                        Ok(_) => println!("✅ 完成訊息發送成功"),
                        Err(e) => println!("❌ 完成訊息發送失敗: {:?}", e),
                    }
                }
            }

            let total_items = *counter.lock().unwrap();
            let total_size = *scanned_size.lock().unwrap();
            println!("✅ 掃描完成！");
            println!("📊 統計資訊:");
            println!("   - 掃描項目: {} 個", total_items);
            println!("   - 總大小: {} bytes ({:.2} GB)", total_size, total_size as f64 / (1024.0 * 1024.0 * 1024.0));
        }
        println!("🧵 掃描線程已結束");
    });

    // Return immediately, scanning happens in background
    println!("✅ 背景掃描已啟動");
    Ok(())
}

fn build_limited_depth_node(node: &FileNode, max_depth: usize) -> FileNode {
    build_limited_depth_node_recursive(node, 0, max_depth)
}

fn build_limited_depth_node_recursive(node: &FileNode, current_depth: usize, max_depth: usize) -> FileNode {
    // If we've reached max depth, return node without children
    if current_depth >= max_depth {
        return FileNode {
            name: node.name.clone(),
            size: node.size,
            path: node.path.clone(),
            children: if node.is_directory {
                Some(Vec::new()) // Empty array indicates "more content available"
            } else {
                None
            },
            is_directory: node.is_directory,
        };
    }

    // Otherwise, recursively process children
    let limited_children = if let Some(children) = &node.children {
        Some(
            children
                .iter()
                .map(|child| build_limited_depth_node_recursive(child, current_depth + 1, max_depth))
                .collect()
        )
    } else {
        None
    };

    FileNode {
        name: node.name.clone(),
        size: node.size,
        path: node.path.clone(),
        children: limited_children,
        is_directory: node.is_directory,
    }
}

fn scan_dir_streaming_channel(
    path: &Path,
    channel: &Channel<PartialScanResult>,
    counter: Arc<Mutex<u64>>,
    scanned_size: Arc<Mutex<u64>>,
    batch_buffer: Arc<Mutex<Vec<FileNode>>>,
    batch_size: usize,
) -> Result<FileNode, String> {
    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();
    let path_str = path.to_string_lossy().to_string();

    // Update counter
    {
        let mut count = counter.lock().unwrap();
        *count += 1;
    }

    if metadata.is_file() {
        let file_size = metadata.len();
        {
            let mut size = scanned_size.lock().unwrap();
            *size += file_size;
        }

        let node = FileNode {
            name,
            size: file_size,
            path: path_str,
            children: None,
            is_directory: false,
        };

        // Add to batch buffer
        {
            let mut buffer = batch_buffer.lock().unwrap();
            buffer.push(node.clone());

            // Send batch if buffer is full
            if buffer.len() >= batch_size {
                let total_items = *counter.lock().unwrap();
                let total_size = *scanned_size.lock().unwrap();

                println!("📤 發送一批: {} 個項目 (總計: {} 個)", buffer.len(), total_items);
                let payload = PartialScanResult {
                    nodes: buffer.clone(),
                    total_scanned: total_items,
                    total_size,
                    is_complete: false,
                    root_node: None,
                };

                // Send via channel
                match channel.send(payload) {
                    Ok(_) => println!("✅ 批次發送成功"),
                    Err(e) => println!("❌ 批次發送失敗: {:?}", e),
                }
                buffer.clear();
            }
        }

        return Ok(node);
    }

    // 掃描目錄 - 使用並行處理加速
    if let Ok(entries) = fs::read_dir(path) {
        let entries_vec: Vec<_> = entries.flatten().collect();

        // 使用 rayon 並行處理子項目
        let children: Vec<FileNode> = entries_vec
            .par_iter()
            .filter_map(|entry| {
                scan_dir_streaming_channel(
                    &entry.path(),
                    channel,
                    counter.clone(),
                    scanned_size.clone(),
                    batch_buffer.clone(),
                    batch_size
                ).ok()
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
