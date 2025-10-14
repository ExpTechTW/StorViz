// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
struct FileNode {
    name: String,
    size: u64,
    path: String,
    children: Option<Vec<FileNode>>,
    #[serde(rename = "isDirectory")]
    is_directory: bool,
}

#[tauri::command]
fn scan_directory(path: String) -> Result<FileNode, String> {
    let root_path = Path::new(&path);

    if !root_path.exists() {
        return Err("路徑不存在".to_string());
    }

    scan_dir_recursive(root_path)
}

fn scan_dir_recursive(path: &Path) -> Result<FileNode, String> {
    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();
    let path_str = path.to_string_lossy().to_string();

    if metadata.is_file() {
        return Ok(FileNode {
            name,
            size: metadata.len(),
            path: path_str,
            children: None,
            is_directory: false,
        });
    }

    // 掃描目錄
    let mut children = Vec::new();
    let mut total_size = 0u64;

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Ok(child_node) = scan_dir_recursive(&entry.path()) {
                total_size += child_node.size;
                children.push(child_node);
            }
        }
    }

    Ok(FileNode {
        name,
        size: total_size,
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
