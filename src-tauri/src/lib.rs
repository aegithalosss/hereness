use std::io::{Read, Write};

use std::net::{Shutdown, TcpListener, TcpStream};

use std::time::Duration;

use tauri::menu::{CheckMenuItem, Menu, MenuEvent, MenuItem, PredefinedMenuItem};

use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

use tauri::{AppHandle, Emitter, Manager};

use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

use tauri_plugin_opener::OpenerExt;

mod bubble;

mod cursor;

mod ds_price;

mod hooks;

mod folders;

mod dsh_hooks;

mod prefs;

mod skins;

mod signals;

mod sounds;

mod status;

mod storage;

mod settings_write;

const PET_PORT: u16 = 47621;

const DISPLAY_NAME: &str = "在呢 | Hereness";

const MAX_REQUEST_BYTES: usize = 1024 * 1024;

#[derive(Clone, Debug, serde :: Serialize)]
struct PetSignal {
    state: Option<String>,
    session: Option<String>,
    cwd: Option<String>,
    tool: Option<String>,
    detail: Option<String>,
    command: Option<String>,
    file: Option<String>,
    event: Option<String>,
}

fn start_state_server(app: AppHandle, listener: Option<TcpListener>) {
    let Some(listener) = listener else {
        eprintln!("[pet] 收信口没有启动：端口 {PET_PORT} 被占用");
        return;
    };
    std::thread::spawn(move || {
        println!("[pet] 收信口已启动：http://127.0.0.1:{PET_PORT}/state/<状态名>");
        for stream in listener.incoming().flatten() {
            handle_request(stream, &app);
        }
    });
}

fn read_request(stream: &mut TcpStream) -> Option<(String, Vec<u8>)> {
    let mut data = Vec::new();
    let mut buf = [0u8; 8192];
    let mut layout: Option<(usize, usize)> = None;
    loop {
        if let Some((head_end, len)) = layout {
            if data.len() >= head_end + len {
                let head = String::from_utf8_lossy(&data[..head_end]).into_owned();
                return Some((head, data[head_end..head_end + len].to_vec()));
            }
        }
        let n = stream.read(&mut buf).ok()?;
        if n == 0 {
            let (head_end, _) = layout?;
            let head = String::from_utf8_lossy(&data[..head_end]).into_owned();
            return Some((head, data[head_end..].to_vec()));
        }
        data.extend_from_slice(&buf[..n]);
        if data.len() > MAX_REQUEST_BYTES {
            return None;
        }
        if layout.is_none() {
            if let Some(pos) = data.windows(4).position(|w| w == b"\r\n\r\n") {
                let head_end = pos + 4;
                let len = content_length(&String::from_utf8_lossy(&data[..head_end]));
                if head_end
                    .checked_add(len)
                    .map_or(true, |end| end > MAX_REQUEST_BYTES)
                {
                    return None;
                }
                layout = Some((head_end, len));
            }
        }
    }
}

fn content_length(head: &str) -> usize {
    head.lines()
        .filter_map(|l| l.split_once(':'))
        .find(|(k, _)| k.trim().eq_ignore_ascii_case("content-length"))
        .and_then(|(_, v)| v.trim().parse().ok())
        .unwrap_or(0)
}

fn info_from_body(
    body: &[u8],
) -> (
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
) {
    let Ok(v) = serde_json::from_slice::<serde_json::Value>(body) else {
        return (None, None, None, None, None, None);
    };
    let text = |v: Option<&serde_json::Value>| -> Option<String> {
        let s = v?.as_str()?.trim();
        (!s.is_empty()).then(|| s.chars().take(300).collect())
    };
    let session = text(v.get("session_id")).filter(|id| {
        id.len() <= 128
            && id
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
    });
    let input = v.get("tool_input");
    let detail = text(input.and_then(|i| i.get("description")))
        .or_else(|| text(input.and_then(|i| i.get("command"))))
        .or_else(|| text(input.and_then(|i| i.get("file_path"))))
        .or_else(|| {
            text(
                input
                    .and_then(|i| i.get("questions"))
                    .and_then(|q| q.get(0))
                    .and_then(|q| q.get("question")),
            )
        });
    let command = text(input.and_then(|i| i.get("command")));
    let file = text(input.and_then(|i| i.get("file_path")));
    (
        session,
        v.get("cwd")
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
            .map(str::to_owned),
        text(v.get("tool_name")),
        detail,
        command,
        file,
    )
}

fn event_from_body(body: &[u8]) -> Option<String> {
    let v = serde_json::from_slice::<serde_json::Value>(body).ok()?;
    signals::name_only(v.get("hook_event_name").and_then(|e| e.as_str()))
}

fn signal_from_body(
    from: &str,
    state: Option<String>,
    body: &[u8],
    native_cursor: impl FnOnce() -> bool,
) -> Option<(String, PetSignal)> {
    let value = serde_json::from_slice::<serde_json::Value>(body).ok();
    let marked_cursor = value
        .as_ref()
        .is_some_and(|v| v.get("cursor_version").is_some());
    if marked_cursor || from == "cursor" {
        if marked_cursor
            && from == "claude"
            && native_cursor()
            && cursor::duplicates_native(value.as_ref()?)
        {
            return None;
        }
        return cursor::signal(value.as_ref()?).map(|signal| ("cursor".into(), signal));
    }
    let (session_id, cwd, tool, detail, command, file) = info_from_body(body);
    Some((
        from.to_string(),
        PetSignal {
            state,
            session: session_id.map(|id| format!("{from}:{id}")),
            cwd,
            tool,
            detail,
            command,
            file,
            event: event_from_body(body),
        },
    ))
}

