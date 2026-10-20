use std::collections::BTreeMap;

use std::fs;

use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

const OVERRIDES_FILE: &str = "skin-overrides.json";

pub const SKINS_DIR: &str = "skins";

pub const SKIN_JSON: &str = "skin.json";

const RIG_DIR: &str = "idle_rig";

const EFFECT_NAMES: &[&str] = &["vfx_grab_shadow", "vfx_thinking_loading"];

fn choice_path(dir: &Path, name: &str) -> String {
    case_path(dir, name).unwrap_or_else(|| name.to_lowercase())
}

pub(crate) fn case_path(dir: &Path, rel: &str) -> Option<String> {
    let mut path = dir.to_path_buf();
    let mut parts = Vec::new();
    for part in rel.split('/') {
        if part.is_empty() || part == "." || part == ".." || part.contains(['\\', ':']) {
            return None;
        }
        let matches: Vec<String> = fs::read_dir(&path)
            .ok()?
            .flatten()
            .map(|e| e.file_name().to_string_lossy().into_owned())
            .collect();
        let actual = case_match(matches, part)?;
        path.push(&actual);
        parts.push(actual);
    }
    Some(parts.join("/"))
}

fn case_match(mut names: Vec<String>, requested: &str) -> Option<String> {
    names.sort();
    names
        .into_iter()
        .find(|n| n.to_lowercase() == requested.to_lowercase())
}

const DEFAULT_PIVOT_PCT: (f64, f64) = (200.0 / 400.0, 325.0 / 400.0);

#[derive(Clone, serde :: Serialize, serde :: Deserialize)]
pub struct Choice {
    #[serde(rename = "type")]
    pub kind: String,
    pub name: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub skin: String,
}

#[derive(Clone, serde :: Serialize)]
pub struct Resolved {
    #[serde(rename = "type")]
    pub kind: String,
    pub name: String,
    pub files: Vec<String>,
}

#[allow(dead_code)]
fn skins_next_to_exe(exe: &std::path::Path) -> Option<PathBuf> {
    exe.parent().map(|dir| dir.join(SKINS_DIR))
}

pub fn skins_dir(app: &AppHandle) -> Option<PathBuf> {
    #[cfg(debug_assertions)]
    {
        let _ = app;
        let project_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()?
            .to_path_buf();
        return Some(project_root.join(SKINS_DIR));
    }
    #[cfg(all(target_os = "macos", not(debug_assertions)))]
    {
        let _ = app;
        return app
            .path()
            .app_config_dir()
            .ok()
            .map(|dir| dir.join(SKINS_DIR));
    }
    #[cfg(all(not(target_os = "macos"), not(debug_assertions)))]
    {
        let _ = app;
        skins_next_to_exe(&std::env::current_exe().ok()?)
    }
}

fn overrides_path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_config_dir()
        .ok()
        .map(|dir| dir.join(OVERRIDES_FILE))
}

fn raw_overrides(app: &AppHandle) -> BTreeMap<String, Choice> {
    overrides_path(app)
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|t| serde_json::from_str(&t).ok())
        .unwrap_or_default()
}

fn key_of(skin: &str, row: &str) -> String {
    format!("{skin}|{row}")
}

fn row_of_key(key: &str) -> &str {
    key.split_once('|').map(|(_, row)| row).unwrap_or(key)
}

fn files_of(app: &AppHandle, skin: &str, choice: &Choice) -> Vec<String> {
    let Some(root) = skins_dir(app) else {
        return vec![];
    };
    let dir = root.join(skin);
    files_of_in(&dir, choice)
}

fn files_of_in(dir: &Path, choice: &Choice) -> Vec<String> {
    let name = choice_path(dir, &choice.name);
    if choice.kind == "file" {
        let path = dir.join(&name);
        return if path.is_file() { vec![name] } else { vec![] };
    }
    folder_pngs(&dir.join(&name))
        .into_iter()
        .map(|n| format!("{name}/{n}"))
        .collect()
}

fn folder_pngs(folder: &Path) -> Vec<String> {
    let mut files: Vec<String> = match fs::read_dir(folder) {
        Ok(entries) => entries
            .flatten()
            .map(|e| e.path())
            .filter(|p| p.is_file() && p.extension().is_some_and(|x| x.eq_ignore_ascii_case("png")))
            .filter_map(|p| p.file_name().map(|n| n.to_string_lossy().into_owned()))
            .collect(),
        Err(_) => vec![],
    };
    files.sort();
    let mut seen = std::collections::BTreeSet::new();
    files.retain(|n| seen.insert(n.to_lowercase()));
    files
}

