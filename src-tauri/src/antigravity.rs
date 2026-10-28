use serde_json::{json, Value};

use std::path::Path;

const EVENTS: &[&str] = &[
    "SessionStart",
    "PreInvocation",
    "PostToolUse",
    "PostInvocation",
    "Stop",
];

const URL: &str = "http://127.0.0.1:47621/state/thinking?from=antigravity";

fn command(windows: bool, event: &str, url: &str) -> String {
    let wildcard = if windows {
        "--noproxy *"
    } else {
        "--noproxy \"*\""
    };
    fix2_command(windows, event, url).replacen(wildcard, "--noproxy 127.0.0.1", 1)
}

fn fix2_command(windows: bool, event: &str, url: &str) -> String {
    if !windows {
        return fix1_command(false, event, url);
    }
    let url = url.replace('&', "^&");
    let reply = if event == "Stop" {
        "forfiles /P %SystemRoot%\\System32 /M cmd.exe /C cmd0x20/c0x20echo0x20{0x22decision0x22:0x22allow0x22}" . to_string ()
    } else {
        "echo {}".into()
    };
    format ! ("curl.exe -q --noproxy * -s -m 0.2 --connect-timeout 0.1 --data-binary @- {url} >nul 2>&1 & {reply} & exit /b 0")
}

fn fix1_command(windows: bool, event: &str, url: &str) -> String {
    let output = if event == "Stop" {
        r#"{"decision":"allow"}"#
    } else {
        "{}"
    };
    if windows {
        format ! ("curl.exe -q --noproxy \"*\" -s -m 0.2 --connect-timeout 0.1 --data-binary \"@-\" \"{url}\" >nul 2>&1 & echo {output} & exit /b 0")
    } else {
        let output = output.replace('"', "\\\"");
        format ! ("/bin/sh -c 'curl -q --noproxy \"*\" -s -m 0.2 --connect-timeout 0.1 --data-binary \"@-\" \"{url}\" >/dev/null 2>&1; printf \"{output}\\n\"; exit 0'")
    }
}

fn legacy_command(windows: bool, event: &str, url: &str) -> String {
    let output = if event == "Stop" {
        r#"{"decision":"allow"}"#
    } else {
        "{}"
    };
    if windows {
        let script = format ! ("$ErrorActionPreference='Stop'; try {{ [Console]::InputEncoding=[Text.UTF8Encoding]::new($false); $bytes=[Text.Encoding]::UTF8.GetBytes([Console]::In.ReadToEnd()); $r=[Net.HttpWebRequest]::Create('{url}'); $r.Proxy=$null; $r.AllowAutoRedirect=$false; $r.Method='POST'; $r.Timeout=2000; $r.ReadWriteTimeout=2000; $r.ContentType='application/json'; $r.ContentLength=$bytes.Length; $s=$r.GetRequestStream(); try {{ $s.Write($bytes,0,$bytes.Length) }} finally {{ $s.Dispose() }}; $reply=$r.GetResponse(); $reply.Close() }} catch {{}}; [Console]::Out.WriteLine('{output}'); exit 0") ;
        format!(
            "powershell.exe -NoProfile -NonInteractive -EncodedCommand {}",
            crate::cursor::encoded_powershell(&script)
        )
    } else {
        let output = output.replace('"', "\\\"");
        format ! ("/bin/sh -c 'curl -q --noproxy \"*\" -s -m 2 --connect-timeout 1 --data-binary \"@-\" \"{url}\" >/dev/null 2>&1; printf \"{output}\\n\"; exit 0'")
    }
}

#[derive(Clone, Copy)]
enum CommandVersion {
    Current,
    Fix2,
    Fix1,
    Initial,
}

fn group(windows: bool, version: CommandVersion) -> Value {
    let mut group = json ! ({ "enabled" : true });
    for event in EVENTS {
        let url = format!("{URL}&event={event}");
        let command = match version {
            CommandVersion::Current => command(windows, event, &url),
            CommandVersion::Fix2 => fix2_command(windows, event, &url),
            CommandVersion::Fix1 => fix1_command(windows, event, &url),
            CommandVersion::Initial => legacy_command(windows, event, &url),
        };
        let handler = json ! ({ "type" : "command" , "command" : command , "timeout" : 3 });
        group[event] = if *event == "PostToolUse" {
            json ! ([{ "matcher" : "*" , "hooks" : [handler] }])
        } else {
            json!([handler])
        };
    }
    group
}

