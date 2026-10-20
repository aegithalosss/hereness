use std::collections::BTreeMap;

use std::fs;

use std::path::{Path, PathBuf};

use std::sync::Mutex;

use tauri::{AppHandle, Emitter, Manager};

pub const DEFAULT: &str = "DeskPetOfficialStatus";

#[allow(dead_code)]
pub const OFF: &str = "off";

pub const STATUS_DIR: &str = "status";

const FLAG_FILE: &str = "status";

const OLD_FLAG_FILE: &str = "voice";

#[derive(Clone, serde :: Serialize, serde :: Deserialize)]
pub struct StatusItem {
    pub id: String,
    pub name: String,
}

#[derive(Default)]
pub struct StatusList(pub Mutex<Vec<StatusItem>>);

impl StatusList {
    pub fn snapshot(&self) -> Vec<StatusItem> {
        self.0.lock().map(|l| l.clone()).unwrap_or_default()
    }
}

#[derive(Clone, serde :: Serialize)]
pub struct StatusFile {
    pub id: String,
    pub zh: String,
    pub en: String,
}

#[allow(dead_code)]
fn status_next_to_exe(exe: &Path) -> Option<PathBuf> {
    exe.parent().map(|dir| dir.join(STATUS_DIR))
}

pub fn status_dir(app: &AppHandle) -> Option<PathBuf> {
    #[cfg(debug_assertions)]
    {
        let _ = app;
        let project_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()?
            .to_path_buf();
        return Some(project_root.join(STATUS_DIR));
    }
    #[cfg(all(target_os = "macos", not(debug_assertions)))]
    {
        let _ = app;
        return app
            .path()
            .app_config_dir()
            .ok()
            .map(|dir| dir.join(STATUS_DIR));
    }
    #[cfg(all(not(target_os = "macos"), not(debug_assertions)))]
    {
        let _ = app;
        status_next_to_exe(&std::env::current_exe().ok()?)
    }
}

pub fn read_all(dir: &Path) -> Vec<StatusFile> {
    let mut map: BTreeMap<String, (String, String)> = BTreeMap::new();
    let Ok(entries) = fs::read_dir(dir) else {
        return vec![];
    };
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') || !name.to_ascii_lowercase().ends_with(".txt") {
            continue;
        }
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let stem = &name[..name.len() - 4];
        let (id, is_en) = if stem.to_ascii_lowercase().ends_with(".en") {
            (stem[..stem.len() - 3].to_string(), true)
        } else {
            (stem.to_string(), false)
        };
        if id.is_empty() {
            continue;
        }
        let text = fs::read_to_string(&path).unwrap_or_default();
        let slot = map.entry(id).or_default();
        if is_en {
            slot.1 = text;
        } else {
            slot.0 = text;
        }
    }
    map.into_iter()
        .map(|(id, (zh, en))| StatusFile { id, zh, en })
        .collect()
}

fn flag_path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_config_dir()
        .ok()
        .map(|dir| dir.join(FLAG_FILE))
}

fn pick_flag(new: Option<String>, old: Option<String>) -> Option<String> {
    [new, old]
        .into_iter()
        .flatten()
        .map(|s| s.trim().to_string())
        .find(|s| !s.is_empty())
}

fn read_flag(app: &AppHandle) -> Option<String> {
    let dir = app.path().app_config_dir().ok()?;
    let read = |name: &str| fs::read_to_string(dir.join(name)).ok();
    pick_flag(read(FLAG_FILE), read(OLD_FLAG_FILE))
}

pub fn current(app: &AppHandle) -> String {
    read_flag(app).unwrap_or_else(|| DEFAULT.to_string())
}

pub fn set_current(app: &AppHandle, id: &str) -> Result<(), String> {
    let path = flag_path(app).ok_or("找不到程序设置文件夹")?;
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| format!("建不了文件夹：{e}"))?;
    }
    fs::write(&path, format!("{id}\n")).map_err(|e| format!("记不住选择：{e}"))
}

pub fn choose(app: &AppHandle, id: &str) -> Result<(), String> {
    let saved = set_current(app, id);
    let _ = app.emit("status-changed", id);
    saved
}

#[tauri::command]
pub fn set_statuses(state: tauri::State<StatusList>, items: Vec<StatusItem>) {
    if let Ok(mut list) = state.0.lock() {
        *list = items;
    }
}

#[tauri::command]
pub fn status_list(state: tauri::State<StatusList>) -> Vec<StatusItem> {
    state.snapshot()
}

#[tauri::command]
pub fn status_get(app: AppHandle) -> String {
    let id = current(&app);
    #[cfg(debug_assertions)]
    println!(
        "[pet] status_get → {id}（记号文件：{:?}，旧名字 {:?} 也认）",
        flag_path(&app),
        app.path()
            .app_config_dir()
            .ok()
            .map(|d| d.join(OLD_FLAG_FILE))
    );
    id
}

#[tauri::command]
pub fn status_set(app: AppHandle, id: String) -> Result<(), String> {
    choose(&app, &id)
}

#[tauri::command]
pub fn open_status_folder(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let dir = status_dir(&app).ok_or("找不到程序设置文件夹")?;
    fs::create_dir_all(&dir).map_err(|e| format!("建不了文件夹：{e}"))?;
    app.opener()
        .open_path(dir.to_string_lossy(), None::<&str>)
        .map_err(|e| e.to_string())
}

#[allow(dead_code)]
pub fn copy_missing_statuses(from: &Path, to: &Path) -> usize {
    let Ok(entries) = fs::read_dir(from) else {
        return 0;
    };
    let mut names: Vec<String> = entries
        .flatten()
        .filter(|e| e.path().is_file())
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .filter(|name| !name.starts_with('.') && name.to_ascii_lowercase().ends_with(".txt"))
        .collect();
    names.sort();
    if names.is_empty() {
        return 0;
    }
    if fs::create_dir_all(to).is_err() {
        return 0;
    }
    let mut copied = 0;
    for name in names {
        let dst = to.join(&name);
        if dst.exists() {
            continue;
        }
        if fs::copy(from.join(&name), &dst).is_ok() {
            copied += 1;
        }
    }
    copied
}