fn signal_entry(from: &str, signal: &PetSignal) -> signals::Entry {
    signals::Entry {
        at: now_ms(),
        from: from.to_string(),
        session: signal
            .session
            .as_deref()
            .and_then(|s| s.split_once(':'))
            .map(|(_, id)| signals::short_session(id)),
        state: signal.state.clone().unwrap_or_else(|| "end".into()),
        event: signal.event.clone(),
        tool: signals::name_only(signal.tool.as_deref()),
    }
}

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn handle_request(mut stream: TcpStream, app: &AppHandle) {
    let _ = stream.set_read_timeout(Some(Duration::from_millis(500)));
    let _ = stream.set_write_timeout(Some(Duration::from_millis(500)));
    let status = match read_request(&mut stream) {
        None => "400 Bad Request",
        Some((head, body)) => {
            let path = head
                .lines()
                .next()
                .and_then(|line| line.split_whitespace().nth(1))
                .unwrap_or("");
            let (path, query) = path.split_once('?').unwrap_or((path, ""));
            if let Some(rel) = path.strip_prefix("/skin/") {
                serve_skin(app, &mut stream, rel);
                return;
            }
            if let Some(folder) = path.strip_prefix("/skin-list/") {
                serve_skin_list(app, &mut stream, folder);
                return;
            }
            if path == "/status/" || path == "/status" {
                serve_statuses(app, &mut stream);
                return;
            }
            if path == "/show" {
                pet_to_front(app);
                let body = b"hereness";
                let _ = write ! (stream , "HTTP/1.1 200 OK\r\nX-Hereness: desk-pet-v1\r\nContent-Type: text/plain\r\nContent-Length: {}\r\nConnection: close\r\n\r\n" , body . len ()) ;
                let _ = stream.write_all(body);
                let _ = stream.flush();
                let _ = stream.shutdown(Shutdown::Write);
                return;
            }
            let state = match path.strip_prefix("/state/") {
                Some(name) if is_valid_state_name(name) => Some(Some(name.to_string())),
                _ if path == "/end" => Some(None),
                _ => None,
            };
            match state {
                Some(state) => {
                    let from = source_from_query(query);
                    if let Some((from, signal)) = signal_from_body(from, state, &body, || {
                        app.path().home_dir().ok().is_some_and(|home| {
                            cursor::is_connected(&hooks::CURSOR.settings_path(&home))
                        })
                    }) {
                        app.state::<signals::SignalLog>()
                            .push(signal_entry(&from, &signal));
                        let _ = app.emit("signal-logged", ());
                        #[cfg(debug_assertions)]
                        println!("[pet] {path} 会话={:?}", signal.session);
                        let _ = app.emit("pet-state", signal);
                    }
                    "204 No Content"
                }
                None => "404 Not Found",
            }
        }
    };
    let _ = write!(
        stream,
        "HTTP/1.1 {status}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
    );
    let _ = stream.flush();
    let _ = stream.shutdown(Shutdown::Write);
    let mut sink = [0u8; 512];
    while let Ok(n) = stream.read(&mut sink) {
        if n == 0 {
            break;
        }
    }
}

fn serve_skin(app: &AppHandle, stream: &mut TcpStream, rel: &str) {
    let decoded = percent_decode(rel);
    let lower = decoded.to_ascii_lowercase();
    let is_png = lower.ends_with(".png");
    let is_json = lower.ends_with("skin.json");
    let is_sound = sounds::is_sound(&lower);
    let bad = decoded.is_empty()
        || decoded.contains("..")
        || decoded.contains('\0')
        || decoded.starts_with('/')
        || decoded.starts_with('\\')
        || decoded.contains(':')
        || !is_plain_relative(&decoded)
        || !(is_png || is_json || is_sound);
    let reply = if bad {
        None
    } else {
        skins::skins_dir(app)
            .map(|dir| dir.join(&decoded))
            .and_then(|path| std::fs::read(path).ok())
    };
    match reply {
        Some(bytes) => {
            let ctype = if is_json {
                "application/json"
            } else if lower.ends_with(".mp3") {
                "audio/mpeg"
            } else if lower.ends_with(".wav") {
                "audio/wav"
            } else if lower.ends_with(".ogg") {
                "audio/ogg"
            } else {
                "image/png"
            };
            let _ = write ! (stream , "HTTP/1.1 200 OK\r\nContent-Type: {ctype}\r\nAccess-Control-Allow-Origin: *\r\nCache-Control: no-store\r\nContent-Length: {}\r\nConnection: close\r\n\r\n" , bytes . len ()) ;
            let _ = stream.write_all(&bytes);
        }
        None => {
            let _ = write!(
                stream,
                "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
            );
        }
    }
    let _ = stream.flush();
    let _ = stream.shutdown(Shutdown::Write);
}

fn skin_file_list(dir: &std::path::Path) -> Option<Vec<String>> {
    fn walk(dir: &std::path::Path, prefix: &str, out: &mut Vec<String>, depth: u32) {
        if depth > 3 || out.len() >= 2000 {
            return;
        }
        let Ok(entries) = std::fs::read_dir(dir) else {
            return;
        };
        for entry in entries.flatten() {
            if out.len() >= 2000 {
                return;
            }
            let name = entry.file_name().to_string_lossy().into_owned();
            if name.starts_with('.')
                || name.contains(['/', '\\', '%'])
                || name.chars().any(|c| c.is_control())
            {
                continue;
            }
            let rel = if prefix.is_empty() {
                name.clone()
            } else {
                format!("{prefix}/{name}")
            };
            if entry.path().is_dir() {
                walk(&entry.path(), &rel, out, depth + 1);
            } else if name.to_ascii_lowercase().ends_with(".png") {
                out.push(rel);
            }
        }
    }
    if !dir.is_dir() {
        return None;
    }
    let mut list = Vec::new();
    walk(dir, "", &mut list, 0);
    list.sort();
    Some(list)
}

fn serve_skin_list(app: &AppHandle, stream: &mut TcpStream, folder: &str) {
    let decoded = percent_decode(folder);
    let bad = decoded.is_empty()
        || decoded.contains("..")
        || decoded.contains('/')
        || decoded.contains('\\')
        || decoded.contains(':')
        || decoded.starts_with('.');
    let reply = if bad {
        None
    } else {
        skins::skins_dir(app).and_then(|dir| skin_file_list(&dir.join(&decoded)))
    };
    match reply {
        Some(list) => {
            let body = serde_json::to_string(&list).unwrap_or_else(|_| "[]".into());
            let _ = write ! (stream , "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\nConnection: close\r\n\r\n" , body . len ()) ;
            let _ = stream.write_all(body.as_bytes());
        }
        None => {
            let _ = write!(
                stream,
                "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
            );
        }
    }
    let _ = stream.flush();
    let _ = stream.shutdown(Shutdown::Write);
}

fn serve_statuses(app: &AppHandle, stream: &mut TcpStream) {
    let files = status::status_dir(app)
        .map(|dir| status::read_all(&dir))
        .unwrap_or_default();
    let body = serde_json::to_string(&serde_json :: json ! ({ "statuses" : files }))
        .unwrap_or_else(|_| "{\"statuses\":[]}".into());
    let _ = write ! (stream , "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nCache-Control: no-store\r\nContent-Length: {}\r\nConnection: close\r\n\r\n" , body . len ()) ;
    let _ = stream.write_all(body.as_bytes());
    let _ = stream.flush();
    let _ = stream.shutdown(Shutdown::Write);
}

fn is_plain_relative(path: &str) -> bool {
    std::path::Path::new(path)
        .components()
        .all(|c| matches!(c, std::path::Component::Normal(_)))
}

