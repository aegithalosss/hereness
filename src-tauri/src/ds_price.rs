use std::fs;

use std::path::PathBuf;

use tauri::{AppHandle, Manager};

const FLAG_FILE: &str = "ds-price-on";

fn flag_path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_config_dir()
        .ok()
        .map(|dir| dir.join(FLAG_FILE))
}

pub fn is_on(app: &AppHandle) -> bool {
    flag_path(app).map(|p| p.exists()).unwrap_or(false)
}

pub fn set_on(app: &AppHandle, on: bool) -> Result<(), String> {
    let path = flag_path(app).ok_or("找不到程序设置文件夹")?;
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

pub fn set_on_and_tell(app: &AppHandle, on: bool) -> Result<(), String> {
    set_on(app, on)?;
    let _ = tauri::Emitter::emit(app, "ds-price-changed", on);
    Ok(())
}

#[tauri::command]
pub fn ds_price_set(app: AppHandle, on: bool) -> bool {
    let _ = set_on_and_tell(&app, on);
    on
}

#[tauri::command]
pub fn ds_price_on(app: AppHandle) -> bool {
    let on = is_on(&app);
    #[cfg(debug_assertions)]
    println!(
        "[pet] ds_price_on → {on}（记号文件：{:?}）",
        flag_path(&app)
    );
    on
}
