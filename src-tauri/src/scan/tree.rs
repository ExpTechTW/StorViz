//! Flat directory tree.
//!
//! Nodes live in one `Vec`. Children are a contiguous range in a side table of
//! indexes, so a directory does not allocate its own child `Vec`. File names
//! are bytes in one string arena.

use std::collections::HashMap;

pub const DIR_FLAG: u32 = 1;

#[derive(Clone, Copy)]
struct Node {
    name_off: u32,
    name_len: u32,
    size: u64,
    child_off: u32,
    child_len: u32,
    flags: u32,
}

#[derive(Clone)]
pub struct Tree {
    names: String,
    nodes: Vec<Node>,
    kids: Vec<u32>,
    pub root: u32,
}

impl Tree {
    pub fn new() -> Self {
        Self {
            names: String::new(),
            nodes: Vec::new(),
            kids: Vec::new(),
            root: 0,
        }
    }

    pub fn add_leaf(&mut self, name: &[u8], size: u64) -> u32 {
        self.push(name, size, &[], 0)
    }

    pub fn add_dir(&mut self, name: &[u8], size: u64, kids: &[u32]) -> u32 {
        self.push(name, size, kids, DIR_FLAG)
    }

    pub fn is_dir(&self, id: u32) -> bool {
        self.nodes[id as usize].flags & DIR_FLAG != 0
    }

    pub fn size_of(&self, id: u32) -> u64 {
        self.nodes[id as usize].size
    }

    pub fn sum(&self, ids: &[u32]) -> u64 {
        ids.iter()
            .fold(0u64, |total, id| total.saturating_add(self.size_of(*id)))
    }

    pub fn name(&self, id: u32) -> &str {
        let node = &self.nodes[id as usize];
        let start = node.name_off as usize;
        let end = start + node.name_len as usize;
        &self.names[start..end]
    }

    pub fn children(&self, id: u32) -> &[u32] {
        let node = &self.nodes[id as usize];
        let start = node.child_off as usize;
        let end = start + node.child_len as usize;
        &self.kids[start..end]
    }

    /// Move `other` onto the end of this tree. Node indexes inside `other`
    /// stay valid relative to each other. Returns the new index of its root.
    pub fn absorb(&mut self, other: Tree) -> u32 {
        let name_base = self.names.len() as u32;
        let node_base = self.nodes.len() as u32;
        let kid_base = self.kids.len() as u32;
        self.names.push_str(&other.names);
        self.kids
            .extend(other.kids.into_iter().map(|index| index + node_base));
        for node in other.nodes {
            self.nodes.push(Node {
                name_off: node.name_off + name_base,
                name_len: node.name_len,
                size: node.size,
                child_off: node.child_off + kid_base,
                child_len: node.child_len,
                flags: node.flags,
            });
        }
        other.root + node_base
    }

    pub fn append_packed(&self, id: u32, pack: &mut PackedForest) {
        let mut order = Vec::new();
        let mut stack = vec![id];
        let mut seen = HashMap::new();
        while let Some(current) = stack.pop() {
            if seen.insert(current, 0).is_some() {
                continue;
            }
            order.push(current);
            for child in self.children(current).iter().rev() {
                stack.push(*child);
            }
        }

        let base = pack.n.len() as u32;
        for (offset, node_id) in order.iter().enumerate() {
            seen.insert(*node_id, base + offset as u32);
        }

        for node_id in &order {
            let node = &self.nodes[*node_id as usize];
            let child_off = pack.k.len() as u32;
            for child in self.children(*node_id) {
                pack.k.push(seen[child]);
            }
            pack.n.push(self.name(*node_id).to_string());
            pack.s.push(node.size);
            pack.m
                .extend_from_slice(&[child_off, node.child_len, node.flags]);
        }
        pack.r.push(seen[&id]);
    }

    fn push(&mut self, name: &[u8], size: u64, kids: &[u32], flags: u32) -> u32 {
        let (name_off, name_len) = self.intern(name);
        let child_off = self.kids.len() as u32;
        self.kids.extend_from_slice(kids);
        let id = self.nodes.len() as u32;
        self.nodes.push(Node {
            name_off,
            name_len,
            size,
            child_off,
            child_len: kids.len() as u32,
            flags,
        });
        id
    }

    fn intern(&mut self, name: &[u8]) -> (u32, u32) {
        let off = self.names.len() as u32;
        match std::str::from_utf8(name) {
            Ok(text) => self.names.push_str(text),
            Err(_) => self.names.push_str(&String::from_utf8_lossy(name)),
        }
        (off, self.names.len() as u32 - off)
    }
}

/// One JSON object for many nodes. `n[i]` is the name, `s[i]` the size.
/// `m` repeats `child_off, child_count, flags` per node (`flags & 1` is a directory).
/// `k` holds child indexes. `r` lists roots of this batch in emit order.
#[derive(Clone, serde::Serialize)]
pub struct PackedForest {
    pub n: Vec<String>,
    pub s: Vec<u64>,
    pub m: Vec<u32>,
    pub k: Vec<u32>,
    pub r: Vec<u32>,
}

impl Default for PackedForest {
    fn default() -> Self {
        Self::new()
    }
}

impl PackedForest {
    pub fn new() -> Self {
        Self {
            n: Vec::new(),
            s: Vec::new(),
            m: Vec::new(),
            k: Vec::new(),
            r: Vec::new(),
        }
    }

    pub fn is_empty(&self) -> bool {
        self.r.is_empty()
    }

    pub fn root_count(&self) -> usize {
        self.r.len()
    }
}