fn percent_decode(text: &str) -> String {
    let bytes = text.as_bytes();
    let mut out: Vec<u8> = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            let hex = std::str::from_utf8(&bytes[i + 1..i + 3]).ok();
            if let Some(byte) = hex.and_then(|h| u8::from_str_radix(h, 16).ok()) {
                out.push(byte);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn source_from_query(query: &str) -> &str {
    query
        .split('&')
        .find_map(|kv| kv.strip_prefix("from="))
        .filter(|s| {
            (1..=16).contains(&s.len())
                && s.bytes()
                    .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'_')
        })
        .unwrap_or("claude")
}

fn is_valid_state_name(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= 32
        && name
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'_')
}

#[tauri::command]
fn is_dev() -> bool {
    cfg!(debug_assertions)
}

#[tauri::command]
fn show_menu(window: tauri::Window) -> Result<(), String> {
    build_and_popup(&window).map_err(|e| e.to_string())
}

struct MenuTexts {
    settings: &'static str,
    mute: &'static str,
    quit: &'static str,
    test_next: &'static str,
    test_stop: &'static str,
}

fn menu_texts(zh: bool) -> MenuTexts {
    MenuTexts {
        settings: "Settings",
        mute: if zh { "静音" } else { "Mute" },
        quit: if zh { "退出" } else { "Quit" },
        test_next: if zh {
            "测试：切换到下一个状态"
        } else {
            "Test: switch to next state"
        },
        test_stop: if zh { "停止测试" } else { "Stop test" },
    }
}

fn connect_label(zh: bool, name: &str, installed: bool) -> String {
    match (zh, installed) {
        (true, true) => format!("连接 {}", name),
        (true, false) => format!("连接 {}（没找到 {}）", name, name),
        (false, true) => format!("Connect {}", name),
        (false, false) => format!("Connect {} (not found)", name),
    }
}

fn pet_to_front(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}

fn pet_to_front_from_tray(app: &AppHandle) {
    let app = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_millis(250));
        let app2 = app.clone();
        let _ = app.run_on_main_thread(move || pet_to_front(&app2));
    });
}

fn build_and_popup(window: &tauri::Window) -> tauri::Result<()> {
    let menu = build_menu(window.app_handle())?;
    window.popup_menu(&menu)
}

fn build_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let menu = Menu::new(app)?;
    let zh = zh(app);
    let texts = menu_texts(zh);
    for agent in agent_infos(app) {
        let enabled = agent.installed;
        let connected = agent.connected;
        let label = connect_label(zh, &agent.name, enabled);
        let id = format!("connect:{}", agent.id);
        menu.append(&CheckMenuItem::with_id(
            app,
            id,
            label,
            enabled,
            connected,
            None::<&str>,
        )?)?;
    }
    menu.append(&PredefinedMenuItem::separator(app)?)?;
    menu.append(&MenuItem::with_id(
        app,
        "settings",
        texts.settings,
        true,
        None::<&str>,
    )?)?;
    menu.append(&CheckMenuItem::with_id(
        app,
        "mute",
        texts.mute,
        true,
        prefs::load(app).muted,
        None::<&str>,
    )?)?;
    menu.append(&PredefinedMenuItem::separator(app)?)?;
    let version = format!("{DISPLAY_NAME} {}", app.package_info().version);
    menu.append(&MenuItem::with_id(
        app,
        "version",
        version,
        false,
        None::<&str>,
    )?)?;
    menu.append(&PredefinedMenuItem::separator(app)?)?;
    if cfg!(debug_assertions) {
        menu.append(&MenuItem::with_id(
            app,
            "test_next",
            texts.test_next,
            true,
            None::<&str>,
        )?)?;
        menu.append(&MenuItem::with_id(
            app,
            "test_stop",
            texts.test_stop,
            true,
            None::<&str>,
        )?)?;
        menu.append(&PredefinedMenuItem::separator(app)?)?;
    }
    menu.append(&MenuItem::with_id(
        app,
        "quit",
        texts.quit,
        true,
        None::<&str>,
    )?)?;
    Ok(menu)
}

fn tray_tooltip(zh: bool) -> &'static str {
    if zh {
        "在呢"
    } else {
        "Hereness"
    }
}

#[cfg(debug_assertions)]
fn trace_tray(line: &str) {
    eprintln!("[tray] {line}");
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let menu = build_menu(app)?;
    let _tray = TrayIconBuilder::with_id("pet-tray")
        .show_menu_on_left_click(false)
        .menu(&menu)
        .tooltip(tray_tooltip(zh(app)))
        .icon(tauri::image::Image::from_bytes(include_bytes!(
            "../icons/tray-32.png"
        ))?)
        .icon_as_template(false)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                #[cfg(debug_assertions)]
                trace_tray("左键：把小猫叫到最前面");
                pet_to_front_from_tray(tray.app_handle());
            }
        })
        .build(app);
    #[cfg(debug_assertions)]
    trace_tray(&format!(
        "build 回来了：{:?}",
        _tray.as_ref().map(|_| "ok").map_err(|e| e.to_string())
    ));
    _tray?;
    Ok(())
}

fn on_menu(app: &AppHandle, event: MenuEvent) {
    let id = event.id().as_ref();
    if let Some(agent) = id
        .strip_prefix("connect:")
        .and_then(|a| hooks::AGENTS.iter().find(|x| x.id == a))
    {
        toggle_connect(app, agent);
        return;
    }
    if id == "ds_price" {
        toggle_ds_price(app);
        return;
    }
    if id == "bubble_privacy" {
        let on = !bubble::privacy(app);
        if let Err(e) = bubble::set_privacy(app, on) {
            tell(
                app,
                (
                    format!("设置没存上，已保留原值。\n\n{e}"),
                    format!(
                        "Settings could not be saved. The previous value has been kept.\n\n{e}"
                    ),
                ),
                true,
            );
            return;
        }
        let _ = app.emit("bubble-privacy-changed", on);
        return;
    }
    if let Some(picked) = id.strip_prefix("status:") {
        if let Err(e) = status::choose(app, picked) {
            tell (app , (format ! ("状态提示的选择没能记住，下次启动可能恢复原样。\n\n{e}") , format ! ("The status choice could not be saved, so it may go back to what it was after a restart.\n\n{e}") ,) , true ,) ;
        }
        return;
    }
    match id {
        "mute" => {
            let mut p = prefs::current(app);
            p.muted = !p.muted;
            match prefs::prefs_set(app.clone(), p) {
                Err(e) => tell(
                    app,
                    (
                        format!("静音设置没能保存。\n\n{e}"),
                        format!("The mute setting could not be saved.\n\n{e}"),
                    ),
                    true,
                ),
                Ok(result) => tell_system_failures(app, &result.failures),
            }
        }
        "settings" => {
            let _ = show_settings(app.clone(), None);
        }
        "quit" => {
            remember_position(app);
            app.exit(0)
        }
        "test_next" => {
            let _ = app.emit("pet-test-next", ());
        }
        "test_stop" => {
            let _ = app.emit("pet-test-stop", ());
        }
        _ => {}
    }
}