fn resolved_for(app: &AppHandle, skin: &str) -> BTreeMap<String, Resolved> {
    raw_overrides(app)
        .into_iter()
        .filter(|(_, c)| !skin.is_empty() && c.skin == skin)
        .filter_map(|(key, choice)| {
            let row = row_of_key(&key).to_string();
            let files = files_of(app, skin, &choice);
            (!files.is_empty()).then(|| {
                (
                    row,
                    Resolved {
                        kind: choice.kind,
                        name: choice.name,
                        files,
                    },
                )
            })
        })
        .collect()
}

pub fn resolved(app: &AppHandle) -> BTreeMap<String, Resolved> {
    resolved_for(app, &crate::prefs::load(app).skin)
}

struct RowSpec {
    id: &'static str,
    name: &'static str,
    bases: &'static [&'static str],
    fallback: &'static [(&'static str, &'static str)],
}

fn candidates_of(row: &RowSpec) -> Vec<&'static str> {
    let mut list = vec![row.name];
    for base in row.bases {
        if !list.contains(base) {
            list.push(base);
        }
    }
    list
}

const ROWS: &[RowSpec] = &[
    RowSpec {
        id: "idle",
        name: "idle",
        bases: &["idle"],
        fallback: &[],
    },
    RowSpec {
        id: "prompt",
        name: "onit",
        bases: &["onit"],
        fallback: &[("onit", "thinking"), ("thinking", "idle")],
    },
    RowSpec {
        id: "thinking",
        name: "thinking",
        bases: &["thinking"],
        fallback: &[("thinking", "idle")],
    },
    RowSpec {
        id: "crosseye",
        name: "overthinking",
        bases: &["overthinking"],
        fallback: &[],
    },
    RowSpec {
        id: "reading",
        name: "reading",
        bases: &["reading"],
        fallback: &[("reading", "typing"), ("typing", "idle")],
    },
    RowSpec {
        id: "typing",
        name: "typing",
        bases: &["typing"],
        fallback: &[("typing", "idle")],
    },
    RowSpec {
        id: "bash",
        name: "running",
        bases: &["running"],
        fallback: &[("running", "typing"), ("typing", "idle")],
    },
    RowSpec {
        id: "notify",
        name: "notify",
        bases: &["notify"],
        fallback: &[("notify", "idle")],
    },
    RowSpec {
        id: "error",
        name: "error",
        bases: &["error"],
        fallback: &[("error", "thinking"), ("thinking", "idle")],
    },
    RowSpec {
        id: "poke",
        name: "poked",
        bases: &["poked"],
        fallback: &[("poked", "idle")],
    },
    RowSpec {
        id: "look",
        name: "bored",
        bases: &["bored"],
        fallback: &[("bored", "idle")],
    },
    RowSpec {
        id: "yawn",
        name: "yawn",
        bases: &["yawn"],
        fallback: &[],
    },
    RowSpec {
        id: "wake",
        name: "wake",
        bases: &["wake"],
        fallback: &[("wake", "poked"), ("poked", "idle")],
    },
    RowSpec {
        id: "lifted",
        name: "grab",
        bases: &["grab"],
        fallback: &[],
    },
    RowSpec {
        id: "done",
        name: "done",
        bases: &["done"],
        fallback: &[("done", "idle")],
    },
    RowSpec {
        id: "angry",
        name: "angry",
        bases: &["angry"],
        fallback: &[
            ("angry", "error"),
            ("error", "thinking"),
            ("thinking", "idle"),
        ],
    },
    RowSpec {
        id: "sleep",
        name: "sleep",
        bases: &["sleep"],
        fallback: &[("sleep", "idle")],
    },
];

pub fn row_ids() -> Vec<&'static str> {
    ROWS.iter().map(|r| r.id).collect()
}

#[derive(Clone, serde :: Serialize, Debug)]
pub struct RowInfo {
    pub id: String,
    pub status: String,
    pub kind: String,
    pub display: String,
    pub missing_label: String,
    pub fallback_value: String,
    pub used: Vec<String>,
    pub chosen: String,
    pub files: Vec<String>,
    pub folders: Vec<String>,
    pub skippable: bool,
    pub enabled: bool,
}

