use serde_json::{json, Map, Value};

use std::fs;

use std::path::{Path, PathBuf};

const MARKER: &str = "127.0.0.1:47621";

pub struct HookSpec {
    pub event: &'static str,
    pub matcher: Option<&'static str>,
    pub target: &'static str,
    pub timeout: Option<u32>,
    pub sync: bool,
}

pub struct Agent {
    pub id: &'static str,
    pub name: &'static str,
    pub dir: &'static str,
    pub file: &'static str,
    pub remove_if_empty: bool,
    pub hooks: &'static [HookSpec],
}

const fn h(event: &'static str, matcher: Option<&'static str>, target: &'static str) -> HookSpec {
    HookSpec {
        event,
        matcher,
        target,
        timeout: None,
        sync: false,
    }
}

const fn hs(event: &'static str, target: &'static str, timeout: u32, sync: bool) -> HookSpec {
    HookSpec {
        event,
        matcher: None,
        target,
        timeout: Some(timeout),
        sync,
    }
}

const fn h_sync(
    event: &'static str,
    matcher: Option<&'static str>,
    target: &'static str,
) -> HookSpec {
    HookSpec {
        event,
        matcher,
        target,
        timeout: None,
        sync: true,
    }
}

pub const CLAUDE : Agent = Agent { id : "claude" , name : "Claude Code" , dir : ".claude" , file : "settings.json" , remove_if_empty : false , hooks : & [h ("UserPromptSubmit" , None , "state/prompt") , h ("PreToolUse" , Some ("Read|Grep|Glob|WebSearch|WebFetch") , "state/reading") , h ("PreToolUse" , Some ("Edit|Write|MultiEdit|NotebookEdit") , "state/typing") , h ("PreToolUse" , Some ("Bash|PowerShell") , "state/bash") , h ("PreToolUse" , Some ("^(?!(Read|Grep|Glob|WebSearch|WebFetch|Edit|Write|MultiEdit|NotebookEdit|Bash|PowerShell)$)") , "state/thinking" ,) , h ("PostToolUse" , None , "state/thinking") , h ("PostToolUseFailure" , None , "state/error") , h_sync ("PermissionRequest" , None , "state/notify") , h ("PermissionDenied" , None , "state/thinking") , h ("Notification" , Some ("permission_prompt|elicitation_dialog|elicitation_url_dialog|agent_needs_input") , "state/notify" ,) , h ("Stop" , None , "state/done") , h ("StopFailure" , None , "state/error_stop") , h ("SessionEnd" , None , "end") ,] , } ;

pub const CODEX: Agent = Agent {
    id: "codex",
    name: "Codex",
    dir: ".codex",
    file: "hooks.json",
    remove_if_empty: true,
    hooks: &[
        h("UserPromptSubmit", None, "state/prompt"),
        h("PreToolUse", Some("^Bash$"), "state/bash"),
        h("PreToolUse", Some("^apply_patch$"), "state/typing"),
        h("PermissionRequest", None, "state/notify"),
        h("PostToolUse", None, "state/thinking"),
        h("Stop", None, "state/done"),
        hs("Interrupt", "state/idle", 3, false),
        hs("SessionEnd", "end", 3, true),
    ],
};

pub const QWEN: Agent = Agent {
    id: "qwen",
    name: "Qwen Code",
    dir: ".qwen",
    file: "settings.json",
    remove_if_empty: false,
    hooks: &[
        h("UserPromptSubmit", None, "state/prompt"),
        h(
            "PreToolUse",
            Some("^(read_file|grep_search|glob)$"),
            "state/reading",
        ),
        h("PreToolUse", Some("^(write_file|edit)$"), "state/typing"),
        h("PreToolUse", Some("^run_shell_command$"), "state/bash"),
        h("PostToolUse", None, "state/thinking"),
        h("PostToolUseFailure", None, "state/error"),
        h("PermissionRequest", None, "state/notify"),
        h("PermissionDenied", None, "state/thinking"),
        h("Notification", Some("^permission_prompt$"), "state/notify"),
        h("Stop", None, "state/done"),
        h("StopFailure", None, "state/error_stop"),
        h("SessionEnd", None, "end"),
    ],
};

pub const DSH: Agent = Agent {
    id: "dsh",
    name: "DSH",
    dir: ".dsh/profiles/desktop",
    file: "cordis.patch.yml",
    remove_if_empty: false,
    hooks: &[
        h_sync("UserPromptSubmit", None, "state/prompt"),
        h_sync(
            "PreToolUse",
            Some("read|grep|glob|web_search|web_fetch"),
            "state/reading",
        ),
        h_sync("PreToolUse", Some("write|edit"), "state/typing"),
        h_sync("PreToolUse", Some("pwsh"), "state/bash"),
        h_sync(
            "PreToolUse",
            Some("^(?!(read|grep|glob|web_search|web_fetch|write|edit|pwsh)$)"),
            "state/thinking",
        ),
        h_sync("PostToolUse", None, "state/thinking"),
        h_sync("Stop", None, "state/done"),
    ],
};

pub const CURSOR: Agent = Agent {
    id: "cursor",
    name: "Cursor",
    dir: ".cursor",
    file: "hooks.json",
    remove_if_empty: false,
    hooks: &[],
};

pub const AGENTS: &[&Agent] = &[&CLAUDE, &CODEX, &QWEN, &DSH, &CURSOR];

pub fn dsh_config() -> Result<String, String> {
    let mut settings = Map::new();
    add_pet_hooks(&DSH, &mut settings)?;
    serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())
}

