use std::{collections::BTreeMap, fs, path::PathBuf, sync::Mutex};

use tauri::{AppHandle, Emitter, Manager};

#[derive(Default)]
pub struct KnownFolders(pub Mutex<History>);

#[derive(Default)]
pub struct History {
    path: PathBuf,
    names: BTreeMap<String, String>,
}

impl History {
    fn load(path: PathBuf) -> Result<Self, String> {
        let names = match fs::read_to_string(&path) {
            Ok(text) => serde_json::from_str(&text).map_err(|e| format!("项目名单读不懂：{e}"))?,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => BTreeMap::new(),
            Err(e) => return Err(format!("项目名单读不了：{e}")),
        };
        Ok(Self { path, names })
    }
    fn save(&self, names: &BTreeMap<String, String>) -> Result<(), String> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let text = serde_json::to_string_pretty(names).map_err(|e| e.to_string())?;
        let temp = self.path.with_extension("json.tmp");
        fs::write(&temp, format!("{text}\n")).map_err(|e| e.to_string())?;
        fs::rename(&temp, &self.path).map_err(|e| e.to_string())
    }
    fn scan(&mut self, paths: Vec<String>) -> Result<(), String> {
        let mut next = self.names.clone();
        for path in paths {
            let Some(key) = normalize(&path) else {
                continue;
            };
            if !next.keys().any(|p| normalize(p).as_ref() == Some(&key)) {
                next.insert(path, String::new());
            }
        }
        let legacy: Vec<_> = next
            .keys()
            .filter(|p| normalize(p).is_none())
            .cloned()
            .collect();
        for old in legacy {
            let matches: Vec<_> = next
                .keys()
                .filter(|p| normalize(p).is_some() && basename(p) == old)
                .cloned()
                .collect();
            if matches.len() == 1 {
                let nickname = next.remove(&old).unwrap();
                let target = next.get_mut(&matches[0]).unwrap();
                if target.is_empty() {
                    *target = nickname;
                }
            }
        }
        if next == self.names {
            return Ok(());
        }
        self.save(&next)?;
        self.names = next;
        Ok(())
    }
    fn forget(&mut self, name: &str) -> Result<(), String> {
        let mut next = self.names.clone();
        next.remove(name);
        self.save(&next)?;
        self.names = next;
        Ok(())
    }
    fn rename(&mut self, folder: &str, nickname: &str) -> Result<(), String> {
        if !self.names.contains_key(folder) {
            return Err("请先扫描 / Scan first".into());
        }
        let mut next = self.names.clone();
        next.insert(folder.into(), limit_nickname(nickname.trim()));
        self.save(&next)?;
        self.names = next;
        Ok(())
    }
}

fn basename(path: &str) -> &str {
    path.split(['\\', '/'])
        .filter(|s| !s.is_empty())
        .next_back()
        .unwrap_or(path)
}

fn normalize(path: &str) -> Option<String> {
    let s = path.replace('\\', "/");
    let drive = s.len() >= 3
        && s.as_bytes()[0].is_ascii_alphabetic()
        && s.as_bytes()[1] == b':'
        && s.as_bytes()[2] == b'/';
    if !s.starts_with('/') && !drive {
        return None;
    }
    let prefix_len = if drive {
        3
    } else if s.starts_with("//") {
        2
    } else {
        1
    };
    let mut parts = Vec::new();
    for part in s[prefix_len..].split('/') {
        match part {
            "" | "." => {}
            ".." => {
                parts.pop();
            }
            _ => parts.push(part),
        }
    }
    let key = format!("{}{}", &s[..prefix_len], parts.join("/"));
    Some(if drive || s.starts_with("//") {
        key.to_lowercase()
    } else {
        key
    })
}

fn limit_nickname(text: &str) -> String {
    let mut units = 0;
    text.chars()
        .take_while(|c| {
            units += if c.is_ascii() { 1 } else { 2 };
            units <= 16
        })
        .collect()
}

pub fn initialize(app: &AppHandle) -> Result<(), String> {
    let path = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("folder-names.json");
    let history = History::load(path)?;
    *app.state::<KnownFolders>()
        .0
        .lock()
        .map_err(|e| e.to_string())? = history;
    Ok(())
}

pub fn list(app: &AppHandle) -> Vec<String> {
    names(app).into_keys().collect()
}

pub fn names(app: &AppHandle) -> BTreeMap<String, String> {
    app.state::<KnownFolders>()
        .0
        .lock()
        .map(|h| h.names.clone())
        .unwrap_or_default()
}

pub fn set_name(app: &AppHandle, folder: &str, nickname: &str) -> Result<(), String> {
    app.state::<KnownFolders>()
        .0
        .lock()
        .map_err(|e| e.to_string())?
        .rename(folder, nickname)?;
    let _ = app.emit("folder-names-changed", names(app));
    Ok(())
}

#[tauri::command]
pub fn scan_folders(
    app: AppHandle,
    paths: Vec<String>,
) -> Result<BTreeMap<String, String>, String> {
    app.state::<KnownFolders>()
        .0
        .lock()
        .map_err(|e| e.to_string())?
        .scan(paths)?;
    let names = names(&app);
    let _ = app.emit("folder-names-changed", &names);
    Ok(names)
}

#[tauri::command]
pub fn forget_known_folder(app: AppHandle, folder: String) -> Result<Vec<String>, String> {
    app.state::<KnownFolders>()
        .0
        .lock()
        .map_err(|e| e.to_string())?
        .forget(&folder)?;
    let names = list(&app);
    let _ = app.emit("folder-names-changed", self::names(&app));
    Ok(names)
}
