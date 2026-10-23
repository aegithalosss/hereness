use std::collections::BTreeMap;

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
    crate::settings_write::flag(&path, on)
}

pub fn folder_names(app: &AppHandle) -> BTreeMap<String, String> {
    super::folders::names(app)
}

#[tauri::command]
pub fn bubble_privacy(app: AppHandle) -> bool {
    privacy(&app)
}

#[tauri::command]
pub fn bubble_set_privacy(app: AppHandle, on: bool) -> Result<bool, String> {
    crate::settings_write::commit(
        || set_privacy(&app, on).map(|_| on),
        |on| {
            let _ = tauri::Emitter::emit(&app, "bubble-privacy-changed", on);
        },
    )
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
