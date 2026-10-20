use serde::Serialize;

use std::collections::VecDeque;

use std::sync::Mutex;

pub const MAX: usize = 60;

#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct Entry {
    pub at: u64,
    pub from: String,
    pub session: Option<String>,
    pub state: String,
    pub event: Option<String>,
    pub tool: Option<String>,
}

#[derive(Default)]
pub struct SignalLog(Mutex<VecDeque<Entry>>);

impl SignalLog {
    pub fn push(&self, entry: Entry) {
        let mut list = self.0.lock().unwrap_or_else(|e| e.into_inner());
        if list.len() >= MAX {
            list.pop_front();
        }
        list.push_back(entry);
    }
    pub fn list(&self) -> Vec<Entry> {
        self.0
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .iter()
            .cloned()
            .collect()
    }
}

#[tauri::command]
pub fn recent_signals(log: tauri::State<SignalLog>) -> Vec<Entry> {
    log.list()
}

pub fn name_only(s: Option<&str>) -> Option<String> {
    let s = s?.trim();
    (!s.is_empty()
        && s.len() <= 64
        && s.bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'_' | b'-' | b'.')))
    .then(|| s.to_string())
}

pub fn short_session(id: &str) -> String {
    id.chars().take(8).collect()
}
