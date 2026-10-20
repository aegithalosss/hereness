use std::collections::BTreeMap;

use std::fs;

use std::path::PathBuf;

use tauri::{AppHandle, Manager};

const PRIVACY_FILE: &str = "bubble-privacy";

fn config_path(app: &AppHandle, file: &str) -> Option<PathBuf> {
    app.path().app_config_dir().ok().map(|dir| dir.join(file))
}

pub fn privacy(app: &AppHandle) -> bool {
    config_path(app, PRIVACY_FILE)
        .map(|p| p.exists())
        .unwrap_or(false)
}

pub fn set_privacy(app: &AppHandle, on: bool) -> Result<(), String> {
    let path = config_path(app, PRIVACY_FILE).ok_or("找不到程序设置文件夹")?;
    if on {
        if let Some(dir) = path.parent() {
            fs::create_dir_all(dir).map_err(|e| format!("建不了文件夹：{e}"))?;
        }
        fs::write(&path, "").map_err(|e| format!("记不住开关：{e}"))
    } else {
        match fs::remove_file(&path) {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(format!("记不住开关：{e}")),
        }
    }
}

pub fn folder_names(app: &AppHandle) -> BTreeMap<String, String> {
    super::folders::names(app)
}

#[tauri::command]
pub fn bubble_privacy(app: AppHandle) -> bool {
    privacy(&app)
}

#[tauri::command]
pub fn bubble_set_privacy(app: AppHandle, on: bool) -> bool {
    let _ = set_privacy(&app, on);
    let _ = tauri::Emitter::emit(&app, "bubble-privacy-changed", on);
    on
}

#[tauri::command]
pub fn bubble_folder_names(app: AppHandle) -> BTreeMap<String, String> {
    folder_names(&app)
}

#[tauri::command]
pub fn bubble_set_folder_name(
    app: AppHandle,
    folder: String,
    nickname: String,
) -> Result<(), String> {
    super::folders::set_name(&app, &folder, &nickname)
}