fn toggle_ds_price(app: &AppHandle) {
    let on = !ds_price::is_on(app);
    if let Err(e) = ds_price::set_on_and_tell(app, on) {
        tell(
            app,
            (
                format!("设置没存上，已保留原值。\n\n{e}"),
                format!("Settings could not be saved. The previous value has been kept.\n\n{e}"),
            ),
            true,
        );
    }
}

#[derive(Default)]
struct PendingSettingsTab(std::sync::Mutex<Option<String>>);

#[tauri::command]
fn settings_take_tab(state: tauri::State<PendingSettingsTab>) -> Option<String> {
    state.0.lock().ok().and_then(|mut slot| slot.take())
}

fn settings_tab(tab: Option<String>) -> Option<String> {
    tab.map(|t| t.trim().to_string())
        .filter(|t| matches!(t.as_str(), "global" | "style" | "about"))
}

fn open_settings(app: &AppHandle, tab: Option<String>) -> Result<(), String> {
    let tab = settings_tab(tab);
    if let Some(win) = app.get_webview_window("settings") {
        win.show().map_err(|e| e.to_string())?;
        win.unminimize().map_err(|e| e.to_string())?;
        win.set_focus().map_err(|e| e.to_string())?;
        apply_taskbar_windows(app, &prefs::current(app), Some("settings"));
        if let Some(tab) = tab {
            let _ = app.emit("settings-tab", tab);
        }
        return Ok(());
    }
    if let Some(tab) = tab {
        if let Ok(mut slot) = app.state::<PendingSettingsTab>().0.lock() {
            *slot = Some(tab);
        }
    }
    tauri::WebviewWindowBuilder::new(
        app,
        "settings",
        tauri::WebviewUrl::App("settings.html".into()),
    )
    .title("在呢 | Hereness · Settings")
    .skip_taskbar(true)
    .inner_size(1040.0, 600.0)
    .min_inner_size(520.0, 380.0)
    .center()
    .build()
    .map_err(|e| e.to_string())?;
    apply_taskbar_windows(app, &prefs::current(app), Some("settings"));
    Ok(())
}

#[tauri::command]
fn show_settings(app: AppHandle, tab: Option<String>) -> Result<(), String> {
    let app2 = app.clone();
    std::thread::spawn(move || {
        if let Err(e) = open_settings(&app2, tab) {
            tell(
                &app2,
                (
                    format!("设置窗口打不开：{e}"),
                    format!("Could not open the Settings window: {e}"),
                ),
                true,
            );
        }
    });
    Ok(())
}

#[tauri::command]
fn show_codex_trust(app: AppHandle) -> Result<(), String> {
    let app2 = app.clone();
    std::thread::spawn(move || {
        if let Err(e) = open_codex_trust(app2) {
            eprintln!("打开 Codex 信任步骤窗口失败：{e}");
        }
    });
    Ok(())
}

fn open_codex_trust(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("codex-trust") {
        let _ = win.show();
        let _ = win.set_focus();
        apply_taskbar_windows(&app, &prefs::current(&app), Some("codex-trust"));
        return Ok(());
    }
    let title = if prefs::load(&app).zh() {
        "在呢 | Hereness · Codex 信任步骤"
    } else {
        "在呢 | Hereness · Codex trust steps"
    };
    tauri::WebviewWindowBuilder::new(
        &app,
        "codex-trust",
        tauri::WebviewUrl::App("codex-trust.html".into()),
    )
    .title(title)
    .skip_taskbar(true)
    .inner_size(580.0, 480.0)
    .min_inner_size(460.0, 400.0)
    .build()
    .map_err(|e| e.to_string())?;
    apply_taskbar_windows(&app, &prefs::current(&app), Some("codex-trust"));
    Ok(())
}

fn taskbar_skips(hide_main: bool, active_aux: Option<&str>) -> (bool, bool, bool) {
    (
        hide_main || active_aux.is_some(),
        active_aux != Some("settings"),
        active_aux != Some("codex-trust"),
    )
}

fn open_aux<'a>(
    prefer: Option<&'a str>,
    is_open: impl Fn(&str) -> bool,
    closing: Option<&str>,
) -> Option<&'a str> {
    let open = |label: &str| Some(label) != closing && is_open(label);
    prefer
        .filter(|l| open(l))
        .or_else(|| ["settings", "codex-trust"].into_iter().find(|l| open(l)))
}

#[cfg(target_os = "windows")]
fn raise_main_under(app: &AppHandle, aux: &tauri::WebviewWindow) {
    let prefs = prefs::load(app);
    if prefs.hide_from_taskbar || prefs.pin == "top" {
        return;
    }
    let Some(main) = app.get_webview_window("main") else {
        return;
    };
    if !main.is_visible().unwrap_or(false) {
        return;
    }
    let _ = main.set_always_on_top(true);
    let _ = main.set_always_on_top(false);
    let _ = aux.set_always_on_top(true);
    let _ = aux.set_always_on_top(false);
}

fn on_aux_window_event(win: &tauri::Window, event: &tauri::WindowEvent) {
    let label = win.label();
    if label != "settings" && label != "codex-trust" {
        return;
    }
    let app = win.app_handle();
    match event {
        #[cfg(target_os = "windows")]
        tauri::WindowEvent::Focused(true) => {
            if let Some(aux) = app.get_webview_window(label) {
                raise_main_under(app, &aux);
            }
        }
        tauri::WindowEvent::Destroyed => {
            apply_taskbar_windows_closing(app, &prefs::current(app), None, Some(label));
        }
        _ => {}
    }
}

fn apply_taskbar_windows(app: &AppHandle, prefs: &prefs::Prefs, prefer: Option<&str>) {
    apply_taskbar_windows_closing(app, prefs, prefer, None);
}

#[derive(Default)]
struct TaskbarApplied(std::sync::Mutex<std::collections::BTreeMap<String, bool>>);

