use std::fs;

use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

const FILE: &str = "prefs.json";

pub const LANGUAGE_SYSTEM: &str = "system";

pub const DEFAULT_SKIN: &str = "evie";

pub const SIZES: &[(&str, u32, u32, u32)] = &[
    ("s", 160, 180, 196),
    ("m", 200, 220, 236),
    ("l", 260, 280, 300),
];

#[derive(Clone, serde :: Serialize, serde :: Deserialize)]
#[serde(default)]
pub struct Prefs {
    pub language: String,
    #[serde(skip_deserializing)]
    pub language_from_system: bool,
    pub time: String,
    pub size: String,
    pub skin: String,
    pub pin: String,
    pub remember_position: bool,
    pub autostart: bool,
    pub hide_from_taskbar: bool,
    pub stuck_reminder: bool,
    pub stuck_minutes: u32,
    pub volume: u32,
    pub muted: bool,
    pub sound_repeat_guard: bool,
    pub sound_repeat_seconds: u32,
    pub last_x: i32,
    pub last_y: i32,
    pub has_position: bool,
}

impl Default for Prefs {
    fn default() -> Self {
        Self {
            language: LANGUAGE_SYSTEM.into(),
            language_from_system: true,
            time: "24h".into(),
            size: "m".into(),
            skin: String::new(),
            pin: "top".into(),
            remember_position: false,
            autostart: false,
            hide_from_taskbar: false,
            stuck_reminder: true,
            stuck_minutes: 10,
            volume: 70,
            muted: false,
            sound_repeat_guard: true,
            sound_repeat_seconds: 10,
            last_x: 0,
            last_y: 0,
            has_position: false,
        }
    }
}

impl Prefs {
    fn normalize_sound_repeat(&mut self) {
        self.sound_repeat_seconds = self.sound_repeat_seconds.max(1);
    }
    fn normalize_stuck(&mut self) {
        self.stuck_minutes = self.stuck_minutes.clamp(1, 1440);
    }
    fn normalize_volume(&mut self) {
        self.volume = self.volume.min(100);
    }
    pub fn zh(&self) -> bool {
        self.language != "en"
    }
}

#[cfg(target_os = "windows")]
fn system_language() -> Option<String> {
    const MUI_LANGUAGE_NAME: u32 = 0x8;
    const MAX_MUI: usize = 256;
    #[link(name = "kernel32")]
    extern "system" {
        fn GetUserPreferredUILanguages(
            flags: u32,
            num_languages: *mut u32,
            languages: *mut u16,
            size: *mut u32,
        ) -> i32;
        fn GetUserDefaultLocaleName(locale_name: *mut u16, locale_name_count: i32) -> i32;
    }
    let mut count: u32 = 0;
    let mut size: u32 = MAX_MUI as u32;
    let mut buf = [0u16; MAX_MUI];
    let ok = unsafe {
        GetUserPreferredUILanguages(MUI_LANGUAGE_NAME, &mut count, buf.as_mut_ptr(), &mut size)
    };
    if ok != 0 && count > 0 {
        let end = buf.iter().position(|c| *c == 0).unwrap_or(buf.len());
        let first = String::from_utf16_lossy(&buf[..end]);
        if !first.trim().is_empty() {
            return Some(first);
        }
    }
    let mut buf2 = [0u16; 128];
    let len = unsafe { GetUserDefaultLocaleName(buf2.as_mut_ptr(), buf2.len() as i32) };
    if len <= 0 {
        return None;
    }
    Some(String::from_utf16_lossy(&buf2[..(len as usize - 1)]))
}

