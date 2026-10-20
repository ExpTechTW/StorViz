// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod scan;

use serde::Serialize;
use std::fs;
use std::path::Path;
use tauri::ipc::Channel;
use tauri_plugin_updater::UpdaterExt;

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
async fn delete_files_batch(
    paths: Vec<String>,
    on_progress: Channel<DeletionProgress>,
) -> Result<(), String> {
    let total = paths.len();

    std::thread::spawn(move || {
        let mut deleted_count = 0usize;
        let mut deleted_size = 0u64;
        let mut failed_paths = Vec::new();

        for (index, path) in paths.iter().enumerate() {
            let normalized_path = path.replace("\\", "/");
            let path_obj = Path::new(&normalized_path);
            let current_path = normalized_path.clone();

            let size_before = scan::path_disk_usage(path_obj);

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

            let deletion_result = if path_obj.is_file() {
                fs::remove_file(path_obj)
            } else if path_obj.is_dir() {
                fs::remove_dir_all(path_obj)
            } else {
                Err(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    "Not a file or directory",
                ))
            };

            match deletion_result {
                Ok(_) => {
                    deleted_count += 1;
                    deleted_size += size_before;
                    println!("✅ Deleted: {} (size: {} bytes)", current_path, size_before);
                }
                Err(e) => {
                    eprintln!("❌ Failed to delete {}: {}", current_path, e);
                    failed_paths.push(current_path);
                }
            }
        }

        let all_success = failed_paths.is_empty();
        let completion = DeletionProgress {
            current: total,
            total,
            current_path: if all_success {
                String::from("完成")
            } else {
                format!("完成 ({} 個失敗)", failed_paths.len())
            },
            success: all_success,
            completed: true,
            deleted_size: Some(deleted_size),
            deleted_count: Some(deleted_count),
        };
        let _ = on_progress.send(completion);
    });

    Ok(())
}

async fn update(app: tauri::AppHandle) -> tauri_plugin_updater::Result<()> {
    if let Some(update) = app.updater()?.check().await? {
        let mut downloaded = 0;

        update
            .download_and_install(
                |chunk_length, content_length| {
                    downloaded += chunk_length;
                    println!("downloaded {downloaded} from {content_length:?}");
                },
                || {
                    println!("download finished");
                },
            )
            .await?;

        println!("update installed");
        app.restart();
    }

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let _ = update(handle).await;
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            scan::scan_directory_streaming,
            scan::cancel_scan,
            delete_files_batch
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