fn apply_taskbar_windows_closing(
    app: &AppHandle,
    prefs: &prefs::Prefs,
    prefer: Option<&str>,
    closing: Option<&str>,
) {
    let snapshot = app
        .state::<TaskbarApplied>()
        .0
        .lock()
        .map(|known| known.clone())
        .unwrap_or_default();
    let result = settings_write::apply_with_restore(
        (),
        (),
        || apply_taskbar_raw(app, prefs, prefer, closing),
        || restore_taskbar_plan(app, &snapshot),
    );
    if let Some(error) = result.error {
        let unknown = result.actual.is_none();
        if let Ok(mut fields) = app.state::<prefs::SystemUnknowns>().0.lock() {
            fields.retain(|field| field != "hide_from_taskbar");
            if unknown {
                fields.push("hide_from_taskbar".into());
            }
        }
        let failures = vec![prefs::ApplyFailure {
            field: "hide_from_taskbar".into(),
            error,
            unknown,
        }];
        let _ = app.emit("system-apply-failed", &failures);
        tell_system_failures(app, &failures);
    }
}

fn apply_taskbar_raw(
    app: &AppHandle,
    prefs: &prefs::Prefs,
    prefer: Option<&str>,
    closing: Option<&str>,
) -> Result<(), String> {
    if cfg!(target_os = "macos") {
        return Ok(());
    }
    let active_aux = open_aux(prefer, |l| app.get_webview_window(l).is_some(), closing);
    let (main_skip, settings_skip, trust_skip) = taskbar_skips(prefs.hide_from_taskbar, active_aux);
    apply_taskbar_plan(
        app,
        &[
            ("main", main_skip),
            ("settings", settings_skip),
            ("codex-trust", trust_skip),
        ],
    )
}

fn apply_taskbar_plan(app: &AppHandle, plan: &[(&str, bool)]) -> Result<(), String> {
    let mut errors = Vec::new();
    for &(label, skip) in plan {
        if let Some(win) = app.get_webview_window(label) {
            let applied = win.set_skip_taskbar(skip);
            if let Ok(mut known) = app.state::<TaskbarApplied>().0.lock() {
                if applied.is_ok() {
                    known.insert(label.into(), skip);
                } else {
                    known.remove(label);
                }
            }
            if let Err(error) = applied {
                errors.push(format!("{label}: {error}"));
            }
        }
    }
    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors.join("; "))
    }
}

fn restore_taskbar_plan(
    app: &AppHandle,
    snapshot: &std::collections::BTreeMap<String, bool>,
) -> Result<(), String> {
    let mut plan = Vec::new();
    for label in ["main", "settings", "codex-trust"] {
        if app.get_webview_window(label).is_some() {
            plan.push((
                label,
                *snapshot
                    .get(label)
                    .ok_or("改动前的任务栏状态未知 / Previous taskbar state is unknown")?,
            ));
        }
    }
    apply_taskbar_plan(app, &plan)
}

pub fn apply_prefs(
    app: &AppHandle,
    prefs: &prefs::Prefs,
    previous: &prefs::Prefs,
) -> prefs::SaveOutcome {
    let mut result = prefs::SaveOutcome {
        prefs: prefs.clone(),
        failures: Vec::new(),
    };
    if let Some(tray) = app.tray_by_id("pet-tray") {
        let _ = tray.set_tooltip(Some(tray_tooltip(prefs.zh())));
        if let Ok(menu) = build_menu(app) {
            let _ = tray.set_menu(Some(menu));
        }
    }
    let Some(win) = app.get_webview_window("main") else {
        for field in ["size", "pin", "hide_from_taskbar"] {
            result.failures.push(prefs::ApplyFailure {
                field: field.into(),
                error: "桌宠窗口不存在 / Pet window is unavailable".into(),
                unknown: true,
            });
        }
        result.prefs.size = previous.size.clone();
        result.prefs.pin = previous.pin.clone();
        result.prefs.hide_from_taskbar = previous.hide_from_taskbar;
        record_system_state(app, &result);
        return result;
    };
    let (_, w, h) = prefs::size_px(&prefs.size);
    let size = settings_write::apply_checked(
        prefs.size.clone(),
        || {
            win.set_size(tauri::LogicalSize::new(w, h))
                .map_err(|e| e.to_string())
        },
        || {
            let actual = win.inner_size().map_err(|e| e.to_string())?;
            prefs::size_from_window(
                actual.width,
                actual.height,
                win.scale_factor().map_err(|e| e.to_string())?,
            )
        },
    );
    let size_unknown = size.actual.is_none();
    result.prefs.size = size.actual.unwrap_or_else(|| previous.size.clone());
    if let Some(error) = size.error {
        result.failures.push(prefs::ApplyFailure {
            field: "size".into(),
            error,
            unknown: size_unknown,
        });
    }
    let pin = settings_write::apply_checked(
        prefs.pin == "top",
        || {
            win.set_always_on_top(prefs.pin == "top")
                .map_err(|e| e.to_string())
        },
        || win.is_always_on_top().map_err(|e| e.to_string()),
    );
    result.prefs.pin = match pin.actual {
        Some(true) => "top".into(),
        Some(false) if pin.error.is_none() && prefs.pin != "top" => prefs.pin.clone(),
        Some(false) => if previous.pin == "quiet" {
            "quiet"
        } else {
            "normal"
        }
        .into(),
        None => previous.pin.clone(),
    };
    if let Some(error) = pin.error {
        result.failures.push(prefs::ApplyFailure {
            field: "pin".into(),
            error,
            unknown: pin.actual.is_none(),
        });
    }
    let snapshot = app
        .state::<TaskbarApplied>()
        .0
        .lock()
        .map(|known| known.clone())
        .unwrap_or_default();
    let taskbar = settings_write::apply_with_restore(
        prefs.hide_from_taskbar,
        previous.hide_from_taskbar,
        || apply_taskbar_raw(app, prefs, Some("settings"), None),
        || restore_taskbar_plan(app, &snapshot),
    );
    result.prefs.hide_from_taskbar = taskbar.actual.unwrap_or(previous.hide_from_taskbar);
    if let Some(error) = taskbar.error {
        result.failures.push(prefs::ApplyFailure {
            field: "hide_from_taskbar".into(),
            error,
            unknown: taskbar.actual.is_none(),
        });
    }
    record_system_state(app, &result);
    result
}

fn record_system_state(app: &AppHandle, result: &prefs::SaveOutcome) {
    if let Ok(mut fields) = app.state::<prefs::SystemUnknowns>().0.lock() {
        *fields = result
            .failures
            .iter()
            .filter(|issue| issue.unknown)
            .map(|issue| issue.field.clone())
            .collect();
    }
    if let Ok(mut actual) = app.state::<prefs::SystemUnknowns>().1.lock() {
        *actual = Some(result.prefs.clone());
    }
}

