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
    crate::settings_write::flag(&path, on)
}

pub fn set_on_and_tell(app: &AppHandle, on: bool) -> Result<(), String> {
    crate::settings_write::commit(
        || set_on(app, on),
        |_| {
            let _ = tauri::Emitter::emit(app, "ds-price-changed", on);
        },
    )
}

#[tauri::command]
pub fn ds_price_set(app: AppHandle, on: bool) -> Result<bool, String> {
    set_on_and_tell(&app, on)?;
    Ok(on)
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
