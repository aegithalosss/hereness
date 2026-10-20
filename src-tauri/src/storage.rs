use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Kind {
    Settings,
    Cache,
}

impl Kind {
    pub fn of(name: &str) -> Option<Self> {
        match name {
            "settings" => Some(Self::Settings),
            "cache" => Some(Self::Cache),
            _ => None,
        }
    }
}

pub fn dir_of(app: &AppHandle, kind: Kind) -> Option<PathBuf> {
    match kind {
        Kind::Settings => app.path().app_config_dir().ok(),
        Kind::Cache => app.path().app_local_data_dir().ok(),
    }
}

pub fn exists(dir: &Path) -> bool {
    dir.is_dir()
}

pub fn exists_pair(app: &AppHandle) -> (bool, bool) {
    let yes = |kind| dir_of(app, kind).is_some_and(|dir| exists(&dir));
    (yes(Kind::Settings), yes(Kind::Cache))
}

#[tauri::command]
pub fn open_data_folder(app: AppHandle, kind: String) -> Result<bool, String> {
    use tauri_plugin_opener::OpenerExt;
    let kind = Kind::of(&kind).ok_or("不认识的文件夹")?;
    let dir = dir_of(&app, kind).ok_or("找不到这个文件夹")?;
    if !exists(&dir) {
        return Ok(false);
    }
    app.opener()
        .open_path(dir.to_string_lossy(), None::<&str>)
        .map_err(|e| e.to_string())?;
    Ok(true)
}