fn tell_system_failures(app: &AppHandle, failures: &[prefs::ApplyFailure]) {
    if failures.is_empty() {
        return;
    }
    let names = |en: bool| {
        failures
            .iter()
            .map(|issue| match (issue.field.as_str(), en) {
                ("size", false) => "大小",
                ("size", true) => "Size",
                ("pin", false) => "置顶",
                ("pin", true) => "Always on top",
                ("hide_from_taskbar", false) => "任务栏",
                ("hide_from_taskbar", true) => "Taskbar",
                (_, false) => "设置",
                (_, true) => "Settings",
            })
            .collect::<Vec<_>>()
            .join(", ")
    };
    tell (app , (format ! ("{} 未能应用；无法查询或恢复的项目状态未知。可以退出桌宠再打开试一次。" , names (false)) , format ! ("{} could not be applied; items that could not be checked or restored have unknown status. Quit the pet and open it again to retry." , names (true))) , true) ;
}

pub fn apply_autostart(app: &AppHandle, on: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    let manager = app.autolaunch();
    let now = manager.is_enabled().map_err(|e| e.to_string())?;
    if on != now {
        if on {
            manager.enable()
        } else {
            manager.disable()
        }
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn autostart_get(app: AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().is_enabled().map_err(|e| e.to_string())
}

#[tauri::command]
fn autostart_set(app: AppHandle, on: bool) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    let manager = app.autolaunch();
    settings_write::commit(
        || {
            settings_write::autostart(
                is_dev(),
                on,
                || manager.is_enabled().map_err(|e| e.to_string()),
                |value| {
                    (if value {
                        manager.enable()
                    } else {
                        manager.disable()
                    })
                    .map_err(|e| e.to_string())
                },
                |actual| {
                    let mut p = prefs::current(&app);
                    p.autostart = actual;
                    prefs::save(&app, &p)
                },
            )
        },
        |_| {
            let _ = app.emit("prefs-changed", prefs::view(&app));
        },
    )
}

pub fn remember_position(app: &AppHandle) {
    let mut p = prefs::current(app);
    if !p.remember_position {
        return;
    }
    if let Some(win) = app.get_webview_window("main") {
        if let Ok(pos) = win.outer_position() {
            p.last_x = pos.x;
            p.last_y = pos.y;
            p.has_position = true;
            let _ = prefs::save(app, &p);
        }
    }
}

#[derive(serde :: Serialize)]
struct AgentInfo {
    id: String,
    name: String,
    installed: bool,
    connected: bool,
}

fn agent_is_listed(id: &str, connected: bool) -> bool {
    id != "qwen" || connected
}

fn connected_count(agents: &[AgentInfo]) -> usize {
    agents.iter().filter(|a| a.connected).count()
}

fn emit_agents_changed(app: &AppHandle) {
    let connected = connected_count(&agent_infos(app));
    let _ = app.emit("agents-changed", connected);
}

fn agent_infos(app: &AppHandle) -> Vec<AgentInfo> {
    let home = app.path().home_dir().ok();
    hooks::AGENTS
        .iter()
        .map(|a| {
            let installed = home.as_ref().map(|h| a.installed(h)).unwrap_or(false);
            let connected = home
                .as_ref()
                .map(|h| agent_connected(app, a, h))
                .unwrap_or(false);
            AgentInfo {
                id: a.id.into(),
                name: a.name.into(),
                installed,
                connected,
            }
        })
        .filter(|a| agent_is_listed(&a.id, a.connected))
        .collect()
}

#[tauri::command]
fn agent_list(app: AppHandle) -> Vec<AgentInfo> {
    agent_infos(&app)
}

#[tauri::command]
fn agent_toggle(app: AppHandle, id: String) -> Vec<AgentInfo> {
    if let Some(agent) = hooks::AGENTS.iter().find(|a| a.id == id) {
        toggle_connect(&app, agent);
    }
    agent_infos(&app)
}

#[derive(serde :: Serialize)]
struct SettingsInit {
    is_dev: bool,
    system_unknown: Vec<String>,
    prefs: prefs::Prefs,
    version: String,
    agents: Vec<AgentInfo>,
    statuses: Vec<status::StatusItem>,
    status: String,
    ds_price: bool,
    privacy: bool,
    folder_names: std::collections::BTreeMap<String, String>,
    known_folders: Vec<String>,
    settings_dir_exists: bool,
    cache_dir_exists: bool,
}

#[tauri::command]
fn settings_init(app: AppHandle) -> SettingsInit {
    let (settings_dir_exists, cache_dir_exists) = storage::exists_pair(&app);
    SettingsInit {
        is_dev: is_dev(),
        system_unknown: app
            .state::<prefs::SystemUnknowns>()
            .0
            .lock()
            .map(|fields| fields.clone())
            .unwrap_or_default(),
        prefs: prefs::current(&app),
        version: app.package_info().version.to_string(),
        agents: agent_infos(&app),
        statuses: app.state::<status::StatusList>().snapshot(),
        status: status::current(&app),
        ds_price: ds_price::is_on(&app),
        privacy: bubble::privacy(&app),
        folder_names: bubble::folder_names(&app),
        known_folders: folders::list(&app),
        settings_dir_exists,
        cache_dir_exists,
    }
}

#[tauri::command]
fn open_url(app: AppHandle, url: String) -> Result<(), String> {
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err("只允许打开 http / https 链接".into());
    }
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| e.to_string())
}

fn settings_path(app: &AppHandle, agent: &hooks::Agent) -> Option<std::path::PathBuf> {
    app.path().home_dir().ok().map(|h| agent.settings_path(&h))
}

fn agent_connected(app: &AppHandle, agent: &hooks::Agent, home: &std::path::Path) -> bool {
    let patch = agent.settings_path(home);
    if agent.id == "dsh" {
        app.path().app_config_dir().ok().is_some_and(|dir| {
            dsh_hooks::is_connected(&patch, &dir.join("hereness-dsh-hooks.json"))
        })
    } else {
        hooks::connected(agent, &patch)
    }
}