fn owned(group: &Value) -> bool {
    let mut supplied = group.clone();
    if let Some(fields) = supplied.as_object_mut() {
        fields.remove("enabled");
    }
    [
        CommandVersion::Current,
        CommandVersion::Fix2,
        CommandVersion::Fix1,
        CommandVersion::Initial,
    ]
    .into_iter()
    .any(|version| {
        [false, true].into_iter().any(|windows| {
            let mut expected = self::group(windows, version);
            if let Some(fields) = expected.as_object_mut() {
                fields.remove("enabled");
            }
            supplied == expected
        })
    })
}

pub fn is_connected(path: &Path) -> bool {
    crate::hooks::read_settings(path)
        .is_ok_and(|settings| settings.get("hereness").is_some_and(owned))
}

fn check_group(settings: &serde_json::Map<String, Value>) -> Result<(), String> {
    if settings.get("hereness").is_some_and(|value| !owned(value)) {
        return Err ("Antigravity 的 hereness 组不是桌宠生成的完整配置，未改文件。请先检查备份和该组。 / Antigravity's hereness group is unfamiliar or edited. No files changed; check the group and backup first." . into ()) ;
    }
    Ok(())
}

pub fn connect(path: &Path) -> Result<(), String> {
    let mut settings = crate::hooks::read_settings(path)?;
    check_group(&settings)?;
    let mut current = group(cfg!(windows), CommandVersion::Current);
    if let Some(enabled) = settings
        .get("hereness")
        .and_then(|group| group.get("enabled"))
    {
        current["enabled"] = enabled.clone();
    }
    settings.insert("hereness".into(), current);
    crate::hooks::write_settings(path, &settings)
}

pub fn disconnect(path: &Path) -> Result<(), String> {
    let mut settings = crate::hooks::read_settings(path)?;
    check_group(&settings)?;
    if settings.remove("hereness").is_none() {
        return Ok(());
    }
    crate::hooks::write_settings(path, &settings)
}

pub fn signal(v: &Value, event: &str) -> Option<crate::PetSignal> {
    let id = v.get("conversationId")?.as_str()?;
    if id.is_empty()
        || id.len() > 128
        || !id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_'))
    {
        return None;
    }
    let tool = (event == "PostToolUse")
        .then(|| crate::signals::name_only(v.get("toolCall")?.get("name")?.as_str()))
        .flatten();
    let state = match event {
        "SessionStart" => "idle",
        "PreInvocation" | "PostInvocation" => "thinking",
        "PostToolUse"
            if v.get("error")
                .is_some_and(|error| !error.is_null() && error.as_str() != Some("")) =>
        {
            "error"
        }
        "PostToolUse" => match tool.as_deref() {
            Some("view_file") => "reading",
            Some("run_command") => "bash",
            Some("write_to_file") => "typing",
            _ => "thinking",
        },
        "Stop" => match v.get("terminationReason")?.as_str()? {
            "NO_TOOL_CALL" | "TERMINAL_STEP_TYPE" | "INJECTED_RESPONSE" => "done",
            "ERROR"
            | "MAX_INVOCATIONS"
            | "MAX_FORCED_INVOCATIONS"
            | "MAX_TOKEN_BUDGET_EXCEEDED" => "error_stop",
            "USER_CANCELED" | "TERMINAL_CUSTOM_HOOK" => "idle",
            _ => return None,
        },
        _ => return None,
    };
    let cwd = v
        .get("workspacePaths")
        .and_then(Value::as_array)
        .filter(|paths| paths.len() == 1)
        .and_then(|paths| paths[0].as_str())
        .filter(|s| !s.trim().is_empty())
        .map(str::to_owned);
    let command = (tool.as_deref() == Some("run_command"))
        .then(|| v.get("toolCall")?.get("args")?.get("CommandLine")?.as_str())
        .flatten()
        .filter(|s| !s.trim().is_empty())
        .map(|s| s.chars().take(300).collect::<String>());
    Some(crate::PetSignal {
        state: Some(state.into()),
        session: Some(format!("antigravity:{id}")),
        cwd,
        tool,
        detail: command.clone(),
        command,
        file: None,
        event: Some(event.into()),
    })
}