const ROWS_OFF_FILE: &str = "skin-rows-off.json";

pub fn is_skippable(row: &str) -> bool {
    const SWITCHABLE: &[&str] = &["crosseye", "yawn", "lifted", "wake", "look"];
    SWITCHABLE.contains(&row) && ROWS.iter().any(|r| r.id == row)
}

fn rows_off_path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_config_dir()
        .ok()
        .map(|dir| dir.join(ROWS_OFF_FILE))
}

fn raw_rows_off(app: &AppHandle) -> BTreeMap<String, Vec<String>> {
    rows_off_path(app)
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|t| serde_json::from_str(&t).ok())
        .unwrap_or_default()
}

fn off_rows_of(
    all: &BTreeMap<String, Vec<String>>,
    skin: &str,
) -> std::collections::BTreeSet<String> {
    all.get(skin)
        .map(|rows| rows.iter().filter(|r| is_skippable(r)).cloned().collect())
        .unwrap_or_default()
}

fn set_row_off(
    all: &mut BTreeMap<String, Vec<String>>,
    skin: &str,
    row: &str,
    off: bool,
) -> Result<(), String> {
    if !is_skippable(row) {
        return Err("这一行不能关".into());
    }
    let list = all.entry(skin.to_string()).or_default();
    list.retain(|r| r != row);
    if off {
        list.push(row.to_string());
        list.sort();
    }
    if list.is_empty() {
        all.remove(skin);
    }
    Ok(())
}

pub fn rows_off_for(app: &AppHandle, skin: &str) -> std::collections::BTreeSet<String> {
    off_rows_of(&raw_rows_off(app), skin)
}

fn save_rows_off(app: &AppHandle, all: &BTreeMap<String, Vec<String>>) -> Result<(), String> {
    let path = rows_off_path(app).ok_or("找不到程序设置文件夹")?;
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| format!("建不了文件夹：{e}"))?;
    }
    let text = serde_json::to_string_pretty(all).map_err(|e| e.to_string())?;
    fs::write(&path, format!("{text}\n")).map_err(|e| format!("记不住开关：{e}"))?;
    let _ = tauri::Emitter::emit(app, "skins-changed", resolved(app));
    let _ = tauri::Emitter::emit(app, "sounds-changed", ());
    Ok(())
}

pub fn clear_rows_off(app: &AppHandle, skin: &str) -> Result<(), String> {
    let mut all = raw_rows_off(app);
    if all.remove(skin).is_none() {
        return Ok(());
    }
    save_rows_off(app, &all)
}

#[tauri::command]
pub fn skin_row_enabled(
    app: AppHandle,
    row: String,
    skin: String,
    enabled: bool,
) -> Result<(), String> {
    let skin = skin.trim().to_string();
    if skin.is_empty() || skin.contains(['/', '\\']) || skin.starts_with('.') {
        return Err("皮肤名不对".into());
    }
    let mut all = raw_rows_off(&app);
    set_row_off(&mut all, &skin, &row, !enabled)?;
    save_rows_off(&app, &all)
}

#[tauri::command]
pub fn skin_rows_off(app: AppHandle, folder: Option<String>) -> Vec<String> {
    let skin = folder
        .map(|f| f.trim().to_string())
        .filter(|f| !f.is_empty() && !f.contains(['/', '\\']) && !f.starts_with('.'))
        .unwrap_or_else(|| crate::prefs::load(&app).skin);
    rows_off_for(&app, &skin).into_iter().collect()
}

#[derive(PartialEq, Debug)]
enum Found {
    Single(String),
    Numbered(Vec<String>),
    Folder(Vec<String>),
    None,
}

fn numbered_names<'a>(names: impl Iterator<Item = &'a str>, name: &str) -> Vec<String> {
    let mut result: Vec<String> = names
        .filter(|n| {
            if *n == name {
                return true;
            }
            let Some(suffix) = n.strip_prefix(name) else {
                return false;
            };
            !suffix.is_empty()
                && !suffix.starts_with('0')
                && suffix.bytes().all(|b| b.is_ascii_digit())
        })
        .map(str::to_string)
        .collect();
    result.sort_by(|a, b| a.len().cmp(&b.len()).then(a.cmp(b)));
    result.dedup();
    result
}