fn toggle_dsh(app: &AppHandle) {
    let (Ok(home), Ok(dir)) = (app.path().home_dir(), app.path().app_config_dir()) else {
        tell(
            app,
            (
                "找不到用户或桌宠设置文件夹，没法连接 DSH。".into(),
                "Can't find the home or pet settings folder to connect DSH.".into(),
            ),
            true,
        );
        return;
    };
    let patch = hooks::DSH.settings_path(&home);
    let config = dir.join("hereness-dsh-hooks.json");
    let connected = dsh_hooks::is_connected(&patch, &config);
    let result = if connected {
        dsh_hooks::disconnect(&patch, &config)
    } else {
        dsh_hooks::connect(&patch, &config)
    };
    match result {
        Ok(()) => tell(
            app,
            if connected {
                (
                    "已断开 DSH。要重启 DSH 才生效。".into(),
                    "Disconnected from DSH. Restart DSH for this to take effect.".into(),
                )
            } else {
                ("已连接 DSH！要重启 DSH 才生效。\n\nDSH 干活时小猫会跟着动，但不会举手。原来的设置已备份到同一文件夹的 cordis.patch.yml.hereness.bak。" . into () , "Connected to DSH! Restart DSH for this to take effect.\n\nThe pet follows DSH's work, but has no approval signal. Your settings were backed up next to the file as cordis.patch.yml.hereness.bak." . into ())
            },
            false,
        ),
        Err(e) => tell(
            app,
            (
                format!("DSH 连接设置失败：{e}\n文件位置：{}", patch.display()),
                format!(
                    "Could not change the DSH connection: {e}\nFile: {}",
                    patch.display()
                ),
            ),
            true,
        ),
    }
}

fn toggle_connect(app: &AppHandle, agent: &hooks::Agent) {
    if agent.id == "dsh" {
        toggle_dsh(app);
        emit_agents_changed(app);
        return;
    }
    let name = agent.name;
    let Some(path) = settings_path(app, agent) else {
        tell(
            app,
            (
                format!("找不到用户文件夹，没法连接 {name}。"),
                format!("Can't find your home folder, so {name} can't be connected."),
            ),
            true,
        );
        return;
    };
    if hooks::connected(agent, &path) {
        match hooks :: disconnect (agent , & path) { Ok (()) => tell (app , disconnected_text (agent) , false) , Err (e) => tell (app , (format ! ("断开失败，设置文件没有改动。\n\n{e}\n文件位置：{}" , path . display ()) , format ! ("Could not disconnect, so your settings file was left unchanged.\n\n{e}\nFile: {}" , path . display ()) ,) , true ,) , }
    } else {
        connect_and_tell(app, agent, &path);
    }
    emit_agents_changed(app);
}

fn connect_and_tell(app: &AppHandle, agent: &hooks::Agent, path: &std::path::Path) {
    let backup = hooks::backup_path(path);
    let backup = backup.file_name().and_then(|n| n.to_str()).unwrap_or("");
    match hooks::connect(agent, path) {
        Ok(()) => {
            if agent.id == hooks::CODEX.id
                && app
                    .path()
                    .app_config_dir()
                    .is_ok_and(|dir| first_codex_trust(&dir.join(CODEX_TRUST_SHOWN_FILE)))
            {
                let app2 = app.clone();
                std::thread::spawn(move || {
                    if let Err(e) = open_codex_trust(app2) {
                        eprintln!("打开 Codex 信任步骤窗口失败：{e}");
                    }
                });
                return;
            }
            tell(app, connected_text(agent, backup), false)
        }
        Err(e) => tell(
            app,
            (
                format!(
                    "连接失败，设置文件没有改动。\n\n{e}\n文件位置：{}",
                    path.display()
                ),
                format!(
                    "Could not connect, so your settings file was left unchanged.\n\n{e}\nFile: {}",
                    path.display()
                ),
            ),
            true,
        ),
    }
}

const CODEX_RESTART: (&str, &str) = (
    "要重开 Codex 才生效。",
    "Restart Codex for this to take effect.",
);

fn connected_text(agent: &hooks::Agent, backup: &str) -> (String, String) {
    let name = agent.name;
    let codex = agent.id == hooks::CODEX.id;
    let (zh_restart, en_restart) = if codex {
        (CODEX_RESTART.0.to_string(), format!(" {}", CODEX_RESTART.1))
    } else {
        (String::new(), String::new())
    };
    let mut zh = format ! ("已连接 {name}！{zh_restart}\n\n{name} 干活时，桌宠会跟着动。设置文件里原有的内容都保留着，改动前的版本（如果有）备份在同一文件夹的 {backup}。\n\n以后想断开，右键小猫就能找到。") ;
    let mut en = format ! ("Connected to {name}!{en_restart}\n\nThe pet will follow along while {name} works. Everything that was already in your settings file is kept, and the version from before the change (if there was one) is backed up next to it as {backup}.\n\nTo disconnect later, right-click the pet.") ;
    if codex {
        zh.push_str(CODEX_TRUST_HINT.0);
        en.push_str(CODEX_TRUST_HINT.1);
    }
    (zh, en)
}

fn disconnected_text(agent: &hooks::Agent) -> (String, String) {
    let name = agent.name;
    if agent.id == hooks::CODEX.id {
        return (format ! ("已断开 {name}。{}\n\n重开以后，桌宠就不再跟着 {name} 动了。设置文件里的其他内容没有改动。" , CODEX_RESTART . 0) , format ! ("Disconnected from {name}. {}\n\nAfter that, the pet will no longer react to {name}. Nothing else in your settings file was changed." , CODEX_RESTART . 1) ,) ;
    }
    (format ! ("已断开 {name}。\n\n桌宠不会再跟着 {name} 动了，设置文件里的其他内容没有改动。") , format ! ("Disconnected from {name}.\n\nThe pet will no longer react to {name}. Nothing else in your settings file was changed.") ,)
}

const CODEX_TRUST_SHOWN_FILE: &str = "codex-trust-shown";

const CODEX_TRUST_HINT : (& str , & str) = ("\n\n如果重开 Codex 以后桌宠还是没反应，打开设置 → 全局 → 监控 Agent，点 Codex 那行的「信任步骤」再做一遍。" , "\n\nIf the pet still doesn't react after you restart Codex, open Settings → General → Monitored agents and click \"Trust steps\" on the Codex line to do it again." ,) ;

fn first_codex_trust(marker: &std::path::Path) -> bool {
    if marker.exists() {
        return false;
    }
    if let Some(dir) = marker.parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    let _ = std::fs::write(marker, "");
    true
}

fn zh(app: &AppHandle) -> bool {
    prefs::load(app).zh()
}

fn tell(app: &AppHandle, text: (String, String), is_error: bool) {
    let text = if zh(app) { text.0 } else { text.1 };
    let kind = if is_error {
        MessageDialogKind::Error
    } else {
        MessageDialogKind::Info
    };
    app.dialog()
        .message(text)
        .title(DISPLAY_NAME)
        .kind(kind)
        .show(|_| {});
}

fn take_singleton(port: u16) -> Option<TcpListener> {
    match TcpListener::bind(("127.0.0.1", port)) {
        Ok(l) => Some(l),
        Err(e) => {
            eprintln!("[pet] 收信口 {port} 已被占用：{e}");
            None
        }
    }
}

