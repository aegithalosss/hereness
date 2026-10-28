use std::collections::BTreeMap;

use std::fs;

use std::path::Path;

use tauri::{AppHandle, Manager};

const CHOICES_FILE: &str = "skin-sounds.json";

pub const SOUNDS_DIR: &str = "sounds";

pub const SOUND_EXTS: &[&str] = &["mp3", "wav", "ogg"];

pub const DROPPED: &str = "dropped";

pub fn is_sound(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    SOUND_EXTS
        .iter()
        .any(|ext| lower.ends_with(&format!(".{ext}")))
}

pub fn row_ids() -> Vec<&'static str> {
    let mut rows = crate::skins::row_ids();
    rows.push(DROPPED);
    rows
}

#[derive(Clone, Debug, PartialEq, serde :: Serialize, serde :: Deserialize)]
pub struct SoundChoice {
    #[serde(rename = "type")]
    pub kind: String,
    #[serde(default)]
    pub name: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub skin: String,
}

#[derive(Clone, Debug, PartialEq, serde :: Serialize)]
pub struct Picked {
    pub source: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub name: String,
    pub files: Vec<String>,
}

fn safe_rel(name: &str) -> bool {
    !name.is_empty()
        && !name.contains("..")
        && !name.contains(':')
        && !name.starts_with(['/', '\\'])
        && !name.chars().any(|c| c.is_control())
}

pub fn scan(sounds: &Path) -> (Vec<String>, Vec<String>) {
    fn walk(
        dir: &Path,
        prefix: &str,
        files: &mut Vec<String>,
        folders: &mut Vec<String>,
        depth: u32,
    ) {
        if depth > 3 {
            return;
        }
        let Ok(entries) = fs::read_dir(dir) else {
            return;
        };
        for entry in entries.flatten() {
            let raw = entry.file_name().to_string_lossy().into_owned();
            if raw.starts_with('.') {
                continue;
            }
            let rel = if prefix.is_empty() {
                raw.clone()
            } else {
                format!("{prefix}/{raw}")
            };
            let path = entry.path();
            if path.is_dir() {
                folders.push(rel.clone());
                walk(&path, &rel, files, folders, depth + 1);
            } else if is_sound(&raw) {
                files.push(rel);
            }
        }
    }
    let (mut files, mut folders) = (Vec::new(), Vec::new());
    walk(sounds, "", &mut files, &mut folders, 0);
    files.sort();
    folders.sort();
    let mut seen = std::collections::BTreeSet::new();
    files.retain(|n| seen.insert(n.to_lowercase()));
    seen.clear();
    folders.retain(|n| seen.insert(n.to_lowercase()));
    (files, folders)
}

fn files_of(sounds: &Path, kind: &str, name: &str) -> Vec<String> {
    let name = name.trim_end_matches('/');
    if !safe_rel(name) {
        return vec![];
    }
    let Some(actual) = crate::skins::case_path(sounds, name) else {
        return vec![];
    };
    let name = actual.as_str();
    let prefix = sounds.file_name().unwrap_or_default().to_string_lossy();
    let path = sounds.join(name);
    match kind {
        "file" => {
            if path.is_file() && is_sound(name) {
                vec![format!("{prefix}/{name}")]
            } else {
                vec![]
            }
        }
        "folder" => {
            let mut list: Vec<String> = fs::read_dir(&path)
                .map(|entries| {
                    entries
                        .flatten()
                        .filter(|e| e.path().is_file())
                        .map(|e| e.file_name().to_string_lossy().into_owned())
                        .filter(|n| !n.starts_with('.') && is_sound(n))
                        .map(|n| format!("{prefix}/{name}/{n}"))
                        .collect()
                })
                .unwrap_or_default();
            list.sort();
            let mut seen = std::collections::BTreeSet::new();
            list.retain(|n| seen.insert(n.to_lowercase()));
            list
        }
        _ => vec![],
    }
}

pub fn skin_defaults(skin_json: Option<&str>) -> BTreeMap<String, String> {
    let json: serde_json::Value = skin_json
        .and_then(|t| serde_json::from_str(t).ok())
        .unwrap_or(serde_json::Value::Null);
    json.get("sounds")
        .and_then(|s| s.as_object())
        .map(|o| {
            o.iter()
                .filter_map(|(row, v)| v.as_str().map(|s| (row.clone(), s.trim().to_string())))
                .filter(|(_, s)| !s.is_empty())
                .collect()
        })
        .unwrap_or_default()
}

pub fn pick(sounds: &Path, user: Option<&SoundChoice>, skin_default: Option<&str>) -> Picked {
    if let Some(c) = user {
        if c.kind == "none" {
            return Picked {
                source: "user".into(),
                kind: "none".into(),
                name: String::new(),
                files: vec![],
            };
        }
        let requested = c.name.trim_end_matches('/');
        let name =
            crate::skins::case_path(sounds, requested).unwrap_or_else(|| requested.to_string());
        return Picked {
            source: "user".into(),
            kind: c.kind.clone(),
            files: files_of(sounds, &c.kind, &name),
            name,
        };
    }
    if let Some(d) = skin_default {
        let requested = d.trim_end_matches('/');
        let name =
            crate::skins::case_path(sounds, requested).unwrap_or_else(|| requested.to_string());
        let kind = if d.ends_with('/') || (safe_rel(&name) && sounds.join(&name).is_dir()) {
            "folder"
        } else {
            "file"
        };
        return Picked {
            source: "skin".into(),
            kind: kind.into(),
            files: files_of(sounds, kind, &name),
            name,
        };
    }
    Picked {
        source: String::new(),
        kind: "none".into(),
        name: String::new(),
        files: vec![],
    }
}

