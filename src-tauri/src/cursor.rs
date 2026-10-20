use serde_json::{json, Map, Value};

use std::path::Path;

const EVENTS: &[&str] = &[
    "sessionStart",
    "sessionEnd",
    "postToolUse",
    "postToolUseFailure",
    "preCompact",
    "stop",
];

const URL: &str = "http://127.0.0.1:47621/state/thinking?from=cursor&hereness=cursor-v1";

fn windows_script() -> String {
    format ! ("$ErrorActionPreference='Stop'; try {{ [Console]::InputEncoding=[Text.UTF8Encoding]::new($false); $bytes=[Text.Encoding]::UTF8.GetBytes([Console]::In.ReadToEnd()); $r=[Net.HttpWebRequest]::Create('{URL}'); $r.Proxy=$null; $r.AllowAutoRedirect=$false; $r.Method='POST'; $r.Timeout=2000; $r.ReadWriteTimeout=2000; $r.ContentType='application/json'; $r.ContentLength=$bytes.Length; $s=$r.GetRequestStream(); try {{ $s.Write($bytes,0,$bytes.Length) }} finally {{ $s.Dispose() }}; $reply=$r.GetResponse(); $reply.Close() }} catch {{}}; [Console]::Out.WriteLine('{{}}'); exit 0")
}

fn encoded_powershell(script: &str) -> String {
    const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let bytes: Vec<u8> = script.encode_utf16().flat_map(u16::to_le_bytes).collect();
    let mut encoded = String::new();
    for chunk in bytes.chunks(3) {
        let n = ((chunk[0] as u32) << 16)
            | ((chunk.get(1).copied().unwrap_or(0) as u32) << 8)
            | chunk.get(2).copied().unwrap_or(0) as u32;
        encoded.push(ALPHABET[((n >> 18) & 63) as usize] as char);
        encoded.push(ALPHABET[((n >> 12) & 63) as usize] as char);
        encoded.push(if chunk.len() > 1 {
            ALPHABET[((n >> 6) & 63) as usize] as char
        } else {
            '='
        });
        encoded.push(if chunk.len() > 2 {
            ALPHABET[(n & 63) as usize] as char
        } else {
            '='
        });
    }
    encoded
}

fn command(windows: bool) -> String {
    if windows {
        format!(
            "powershell.exe -NoProfile -NonInteractive -EncodedCommand {}",
            encoded_powershell(&windows_script())
        )
    } else {
        format ! ("/bin/sh -c 'curl -s -m 2 --connect-timeout 1 --data-binary \"@-\" \"{URL}\" >/dev/null 2>&1; printf \"{{}}\\n\"; exit 0'")
    }
}

fn owned(row: &Value) -> bool {
    row == &json ! ({ "command" : command (false) })
        || row == &json ! ({ "command" : command (true) })
}

fn remove_owned(settings: &mut Map<String, Value>) -> usize {
    let Some(Value::Object(hooks)) = settings.get_mut("hooks") else {
        return 0;
    };
    let mut removed = 0;
    hooks.retain(|_, rows| {
        let Value::Array(rows) = rows else {
            return true;
        };
        let before = rows.len();
        rows.retain(|row| !owned(row));
        removed += before - rows.len();
        before == rows.len() || !rows.is_empty()
    });
    removed
}

pub fn is_connected(path: &Path) -> bool {
    crate::hooks::read_settings(path).is_ok_and(|mut settings| remove_owned(&mut settings) > 0)
}