fn find(
    has: &dyn Fn(&str) -> bool,
    folder_files: &dyn Fn(&str) -> Vec<String>,
    numbered: &dyn Fn(&str) -> Vec<String>,
    name: &str,
) -> Found {
    if has(&format!("{name}/")) {
        let files = folder_files(name);
        if !files.is_empty() {
            return Found::Folder(files);
        }
    }
    let images = numbered(name);
    if images.len() == 1 && images[0] == name {
        return Found::Single(name.to_string());
    }
    if !images.is_empty() {
        return Found::Numbered(images);
    }
    Found::None
}

fn borrow_to<'a>(chain: &[(&'a str, &'a str)], name: &str) -> Option<&'a str> {
    chain
        .iter()
        .find(|(from, _)| *from == name)
        .map(|(_, to)| *to)
}

fn resolve_row<'a>(
    has: &dyn Fn(&str) -> bool,
    folder_files: &dyn Fn(&str) -> Vec<String>,
    numbered: &dyn Fn(&str) -> Vec<String>,
    row: &'a RowSpec,
) -> Option<(&'a str, Found)> {
    for candidate in candidates_of(row) {
        let mut name: &str = candidate;
        let mut guard = 0;
        loop {
            match find(has, folder_files, numbered, name) {
                Found::None => {}
                found => return Some((name, found)),
            }
            let Some(next) = borrow_to(row.fallback, name) else {
                return None;
            };
            name = next;
            guard += 1;
            if guard > 32 {
                return None;
            }
        }
    }
    None
}

fn is_own(row: &RowSpec, used_name: &str) -> bool {
    let base = base_name(used_name);
    row.bases.iter().any(|b| base_name(b) == base)
}

fn base_name(name: &str) -> &str {
    name.trim_end_matches(|c: char| c.is_ascii_digit())
}

fn display_of(used_name: &str, found: &Found) -> String {
    match found {
        Found::Single(_) => format!("{used_name}.png"),
        Found::Numbered(_) => format!("{used_name} (pngs)"),
        Found::Folder(_) => format!("{used_name} (folder)"),
        Found::None => unreachable!("缺图的走 missing 那条路"),
    }
}

fn choices_of(
    names: &BTreeMap<String, String>,
    folders: &[String],
    effect_names: &[String],
) -> (Vec<String>, Vec<String>) {
    let usable = |rel: &str| -> bool {
        let lower = rel.to_lowercase();
        let rel = lower.as_str();
        let name = rel
            .rsplit('/')
            .next()
            .unwrap_or(rel)
            .trim_end_matches(".png");
        !rel.starts_with(&format!("{RIG_DIR}/"))
            && !name.starts_with("vfx_")
            && !effect_names.iter().any(|e| e.eq_ignore_ascii_case(name))
    };
    let mut files: Vec<String> = names.values().filter(|p| usable(p)).cloned().collect();
    files.sort();
    let folders: Vec<String> = folders
        .iter()
        .filter(|f| f.to_lowercase() != RIG_DIR && !f.to_lowercase().starts_with("vfx_"))
        .cloned()
        .collect();
    (files, folders)
}

