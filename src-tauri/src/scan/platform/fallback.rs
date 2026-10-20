//! Targets without a bulk directory API. One `read_dir` plus per-entry metadata.

use std::io;
use std::path::Path;

use super::{read_directory_std, DirBatch};

pub fn read_directory(path: &Path) -> io::Result<DirBatch> {
    read_directory_std(path)
}