pub fn connect(path: &Path) -> Result<(), String> {
    let mut settings = crate::hooks::read_settings(path)?;
    match settings.get("version") {
        None => {
            settings.insert("version".into(), json!(1));
        }
        Some(v) if v.as_u64().is_some_and(|v| v > 0) => {}
        Some(_) => {
            return Err(
                "Cursor hooks 的 version 不是正整数，未改文件 / Invalid Cursor hooks version"
                    .into(),
            )
        }
    }
    remove_owned(&mut settings);
    let Value::Object(hooks) = settings.entry("hooks").or_insert_with(|| json!({})) else {
        return Err("Cursor hooks 必须是对象，未改文件 / Invalid Cursor hooks".into());
    };
    for event in EVENTS {
        let Value::Array(rows) = hooks
            .entry((*event).to_string())
            .or_insert_with(|| json!([]))
        else {
            return Err(format!(
                "Cursor {event} 必须是数组，未改文件 / Expected an array"
            ));
        };
        rows.push(json ! ({ "command" : command (cfg ! (windows)) }));
    }
    crate::hooks::write_settings(path, &settings)
}

pub fn disconnect(path: &Path) -> Result<(), String> {
    let mut settings = crate::hooks::read_settings(path)?;
    if remove_owned(&mut settings) == 0 {
        return Ok(());
    }
    crate::hooks::write_settings(path, &settings)
}

pub fn signal(v: &Value) -> Option<crate::PetSignal> {
    let text = |value: Option<&Value>| -> Option<String> {
        let s = value?.as_str()?.trim();
        (!s.is_empty()).then(|| s.chars().take(300).collect())
    };
    let id = |key| {
        text(v.get(key)).filter(|id| {
            id.len() <= 128
                && id
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_'))
        })
    };
    let session = id("conversation_id").or_else(|| id("session_id"))?;
    let event = crate::signals::name_only(v.get("hook_event_name").and_then(Value::as_str))?;
    let tool = crate::signals::name_only(v.get("tool_name").and_then(Value::as_str));
    let state = match event.as_str() {
        "sessionStart" | "SessionStart" => Some("idle"),
        "sessionEnd" | "SessionEnd" => None,
        "beforeSubmitPrompt" | "UserPromptSubmit" => Some("prompt"),
        "preToolUse" | "PreToolUse" => Some(match tool.as_deref() {
            Some("Shell" | "Bash" | "PowerShell") => "bash",
            Some("Read" | "Grep" | "Glob" | "WebSearch" | "WebFetch") => "reading",
            Some("Write" | "Edit" | "MultiEdit" | "NotebookEdit" | "Delete") => "typing",
            _ => "thinking",
        }),
        "beforeShellExecution" => Some("bash"),
        "beforeReadFile" => Some("reading"),
        "postToolUse"
        | "PostToolUse"
        | "preCompact"
        | "PreCompact"
        | "afterShellExecution"
        | "afterMCPExecution"
        | "afterFileEdit"
        | "afterAgentThought"
        | "subagentStop"
        | "SubagentStop" => Some("thinking"),
        "postToolUseFailure" | "PostToolUseFailure" => Some(
            if v.get("is_interrupt").and_then(Value::as_bool) == Some(true) {
                "idle"
            } else {
                "error"
            },
        ),
        "stop" | "Stop" => Some(match v.get("status").and_then(Value::as_str)? {
            "completed" => "done",
            "aborted" => "idle",
            "error" => "error_stop",
            _ => return None,
        }),
        _ => return None,
    };
    let cwd = v
        .get("cwd")
        .and_then(Value::as_str)
        .filter(|s| !s.trim().is_empty())
        .map(str::to_owned)
        .or_else(|| {
            let roots = v.get("workspace_roots")?.as_array()?;
            (roots.len() == 1)
                .then(|| roots[0].as_str())
                .flatten()
                .filter(|s| !s.trim().is_empty())
                .map(str::to_owned)
        });
    let input = v.get("tool_input");
    let command = text(input.and_then(|i| i.get("command"))).or_else(|| {
        matches!(
            event.as_str(),
            "beforeShellExecution" | "afterShellExecution"
        )
        .then(|| text(v.get("command")))
        .flatten()
    });
    let file = text(input.and_then(|i| i.get("file_path"))).or_else(|| text(v.get("file_path")));
    Some(crate::PetSignal {
        state: state.map(str::to_string),
        session: Some(format!("cursor:{session}")),
        cwd,
        tool,
        detail: None,
        command,
        file,
        event: Some(event),
    })
}