pub fn rows_of_with(
    dir: &Path,
    skin: &str,
    picked: &BTreeMap<String, Choice>,
    effect_names: &[String],
) -> Vec<RowInfo> {
    let (names, folders) = scan_skin(&dir.join(skin));
    let has = |n: &str| -> bool {
        if let Some(folder) = n.strip_suffix('/') {
            return folders
                .iter()
                .any(|f| f.to_lowercase() == folder.to_lowercase());
        }
        names.contains_key(&n.to_lowercase())
    };
    let folder_files = |folder: &str| -> Vec<String> {
        let prefix = format!("{folder}/");
        let mut list: Vec<String> = names
            .values()
            .filter(|p| p.to_lowercase().starts_with(&prefix.to_lowercase()))
            .cloned()
            .collect();
        list.sort();
        list
    };
    let numbered = |name: &str| numbered_names(names.keys().map(String::as_str), name);
    let all_effects: Vec<String> = EFFECT_NAMES
        .iter()
        .map(|s| s.to_string())
        .chain(effect_names.iter().cloned())
        .collect();
    let (file_choices, folder_choices) = choices_of(&names, &folders, &all_effects);
    let missing_label = |row: &RowSpec| format!("{} (missing)", row.name);
    ROWS.iter()
        .map(|row| {
            let (mut status, mut kind, mut display, mut used, mut fallback_value) =
                match resolve_row(&has, &folder_files, &numbered, row) {
                    Some((used_name, found)) => {
                        let used: Vec<String> = match &found {
                            Found::Single(n) => names.get(n).cloned().into_iter().collect(),
                            Found::Numbered(list) => {
                                list.iter().filter_map(|n| names.get(n).cloned()).collect()
                            }
                            Found::Folder(list) => list.clone(),
                            Found::None => Vec::new(),
                        };
                        let fallback_value = match &found {
                            Found::Single(n) => format!(
                                "file:{}",
                                names.get(n).cloned().unwrap_or_else(|| format!("{n}.png"))
                            ),
                            Found::Numbered(list) => list
                                .first()
                                .and_then(|n| names.get(n).cloned())
                                .map(|p| format!("file:{p}"))
                                .unwrap_or_default(),
                            Found::Folder(_) => format!("folder:{used_name}"),
                            Found::None => String::new(),
                        };
                        let base = display_of(used_name, &found);
                        let kind = match &found {
                            Found::Single(_) => "file",
                            Found::Numbered(_) => "pngs",
                            Found::Folder(_) => "folder",
                            Found::None => "missing",
                        };
                        if is_own(row, used_name) {
                            (
                                "own".to_string(),
                                kind.to_string(),
                                base,
                                used,
                                String::new(),
                            )
                        } else {
                            (
                                "borrowed".to_string(),
                                kind.to_string(),
                                format!("{base}  ← {used_name}"),
                                used,
                                fallback_value,
                            )
                        }
                    }
                    None => (
                        "missing".to_string(),
                        "missing".to_string(),
                        missing_label(row),
                        Vec::new(),
                        String::new(),
                    ),
                };
            let rig_parts = [
                "tail1", "tail2", "tail3", "tail4", "body", "earl", "earr", "face",
            ];
            if row.id == "idle"
                && rig_parts.iter().all(|p| has(&format!("idle_{p}")))
                && !picked.contains_key("idle")
            {
                status = "own".into();
                kind = "rig".into();
                used = rig_parts
                    .iter()
                    .filter_map(|p| names.get(&format!("idle_{p}")).cloned())
                    .collect();
                display = format!("{} (folder)", used[0].rsplit_once('/').unwrap().0);
                fallback_value.clear();
            }
            if kind == "file" && !used.is_empty() {
                display = if status == "borrowed" {
                    format!(
                        "{}  ← {}",
                        used[0],
                        display.split("← ").last().unwrap_or("")
                    )
                } else {
                    used[0].clone()
                };
            }
            let chosen = if status == "own" {
                String::new()
            } else {
                picked
                    .get(row.id)
                    .map(|c| {
                        let name = choice_path(&dir.join(skin), &c.name);
                        if c.kind == "file" {
                            name
                        } else {
                            format!("{name}/")
                        }
                    })
                    .unwrap_or_default()
            };
            let display = if chosen.is_empty() {
                display
            } else {
                chosen.trim_end_matches('/').to_string()
            };
            RowInfo {
                id: row.id.to_string(),
                status,
                kind,
                display,
                missing_label: missing_label(row),
                fallback_value,
                used,
                chosen,
                files: file_choices.clone(),
                folders: folder_choices.clone(),
                skippable: is_skippable(row.id),
                enabled: true,
            }
        })
        .collect()
}

pub fn rows_for(app: &AppHandle, skin: &str) -> Vec<RowInfo> {
    let Some(dir) = skins_dir(app) else {
        return Vec::new();
    };
    let effects = overlay_names(&dir, skin);
    let off = rows_off_for(app, skin);
    let mut rows = rows_of_with(&dir, skin, &picked_for(app, skin), &effects);
    for row in &mut rows {
        row.enabled = !off.contains(&row.id);
    }
    rows
}

fn overlay_names(dir: &Path, skin: &str) -> Vec<String> {
    let text = fs::read_to_string(dir.join(skin).join(SKIN_JSON)).ok();
    let json: serde_json::Value = text
        .and_then(|t| serde_json::from_str(&t).ok())
        .unwrap_or(serde_json::Value::Null);
    json.get("overlays")
        .and_then(|o| o.as_object())
        .map(|o| o.keys().cloned().collect())
        .unwrap_or_default()
}

