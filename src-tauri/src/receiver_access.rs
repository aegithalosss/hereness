use std::sync::OnceLock;

pub const WINDOWS_ORIGIN: &str = "http://tauri.localhost";

pub const MAC_ORIGIN: &str = "tauri://localhost";

pub fn dev_origin(debug: bool, dev_url: Option<&tauri::Url>) -> Option<String> {
    if debug {
        dev_url.map(|url| url.origin().ascii_serialization())
    } else {
        None
    }
}

fn key() -> &'static str {
    static KEY: OnceLock<String> = OnceLock::new();
    KEY.get_or_init(|| {
        let mut bytes = [0u8; 32];
        getrandom::fill(&mut bytes).expect("OS random source unavailable");
        bytes.iter().map(|b| format!("{b:02x}")).collect()
    })
}

pub fn initialization_script() -> String {
    format!(
        "Object.defineProperty(window, '__HERENESS_RESOURCE_KEY__', {{ value: '{}' }});",
        key()
    )
}

fn header<'a>(head: &'a str, name: &str) -> Result<Option<&'a str>, ()> {
    let mut values = head
        .lines()
        .skip(1)
        .filter_map(|line| line.split_once(':'))
        .filter(|(key, _)| key.eq_ignore_ascii_case(name))
        .map(|(_, value)| value.trim());
    let value = values.next();
    if values.next().is_some() {
        return Err(());
    }
    Ok(value)
}

pub fn authorize(
    head: &str,
    path: &str,
    query: &str,
    dev_origin: Option<&str>,
) -> Result<String, ()> {
    if header(head, "Host")? != Some("127.0.0.1:47621") {
        return Err(());
    }
    let origin = header(head, "Origin")?;
    let method = head.split_whitespace().next().unwrap_or("");
    let resource = path.starts_with("/skin/")
        || path.starts_with("/skin-list/")
        || matches!(path, "/status" | "/status/");
    if resource {
        if method != "GET" {
            return Err(());
        }
        if origin
            .is_some_and(|o| !matches!(o, WINDOWS_ORIGIN | MAC_ORIGIN) && dev_origin != Some(o))
        {
            return Err(());
        }
        let mut tokens = query.split('&').filter_map(|s| s.strip_prefix("key="));
        if tokens.next() != Some(key()) || tokens.next().is_some() {
            return Err(());
        }
        Ok(origin
            .map(|o| format!("Access-Control-Allow-Origin: {o}\r\nVary: Origin\r\n"))
            .unwrap_or_default())
    } else {
        if origin.is_some()
            || header(head, "Referer")?.is_some()
            || head.lines().skip(1).any(|l| {
                l.split_once(':')
                    .is_some_and(|(k, _)| k.to_ascii_lowercase().starts_with("sec-fetch-"))
            })
        {
            return Err(());
        }
        if (path.starts_with("/state/") || path == "/end") && method != "POST" {
            return Err(());
        }
        if path == "/show" && header(head, "X-Hereness-Client")? != Some("desktop") {
            return Err(());
        }
        Ok(String::new())
    }
}