fn summon_existing(port: u16) -> bool {
    let Ok(mut stream) = TcpStream::connect(("127.0.0.1", port)) else {
        return false;
    };
    let _ = stream.set_read_timeout(Some(Duration::from_millis(800)));
    let _ = stream.set_write_timeout(Some(Duration::from_millis(800)));
    let req = format!("GET /show HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nConnection: close\r\n\r\n");
    if stream.write_all(req.as_bytes()).is_err() {
        return false;
    }
    let mut reply = Vec::new();
    let mut buf = [0u8; 256];
    while reply.len() < 2048 {
        match stream.read(&mut buf) {
            Ok(0) | Err(_) => break,
            Ok(n) => reply.extend_from_slice(&buf[..n]),
        }
    }
    let Ok(reply) = std::str::from_utf8(&reply) else {
        return false;
    };
    let Some((head, body)) = reply.split_once("\r\n\r\n") else {
        return false;
    };
    let mut lines = head.lines();
    let Some(status) = lines.next() else {
        return false;
    };
    let mut words = status.split_whitespace();
    if !matches!(words.next(), Some("HTTP/1.0" | "HTTP/1.1")) || words.next() != Some("200") {
        return false;
    }
    lines.any(|line| {
        line.split_once(':').is_some_and(|(name, value)| {
            name.eq_ignore_ascii_case("X-Hereness") && value.trim() == "desk-pet-v1"
        })
    }) || matches!(body, "hereness" | "agent-desk-pet")
}

fn tell_port_busy(app: &AppHandle) {
    let text = if zh(app) {
        format ! ("端口 127.0.0.1:{PET_PORT} 被别的程序占着，桌宠这次收不到 agent 的信号——小猫还在，但不会跟着 Claude Code / Codex 动了。\n\n把占用的程序关掉，再重新启动桌宠就能恢复。")
    } else {
        format ! ("Port 127.0.0.1:{PET_PORT} is taken by another program, so the pet can't receive agent signals this time — it still shows up, but won't react to Claude Code / Codex.\n\nQuit whatever is using the port and start the pet again.")
    };
    tell(app, (text.clone(), text), true);
}

#[cfg(all(target_os = "macos", not(debug_assertions)))]
fn seed_bundled_assets(app: &AppHandle) {
    let (Ok(resources), Ok(config)) = (app.path().resource_dir(), app.path().app_config_dir())
    else {
        eprintln ! ("[pet] 补自带皮肤/状态提示：拿不到 .app 的资源文件夹或用户文件夹，跳过（按找不到皮肤处理）");
        return;
    };
    let skins = skins::copy_missing_skins(
        &resources.join(skins::SKINS_DIR),
        &config.join(skins::SKINS_DIR),
    );
    let statuses = status::copy_missing_statuses(
        &resources.join(status::STATUS_DIR),
        &config.join(status::STATUS_DIR),
    );
    println!(
        "[pet] 补自带皮肤/状态提示：皮肤 {} 只、状态提示 {} 份（{}）",
        skins,
        statuses,
        config.display()
    );
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let listener = match take_singleton(PET_PORT) {
        Some(l) => Some(l),
        None => {
            if summon_existing(PET_PORT) {
                std::process::exit(0);
            }
            std::thread::sleep(Duration::from_millis(300));
            take_singleton(PET_PORT)
        }
    };
    tauri :: Builder :: default () . plugin (tauri_plugin_opener :: init ()) . plugin (tauri_plugin_dialog :: init ()) . plugin (tauri_plugin_clipboard_manager :: init ()) . plugin (tauri_plugin_autostart :: init (tauri_plugin_autostart :: MacosLauncher :: LaunchAgent , None ,)) . manage (status :: StatusList :: default ()) . manage (folders :: KnownFolders :: default ()) . manage (prefs :: SystemUnknowns :: default ()) . manage (TaskbarApplied :: default ()) . manage (PendingSettingsTab :: default ()) . manage (signals :: SignalLog :: default ()) . on_window_event (on_aux_window_event) . setup (move | app | { if let Err (e) = folders :: initialize (app . handle ()) { tell (app . handle () , (format ! ("项目名单和昵称这次已停用，桌宠照常运行。原文件未改动，请检查 folder-names.json 后重启。\n\n{e}") , format ! ("Project names are disabled for this run. The pet will keep running. The original file is unchanged; check folder-names.json and restart.\n\n{e}") ,) , true) ; } if listener . is_none () { tell_port_busy (app . handle ()) ; } # [cfg (all (target_os = "macos" , not (debug_assertions)))] seed_bundled_assets (app . handle ()) ; start_state_server (app . handle () . clone () , listener) ; if let Err (e) = build_tray (app . handle ()) { tell (app . handle () , (format ! ("托盘图标这次没建起来：{e}") , format ! ("The tray icon could not be created this time: {e}")) , true) ; } let p = prefs :: load (app . handle ()) ; let applied = apply_prefs (app . handle () , & p , & p) ; tell_system_failures (app . handle () , & applied . failures) ; if p . remember_position && p . has_position { if let Some (win) = app . get_webview_window ("main") { let _ = win . set_position (tauri :: PhysicalPosition :: new (p . last_x , p . last_y)) ; } } if let Err (e) = settings_write :: autostart_at_startup (is_dev () , | | apply_autostart (app . handle () , p . autostart)) { tell (app . handle () , (format ! ("无法应用开机自启设置：{e}") , format ! ("Could not apply launch at login: {e}")) , true) ; } emit_agents_changed (app . handle ()) ; Ok (()) }) . on_menu_event (on_menu) . invoke_handler (tauri :: generate_handler ! [is_dev , autostart_get , autostart_set , show_menu , open_url , storage :: open_bundled_license , ds_price :: ds_price_on , status :: set_statuses , status :: status_get , status :: status_set , bubble :: bubble_privacy , bubble :: bubble_folder_names , bubble :: bubble_set_folder_name , show_settings , settings_take_tab , show_codex_trust , agent_list , agent_toggle , prefs :: prefs_get , prefs :: prefs_set , prefs :: prefs_system_language , settings_init , folders :: forget_known_folder , folders :: scan_folders , ds_price :: ds_price_set , status :: status_list , status :: open_status_folder , bubble :: bubble_set_privacy , skins :: skins_list , skins :: skins_available , skins :: skin_pivot , skins :: skin_overrides , skins :: skin_choice , skins :: skin_rows , skins :: skin_row_enabled , skins :: skin_rows_off , skins :: open_skins_folder , sounds :: skin_sound_rows , sounds :: skin_sounds , sounds :: skin_sound_choice , sounds :: skin_sound_reset , storage :: open_data_folder , signals :: recent_signals]) . run (tauri :: generate_context ! ()) . expect ("error while running tauri application") ;
}