fn picked_for(app: &AppHandle, skin: &str) -> BTreeMap<String, Choice> {
    raw_overrides(app)
        .into_iter()
        .filter(|(_, c)| !skin.is_empty() && c.skin == skin)
        .map(|(key, c)| (row_of_key(&key).to_string(), c))
        .collect()
}

#[tauri::command]
pub fn skin_rows(app: AppHandle, folder: Option<String>) -> Vec<RowInfo> {
    let skin = folder
        .map(|f| f.trim().to_string())
        .filter(|f| !f.is_empty() && !f.contains(['/', '\\']) && !f.starts_with('.'))
        .unwrap_or_else(|| crate::prefs::load(&app).skin);
    rows_for(&app, &skin)
}

fn scan_skin(dir: &Path) -> (BTreeMap<String, String>, Vec<String>) {
    let mut names: BTreeMap<String, String> = BTreeMap::new();
    let mut folders: Vec<String> = Vec::new();
    fn walk(
        dir: &Path,
        prefix: &str,
        names: &mut BTreeMap<String, String>,
        folders: &mut Vec<String>,
        depth: u32,
    ) {
        if depth > 3 {
            return;
        }
        let Ok(entries) = fs::read_dir(dir) else {
            return;
        };
        let mut entries: Vec<_> = entries.flatten().collect();
        entries.sort_by_key(|e| e.file_name());
        for entry in entries {
            let raw = entry.file_name().to_string_lossy().into_owned();
            if raw.starts_with('.') {
                continue;
            }
            let path = entry.path();
            let rel = if prefix.is_empty() {
                raw.clone()
            } else {
                format!("{prefix}/{raw}")
            };
            if path.is_dir() {
                if prefix.is_empty() {
                    folders.push(raw.clone());
                }
                walk(&path, &rel, names, folders, depth + 1);
            } else if raw.to_ascii_lowercase().ends_with(".png") {
                let stem = &raw[..raw.len() - 4];
                let lower = rel.to_lowercase();
                let name = if let Some(rest) = lower.strip_prefix("idle_rig/") {
                    format!("idle_{}", &rest[..rest.len() - 4])
                } else {
                    stem.to_lowercase()
                };
                names
                    .entry(name)
                    .and_modify(|old| {
                        if rel < *old {
                            *old = rel.clone();
                        }
                    })
                    .or_insert(rel);
            }
        }
    }
    walk(dir, "", &mut names, &mut folders, 0);
    folders.sort();
    (names, folders)
}

#[derive(serde :: Serialize)]
pub struct SkinsList {
    pub dir: String,
    pub files: Vec<String>,
    pub folders: Vec<String>,
}

#[tauri::command]
pub fn skins_list(app: AppHandle) -> SkinsList {
    let dir = skins_dir(&app);
    let mut files = vec![];
    let mut folders = vec![];
    if let Some(dir) = &dir {
        let _ = fs::create_dir_all(dir);
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let name = entry.file_name().to_string_lossy().into_owned();
                if path.is_dir() {
                    folders.push(name);
                } else if path
                    .extension()
                    .is_some_and(|x| x.eq_ignore_ascii_case("png"))
                {
                    files.push(name);
                }
            }
        }
    }
    files.sort();
    folders.sort();
    SkinsList {
        dir: dir
            .map(|d| d.to_string_lossy().into_owned())
            .unwrap_or_default(),
        files,
        folders,
    }
}

#[derive(serde :: Serialize)]
pub struct SkinInfo {
    pub value: String,
    pub label: String,
    pub folder: String,
    pub credits: Vec<String>,
}

fn credits_of(text: Option<&str>) -> Vec<String> {
    let json: serde_json::Value = text
        .and_then(|t| serde_json::from_str(t).ok())
        .unwrap_or(serde_json::Value::Null);
    json.get("credits")
        .and_then(|c| c.as_array())
        .map(|list| {
            list.iter()
                .filter_map(|item| item.as_str())
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .map(str::to_string)
                .collect()
        })
        .unwrap_or_default()
}

fn display_name(skin_json: &serde_json::Value, lang_zh: bool) -> Option<String> {
    let name = skin_json.get("name")?;
    if let Some(s) = name.as_str() {
        let s = s.trim();
        return (!s.is_empty()).then(|| s.to_string());
    }
    let obj = name.as_object()?;
    let pick = |k: &str| {
        obj.get(k)
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
    };
    let (first, second) = if lang_zh { ("zh", "en") } else { ("en", "zh") };
    pick(first).or_else(|| pick(second)).map(str::to_string)
}