fn raw_choices(app: &AppHandle) -> BTreeMap<String, SoundChoice> {
    choices_path(app)
        .and_then(|p| crate::safe_files::read_json(&p).ok())
        .unwrap_or_default()
}

pub fn validate_storage(app: &AppHandle) {
    let _ = raw_choices(app);
}

fn choices_path(app: &AppHandle) -> Option<std::path::PathBuf> {
    app.path()
        .app_config_dir()
        .ok()
        .map(|dir| dir.join(CHOICES_FILE))
}

pub fn picked_rows(
    root: &Path,
    skin: &str,
    all: &BTreeMap<String, SoundChoice>,
) -> BTreeMap<String, Picked> {
    let dir = root.join(skin);
    let sounds =
        dir.join(crate::skins::case_path(&dir, SOUNDS_DIR).unwrap_or_else(|| SOUNDS_DIR.into()));
    let defaults = skin_defaults(
        fs::read_to_string(dir.join(crate::skins::SKIN_JSON))
            .ok()
            .as_deref(),
    );
    row_ids()
        .into_iter()
        .map(|row| {
            let user = all
                .get(&format!("{skin}|{row}"))
                .filter(|c| !skin.is_empty() && c.skin == skin);
            (
                row.to_string(),
                pick(&sounds, user, defaults.get(row).map(String::as_str)),
            )
        })
        .collect()
}

fn clean_skin(skin: &str) -> Option<String> {
    let s = skin.trim();
    (!s.is_empty() && !s.contains(['/', '\\']) && !s.starts_with('.')).then(|| s.to_string())
}

fn skin_or_saved(app: &AppHandle, folder: Option<String>) -> String {
    folder
        .as_deref()
        .and_then(clean_skin)
        .unwrap_or_else(|| crate::prefs::load(app).skin)
}

#[derive(serde :: Serialize)]
pub struct SoundRow {
    pub id: String,
    #[serde(flatten)]
    pub picked: Picked,
}

#[derive(serde :: Serialize)]
pub struct SoundPanel {
    pub rows: Vec<SoundRow>,
    pub files: Vec<String>,
    pub folders: Vec<String>,
}

#[tauri::command]
pub fn skin_sound_rows(app: AppHandle, folder: Option<String>) -> SoundPanel {
    let skin = skin_or_saved(&app, folder);
    let Some(root) = crate::skins::skins_dir(&app) else {
        return SoundPanel {
            rows: vec![],
            files: vec![],
            folders: vec![],
        };
    };
    let mut picked = picked_rows(&root, &skin, &raw_choices(&app));
    let dir = root.join(&skin);
    let (files, folders) = scan(
        &dir.join(crate::skins::case_path(&dir, SOUNDS_DIR).unwrap_or_else(|| SOUNDS_DIR.into())),
    );
    let rows = row_ids()
        .into_iter()
        .filter_map(|id| {
            picked.remove(id).map(|p| SoundRow {
                id: id.to_string(),
                picked: p,
            })
        })
        .collect();
    SoundPanel {
        rows,
        files,
        folders,
    }
}

#[tauri::command]
pub fn skin_sounds(app: AppHandle, folder: Option<String>) -> BTreeMap<String, Vec<String>> {
    let skin = skin_or_saved(&app, folder);
    let Some(root) = crate::skins::skins_dir(&app) else {
        return BTreeMap::new();
    };
    audible(
        picked_rows(&root, &skin, &raw_choices(&app)),
        &crate::skins::rows_off_for(&app, &skin),
    )
}

fn audible(
    rows: BTreeMap<String, Picked>,
    off: &std::collections::BTreeSet<String>,
) -> BTreeMap<String, Vec<String>> {
    rows.into_iter()
        .filter(|(row, p)| !p.files.is_empty() && !off.contains(row))
        .map(|(row, p)| (row, p.files))
        .collect()
}

#[tauri::command]
pub fn skin_sound_choice(
    app: AppHandle,
    row: String,
    skin: String,
    choice: Option<SoundChoice>,
) -> Result<(), String> {
    let skin = clean_skin(&skin).ok_or("皮肤名不对")?;
    if !row_ids().contains(&row.as_str()) {
        return Err("没有这一行".into());
    }
    let mut all = raw_choices(&app);
    let key = format!("{skin}|{row}");
    match choice {
        Some(mut c) => {
            if !matches!(c.kind.as_str(), "file" | "folder" | "none")
                || (c.kind != "none" && !safe_rel(&c.name))
            {
                return Err("选的东西不对".into());
            }
            c.skin = skin;
            all.insert(key, c);
        }
        None => {
            all.remove(&key);
        }
    }
    save_choices(&app, &all)
}

#[tauri::command]
pub fn skin_sound_reset(app: AppHandle, skin: String) -> Result<(), String> {
    let skin = clean_skin(&skin).ok_or("皮肤名不对")?;
    crate::skins::check_rows_off(&app)?;
    let mut all = raw_choices(&app);
    let prefix = format!("{skin}|");
    all.retain(|key, _| !key.starts_with(&prefix));
    save_choices(&app, &all)?;
    crate::skins::clear_rows_off(&app, &skin)
}

fn save_choices(app: &AppHandle, all: &BTreeMap<String, SoundChoice>) -> Result<(), String> {
    let path = choices_path(app).ok_or("找不到程序设置文件夹")?;
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| format!("建不了文件夹：{e}"))?;
    }
    let text = serde_json::to_string_pretty(all).map_err(|e| e.to_string())?;
    crate::safe_files::write_json::<BTreeMap<String, SoundChoice>>(&path, &format!("{text}\n"))?;
    let _ = tauri::Emitter::emit(app, "sounds-changed", ());
    Ok(())
}
