use std::path::Path;

use super::DiskInfo;
use sysinfo::Disks;

pub fn info_if_root(path: &str) -> Option<DiskInfo> {
    if is_root_directory(path) {
        get_disk_info(Path::new(path))
    } else {
        None
    }
}

fn get_disk_info(path: &Path) -> Option<DiskInfo> {
    let disks = Disks::new_with_refreshed_list();

    let path_str = path.to_string_lossy();

    #[cfg(target_os = "macos")]
    {
        let mut best_match: Option<(&sysinfo::Disk, usize)> = None;

        for disk in disks.list() {
            let disk_path = disk.mount_point().to_string_lossy();

            if path_str.starts_with(&*disk_path) {
                let match_length = disk_path.len();

                if let Some((_, current_length)) = best_match {
                    if match_length > current_length {
                        best_match = Some((disk, match_length));
                    }
                } else {
                    best_match = Some((disk, match_length));
                }
            }
        }

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

                    if dp == "/"
                        || dp.starts_with("/System/Volumes/Data")
                        || dp.starts_with("/System/Volumes/Preboot")
                        || dp.starts_with("/System/Volumes/VM")
                        || dp.starts_with("/System/Volumes/Update")
                    {
                        let used = disk.total_space() - disk.available_space();
                        println!(
                            "📊 macOS partition {}: used={} GB",
                            dp,
                            used / 1024 / 1024 / 1024
                        );

                        total_used += used;

                        // Total and available are shared across all APFS volumes
                        total_space = disk.total_space();
                        total_available = disk.available_space();
                        found_any = true;
                    }
                }

                if found_any {
                    println!(
                        "✅ Total macOS disk usage: {} GB (total: {} GB, available: {} GB)",
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
                let total = matched_disk.total_space();
                let available = matched_disk.available_space();
                let used = total - available;

                println!(
                    "📊 Disk info for '{}' (mount: {}): total={} GB, available={} GB, used={} GB",
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
        for disk in disks.list() {
            let disk_path = disk.mount_point().to_string_lossy();

            if path_str.starts_with(&*disk_path) {
                let total = disk.total_space();
                let available = disk.available_space();
                let used = total - available;

                println!(
                    "💾 Disk Info for {}: total={} GB, available={} GB, used={} GB",
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

fn is_root_directory(path: &str) -> bool {
    #[cfg(unix)]
    {
        if path == "/" || path == "\\" {
            return true;
        }

        // macOS volume mount points (e.g., /Volumes/YuYu1015)
        if path.starts_with("/Volumes/") {
            let parts: Vec<&str> = path.split('/').collect();
            if parts.len() == 3
                && parts[0].is_empty()
                && parts[1] == "Volumes"
                && !parts[2].is_empty()
            {
                return true;
            }
        }

        // Linux mount points (e.g., /mnt/disk, /media/user/disk)
        if path.starts_with("/mnt/") || path.starts_with("/media/") {
            let parts: Vec<&str> = path.split('/').collect();
            if (parts.len() == 3
                && parts[0].is_empty()
                && parts[1] == "mnt"
                && !parts[2].is_empty())
                || (parts.len() == 4
                    && parts[0].is_empty()
                    && parts[1] == "media"
                    && !parts[2].is_empty()
                    && !parts[3].is_empty())
            {
                return true;
            }
        }

        false
    }

    #[cfg(windows)]
    {
        path.len() == 3 && path.ends_with(":\\")
    }

    #[cfg(not(any(unix, windows)))]
    {
        false
    }
}