fn skin_label(dir: &std::path::Path, folder: &str, lang_zh: bool) -> String {
    fs::read_to_string(dir.join(folder).join(SKIN_JSON))
        .ok()
        .and_then(|t| serde_json::from_str::<serde_json::Value>(&t).ok())
        .and_then(|j| display_name(&j, lang_zh))
        .unwrap_or_else(|| folder.to_string())
}

fn skin_credits(dir: &std::path::Path, folder: &str) -> Vec<String> {
    credits_of(
        fs::read_to_string(dir.join(folder).join(SKIN_JSON))
            .ok()
            .as_deref(),
    )
}

fn disambiguate(labels: &[(String, String)]) -> Vec<String> {
    let mut seen: std::collections::HashMap<&str, usize> = std::collections::HashMap::new();
    for (_, label) in labels {
        *seen.entry(label.as_str()).or_insert(0) += 1;
    }
    labels
        .iter()
        .map(|(folder, label)| {
            if seen.get(label.as_str()).copied().unwrap_or(0) > 1 {
                format!("{label}（{folder}）")
            } else {
                label.clone()
            }
        })
        .collect()
}

#[tauri::command]
pub fn skins_available(app: AppHandle) -> Vec<SkinInfo> {
    let lang_zh = crate::prefs::load(&app).zh();
    let Some(dir) = skins_dir(&app) else {
        return vec![];
    };
    let mut folders: Vec<String> = fs::read_dir(&dir)
        .map(|entries| {
            entries
                .flatten()
                .filter(|e| e.path().is_dir())
                .filter(|e| !e.file_name().to_string_lossy().starts_with('.'))
                .map(|e| e.file_name().to_string_lossy().into_owned())
                .collect()
        })
        .unwrap_or_default();
    folders.sort();
    let raw: Vec<(String, String)> = folders
        .iter()
        .map(|folder| (folder.clone(), skin_label(&dir, folder, lang_zh)))
        .collect();
    let labels = disambiguate(&raw);
    folders
        .into_iter()
        .zip(labels)
        .map(|(folder, label)| SkinInfo {
            credits: skin_credits(&dir, &folder),
            value: folder.clone(),
            label,
            folder,
        })
        .collect()
}

#[tauri::command]
pub fn skin_overrides(app: AppHandle) -> BTreeMap<String, Resolved> {
    resolved(&app)
}

#[tauri::command]
pub fn skin_choice(
    app: AppHandle,
    row: String,
    skin: String,
    choice: Option<Choice>,
) -> Result<(), String> {
    let skin = skin.trim().to_string();
    if skin.is_empty() || skin.contains(['/', '\\']) || skin.starts_with('.') {
        return Err("皮肤名不对".into());
    }
    let mut all = raw_overrides(&app);
    let key = key_of(&skin, &row);
    match choice {
        Some(mut c) => {
            c.skin = skin;
            all.insert(key, c);
        }
        None => {
            all.remove(&key);
        }
    }
    let path = overrides_path(&app).ok_or("找不到程序设置文件夹")?;
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| format!("建不了文件夹：{e}"))?;
    }
    let text = serde_json::to_string_pretty(&all).map_err(|e| e.to_string())?;
    fs::write(&path, format!("{text}\n")).map_err(|e| format!("记不住选择：{e}"))?;
    let _ = tauri::Emitter::emit(&app, "skins-changed", resolved(&app));
    Ok(())
}

fn skin_folder_to_open(root: &Path, folder: Option<&str>) -> PathBuf {
    let Some(name) = folder.filter(|name| {
        !name.is_empty()
            && !name.starts_with('.')
            && !name.contains("..")
            && !name.contains(['/', '\\', ':'])
            && !name.chars().any(char::is_control)
    }) else {
        return root.to_path_buf();
    };
    let dir = root.join(name);
    if dir.is_dir() {
        if let (Ok(base), Ok(target)) = (root.canonicalize(), dir.canonicalize()) {
            if target.starts_with(base) {
                return dir;
            }
        }
    }
    root.to_path_buf()
}