impl Agent {
    pub fn settings_path(&self, home: &Path) -> PathBuf {
        home.join(self.dir).join(self.file)
    }
    pub fn installed(&self, home: &Path) -> bool {
        home.join(self.dir).is_dir()
    }
}

fn hook_command(agent: &Agent, target: &str) -> String {
    let curl = if cfg!(windows) { "curl.exe" } else { "curl" };
    format ! ("{curl} -q --noproxy \"*\" -s -m 2 --connect-timeout 1 --data-binary \"@-\" \"http://{MARKER}/{target}?from={}\"" , agent . id)
}

fn sibling(path: &Path, suffix: &str) -> PathBuf {
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("settings");
    path.with_file_name(format!("{name}.hereness.{suffix}"))
}

pub fn backup_path(path: &Path) -> PathBuf {
    sibling(path, "bak")
}

pub(crate) fn read_settings(path: &Path) -> Result<Map<String, Value>, String> {
    let text = match fs::read_to_string(path) {
        Ok(t) => t,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(Map::new()),
        Err(e) => return Err(format!("读不了设置文件：{e}")),
    };
    let text = text.trim_start_matches('\u{feff}');
    if text.trim().is_empty() {
        return Ok(Map::new());
    }
    match serde_json::from_str::<Value>(text) {
        Ok(Value::Object(m)) => Ok(m),
        Ok(_) => Err("设置文件的格式不对（最外层不是 { }）".into()),
        Err(e) => Err(format!("设置文件不是正确的 JSON（第 {} 行）", e.line())),
    }
}

pub(crate) fn write_settings(path: &Path, settings: &Map<String, Value>) -> Result<(), String> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| format!("建不了文件夹：{e}"))?;
    }
    backup(path)?;
    let mut text = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    text.push('\n');
    let tmp = sibling(path, "tmp");
    fs::write(&tmp, text).map_err(|e| format!("写入失败：{e}"))?;
    fs::rename(&tmp, path).map_err(|e| format!("写入失败：{e}"))
}

fn backup(path: &Path) -> Result<(), String> {
    if path.exists() {
        fs::copy(path, backup_path(path)).map_err(|e| format!("备份失败，没有改动：{e}"))?;
    }
    Ok(())
}

fn is_pet_hook(hook: &Value) -> bool {
    hook.get("command")
        .and_then(Value::as_str)
        .is_some_and(|c| c.contains(MARKER))
}

fn remove_pet_hooks(settings: &mut Map<String, Value>) -> usize {
    let mut removed = 0;
    let Some(Value::Object(hooks)) = settings.get_mut("hooks") else {
        return 0;
    };
    hooks.retain(|_, groups| {
        let Value::Array(groups) = groups else {
            return true;
        };
        let before_groups = groups.len();
        groups.retain_mut(|group| {
            let mut keep = true;
            if let Some(Value::Array(list)) = group.get_mut("hooks") {
                let before = list.len();
                list.retain(|h| !is_pet_hook(h));
                removed += before - list.len();
                keep = before == list.len() || !list.is_empty();
            }
            keep
        });
        before_groups == groups.len() || !groups.is_empty()
    });
    if removed > 0 && hooks.is_empty() {
        settings.remove("hooks");
    }
    removed
}

fn add_pet_hooks(agent: &Agent, settings: &mut Map<String, Value>) -> Result<(), String> {
    let hooks = settings.entry("hooks").or_insert_with(|| json!({}));
    let Value::Object(hooks) = hooks else {
        return Err("设置文件里的 hooks 格式不对".into());
    };
    for spec in agent.hooks {
        let groups = hooks.entry(spec.event).or_insert_with(|| json!([]));
        let Value::Array(groups) = groups else {
            return Err(format!("设置文件里的 hooks.{} 格式不对", spec.event));
        };
        let mut hook = Map::new();
        hook.insert("type".into(), json!("command"));
        hook.insert("command".into(), json!(hook_command(agent, spec.target)));
        if !spec.sync {
            hook.insert("async".into(), json!(true));
        }
        if let Some(t) = spec.timeout {
            hook.insert("timeout".into(), json!(t));
        }
        let mut group = Map::new();
        if let Some(m) = spec.matcher {
            group.insert("matcher".into(), json!(m));
        }
        group.insert("hooks".into(), json!([hook]));
        groups.push(Value::Object(group));
    }
    Ok(())
}

pub fn is_connected(path: &Path) -> bool {
    let Ok(mut s) = read_settings(path) else {
        return false;
    };
    remove_pet_hooks(&mut s) > 0
}

pub fn connected(agent: &Agent, path: &Path) -> bool {
    if agent.id == "cursor" {
        crate::cursor::is_connected(path)
    } else {
        is_connected(path)
    }
}

pub fn connect(agent: &Agent, path: &Path) -> Result<(), String> {
    if agent.id == "cursor" {
        return crate::cursor::connect(path);
    }
    let mut s = read_settings(path)?;
    remove_pet_hooks(&mut s);
    add_pet_hooks(agent, &mut s)?;
    write_settings(path, &s)
}

pub fn disconnect(agent: &Agent, path: &Path) -> Result<(), String> {
    if agent.id == "cursor" {
        return crate::cursor::disconnect(path);
    }
    let mut s = read_settings(path)?;
    if remove_pet_hooks(&mut s) == 0 {
        return Ok(());
    }
    if s.is_empty() && agent.remove_if_empty {
        backup(path)?;
        return fs::remove_file(path).map_err(|e| format!("删除失败：{e}"));
    }
    write_settings(path, &s)
}
