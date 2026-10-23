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

fn license_path(
    debug: bool,
    mac: bool,
    repository: &Path,
    executable: Option<&Path>,
    resources: Option<&Path>,
) -> Result<PathBuf, String> {
    let root = if debug {
        repository
    } else if mac {
        resources.ok_or("找不到应用资源目录 / App resources could not be located")?
    } else {
        executable
            .and_then(Path::parent)
            .ok_or("找不到程序目录 / App directory could not be located")?
    };
    Ok(root.join("LICENSE"))
}

fn open_license(path: &Path, open: impl FnOnce(&Path) -> Result<(), String>) -> Result<(), String> {
    if !path.is_file() {
        return Err("随包 LICENSE 不存在 / Bundled LICENSE was not found".into());
    }
    open(path)
}

#[tauri::command]
pub fn open_bundled_license(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let executable = std::env::current_exe().ok();
    let resources = app.path().resource_dir().ok();
    let repository = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .ok_or("找不到开发目录")?;
    let path = license_path(
        cfg!(debug_assertions),
        cfg!(target_os = "macos"),
        repository,
        executable.as_deref(),
        resources.as_deref(),
    )?;
    open_license(&path, |file| {
        app.opener()
            .open_path(file.to_string_lossy(), None::<&str>)
            .map_err(|e| e.to_string())
    })
}