#[tauri::command]
pub fn open_skins_folder(app: AppHandle, folder: Option<String>) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let root = skins_dir(&app).ok_or("找不到程序设置文件夹")?;
    if folder.is_none() {
        fs::create_dir_all(&root).map_err(|e| format!("建不了文件夹：{e}"))?;
    }
    let dir = skin_folder_to_open(&root, folder.as_deref());
    app.opener()
        .open_path(dir.to_string_lossy(), None::<&str>)
        .map_err(|e| e.to_string())
}

#[allow(dead_code)]
pub fn copy_missing_skins(from: &Path, to: &Path) -> usize {
    let Ok(entries) = fs::read_dir(from) else {
        return 0;
    };
    let mut names: Vec<String> = entries
        .flatten()
        .filter(|e| e.path().is_dir())
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .filter(|name| !name.starts_with('.'))
        .collect();
    names.sort();
    let mut copied = 0;
    for name in names {
        let dst = to.join(&name);
        if dst.exists() {
            continue;
        }
        if fs::create_dir_all(to).is_err() {
            return copied;
        }
        let tmp = to.join(format!(".{name}.tmp"));
        let _ = fs::remove_dir_all(&tmp);
        if copy_tree(&from.join(&name), &tmp).is_err() || fs::rename(&tmp, &dst).is_err() {
            let _ = fs::remove_dir_all(&tmp);
            continue;
        }
        copied += 1;
    }
    copied
}

#[allow(dead_code)]
fn copy_tree(from: &Path, to: &Path) -> std::io::Result<()> {
    fs::create_dir_all(to)?;
    for entry in fs::read_dir(from)? {
        let entry = entry?;
        let dst = to.join(entry.file_name());
        if entry.path().is_dir() {
            copy_tree(&entry.path(), &dst)?;
        } else {
            fs::copy(entry.path(), dst)?;
        }
    }
    Ok(())
}

pub fn pivot_text(skin_json: Option<&str>) -> String {
    let json: serde_json::Value = skin_json
        .and_then(|text| serde_json::from_str(text).ok())
        .unwrap_or(serde_json::Value::Null);
    let (w, h) = canvas_size(&json);
    let pair = |v: Option<&serde_json::Value>| -> Option<(f64, f64)> {
        let a = v?.as_array()?;
        if a.len() != 2 {
            return None;
        }
        Some((as_num(&a[0])?, as_num(&a[1])?))
    };
    let (x, y) = pair(json.get("pivot"))
        .filter(|p| p.0 >= 0.0 && p.0 < w && p.1 >= 0.0 && p.1 < h)
        .or_else(|| {
            json.get("footY")
                .and_then(as_num)
                .filter(|y| *y >= 0.0 && *y < h)
                .map(|y| (((w - 1.0) / 2.0).round(), y))
        })
        .unwrap_or((
            (w * DEFAULT_PIVOT_PCT.0).round(),
            (h * DEFAULT_PIVOT_PCT.1).round(),
        ));
    format!("{}×{}", num_text(x), num_text(y))
}

fn canvas_size(json: &serde_json::Value) -> (f64, f64) {
    let pair = json
        .get("size")
        .and_then(|v| v.as_array())
        .filter(|a| a.len() == 2);
    let pick = |i: usize| -> f64 {
        let n = pair.and_then(|a| as_num(&a[i])).unwrap_or(0.0);
        if n != 0.0 {
            n
        } else {
            400.0
        }
    };
    (pick(0), pick(1))
}

fn as_num(v: &serde_json::Value) -> Option<f64> {
    v.as_f64()
        .or_else(|| v.as_str().and_then(|s| s.trim().parse().ok()))
}

fn num_text(n: f64) -> String {
    if n.fract() == 0.0 && n.abs() < 9e15 {
        format!("{}", n as i64)
    } else {
        format!("{n}")
    }
}

#[tauri::command]
pub fn skin_pivot(app: AppHandle, folder: Option<String>) -> String {
    let picked = folder
        .map(|f| f.trim().to_string())
        .filter(|f| !f.is_empty() && !f.contains(['/', '\\']) && !f.starts_with('.'));
    let name = picked.unwrap_or_else(|| {
        let saved = crate::prefs::load(&app).skin;
        if saved.trim().is_empty() {
            crate::prefs::DEFAULT_SKIN.to_string()
        } else {
            saved
        }
    });
    let text =
        skins_dir(&app).and_then(|dir| fs::read_to_string(dir.join(&name).join(SKIN_JSON)).ok());
    pivot_text(text.as_deref())
}