#[cfg(target_os = "macos")]
fn system_language() -> Option<String> {
    let home = std::env::var_os("HOME")?;
    let path = std::path::Path::new(&home).join("Library/Preferences/.GlobalPreferences.plist");
    let value = plist::Value::from_file(path).ok()?;
    let dict = value.as_dictionary()?;
    if let Some(first) = dict
        .get("AppleLanguages")
        .and_then(|v| v.as_array())
        .and_then(|list| list.first())
        .and_then(|v| v.as_string())
    {
        if !first.trim().is_empty() {
            return Some(first.to_string());
        }
    }
    dict.get("AppleLocale")?.as_string().map(|s| s.to_string())
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn system_language() -> Option<String> {
    std::env::var("LANG").ok()
}

fn is_chinese_language(system: Option<&str>) -> bool {
    let Some(text) = system else { return false };
    let text = text.to_ascii_lowercase();
    let tag = text.split(['-', '_']).next().unwrap_or("");
    tag == "zh"
}

fn with_language(mut prefs: Prefs, system: Option<&str>) -> Prefs {
    prefs.language_from_system = prefs.language != "zh" && prefs.language != "en";
    if prefs.language_from_system {
        prefs.language = if is_chinese_language(system) {
            "zh".into()
        } else {
            "en".into()
        };
    }
    prefs
}

fn path(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_config_dir().ok().map(|dir| dir.join(FILE))
}

fn migrate_skin(skin: &mut String) -> bool {
    let old = skin.trim().to_string();
    let new = if old.is_empty() {
        DEFAULT_SKIN.to_string()
    } else if let Some(rest) = old.strip_prefix("user:") {
        rest.to_string()
    } else {
        old.clone()
    };
    if new == *skin {
        return false;
    }
    *skin = new;
    true
}

pub fn load(app: &AppHandle) -> Prefs {
    load_from(path(app), system_language().as_deref(), |prefs| {
        let _ = save(app, prefs);
    })
}

fn load_from(file: Option<PathBuf>, system: Option<&str>, migrate: impl FnOnce(&Prefs)) -> Prefs {
    let loaded = file
        .map(|p| crate::safe_files::read_json::<Prefs>(&p))
        .unwrap_or_else(|| Ok(Prefs::default()));
    let readable = loaded.is_ok();
    let mut prefs = loaded.unwrap_or_default();
    prefs = with_language(prefs, system);
    prefs.normalize_stuck();
    prefs.normalize_volume();
    prefs.normalize_sound_repeat();
    if migrate_skin(&mut prefs.skin) && readable {
        migrate(&prefs);
    }
    prefs
}

pub fn save(app: &AppHandle, prefs: &Prefs) -> Result<(), String> {
    let p = path(app).ok_or("找不到程序设置文件夹")?;
    save_to(&p, prefs)
}

fn save_to(p: &Path, prefs: &Prefs) -> Result<(), String> {
    if let Some(dir) = p.parent() {
        fs::create_dir_all(dir).map_err(|e| format!("建不了文件夹：{e}"))?;
    }
    let mut stored = serde_json::to_value(prefs).map_err(|e| e.to_string())?;
    if let Some(fields) = stored.as_object_mut() {
        fields.remove("language_from_system");
        if prefs.language_from_system {
            fields.insert("language".into(), LANGUAGE_SYSTEM.into());
        }
    }
    let text = serde_json::to_string_pretty(&stored).map_err(|e| e.to_string())?;
    crate::safe_files::write_json::<Prefs>(p, &format!("{text}\n"))
}

fn select_language(
    next: &mut Prefs,
    previous: &Prefs,
    selected: Option<&str>,
) -> Result<(), String> {
    if let Some(language) = selected {
        if !matches!(language, "zh" | "en") {
            return Err("不认识的语言 / Unknown language".into());
        }
        next.language = language.into();
        next.language_from_system = false;
    } else {
        next.language = previous.language.clone();
        next.language_from_system = previous.language_from_system;
    }
    Ok(())
}

pub fn size_px(name: &str) -> (u32, u32, u32) {
    SIZES
        .iter()
        .find(|(id, _, _, _)| *id == name)
        .map(|(_, pet, w, h)| (*pet, *w, *h))
        .unwrap_or_else(|| {
            let (_, pet, w, h) = SIZES[1];
            (pet, w, h)
        })
}

#[derive(Clone, serde :: Serialize)]
pub struct PrefsView {
    pub prefs: Prefs,
    pub pet_px: u32,
}

#[derive(serde :: Serialize)]
pub struct ApplyFailure {
    pub field: String,
    pub error: String,
    pub unknown: bool,
}

#[derive(serde :: Serialize)]
pub struct SaveOutcome {
    pub prefs: Prefs,
    pub failures: Vec<ApplyFailure>,
}

#[derive(Default)]
pub struct SystemUnknowns(
    pub std::sync::Mutex<Vec<String>>,
    pub std::sync::Mutex<Option<Prefs>>,
);

pub fn current(app: &AppHandle) -> Prefs {
    let mut prefs = load(app);
    if let Ok(actual) = app.state::<SystemUnknowns>().1.lock() {
        if let Some(actual) = actual.as_ref() {
            prefs.size = actual.size.clone();
            prefs.pin = actual.pin.clone();
            prefs.hide_from_taskbar = actual.hide_from_taskbar;
        }
    }
    prefs
}

pub fn view_of(prefs: Prefs) -> PrefsView {
    let (pet_px, _, _) = size_px(&prefs.size);
    PrefsView { prefs, pet_px }
}

pub fn view(app: &AppHandle) -> PrefsView {
    let prefs = current(app);
    view_of(prefs)
}

#[tauri::command]
pub fn prefs_get(app: AppHandle) -> PrefsView {
    view(&app)
}

#[tauri::command]
pub fn prefs_set(
    app: AppHandle,
    mut prefs: Prefs,
    language: Option<String>,
) -> Result<SaveOutcome, String> {
    let previous = current(&app);
    select_language(&mut prefs, &previous, language.as_deref())?;
    prefs.autostart = previous.autostart;
    prefs.normalize_stuck();
    prefs.normalize_volume();
    prefs.normalize_sound_repeat();
    save(&app, &prefs)?;
    let mut result = crate::apply_prefs(&app, &prefs, &previous);
    if !result.failures.is_empty() {
        if let Err(error) = save(&app, &result.prefs) {
            result.failures.push(ApplyFailure {
                field: "prefs".into(),
                error,
                unknown: false,
            });
        }
    }
    let _ = tauri::Emitter::emit(&app, "prefs-changed", view_of(result.prefs.clone()));
    Ok(result)
}

pub fn size_from_window(width: u32, height: u32, scale: f64) -> Result<String, String> {
    if !scale.is_finite() || scale <= 0.0 {
        return Err("无法读取窗口缩放 / Window scale is unknown".into());
    }
    SIZES
        .iter()
        .find(|(_, _, w, h)| {
            (
                (*w as f64 * scale).round() as u32,
                (*h as f64 * scale).round() as u32,
            ) == (width, height)
        })
        .map(|(name, _, _, _)| name.to_string())
        .ok_or("当前窗口尺寸不属于已有档位 / Window size does not match a preset".into())
}
