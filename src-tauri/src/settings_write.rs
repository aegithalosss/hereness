use std::{fs, path::Path};

pub(crate) fn commit<T>(
    write: impl FnOnce() -> Result<T, String>,
    publish: impl FnOnce(&T),
) -> Result<T, String> {
    let value = write()?;
    publish(&value);
    Ok(value)
}

pub(crate) fn flag(path: &Path, on: bool) -> Result<(), String> {
    if on {
        if let Some(dir) = path.parent() {
            fs::create_dir_all(dir).map_err(|e| e.to_string())?;
        }
        fs::write(path, "").map_err(|e| e.to_string())
    } else {
        match fs::remove_file(path) {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    }
}

pub(crate) fn autostart(
    debug: bool,
    on: bool,
    mut query: impl FnMut() -> Result<bool, String>,
    mut change: impl FnMut(bool) -> Result<(), String>,
    save: impl FnOnce(bool) -> Result<(), String>,
) -> Result<bool, String> {
    if debug && on {
        return Err ("开发版不能开机自启，正式版才可以。 / Launch at login is only available in the release build." . into ()) ;
    }
    let old = query()?;
    let result = (|| {
        if old != on {
            change(on)?;
        }
        let actual = query()?;
        if actual != on {
            return Err("自启状态未按请求改变 / Launch at login did not change".into());
        }
        save(actual)?;
        Ok(actual)
    })();
    if result.is_err() && old != on && !debug {
        change(old).map_err(|e| {
            format!(
                "{}; 恢复自启失败 / Could not restore launch at login: {e}",
                result.as_ref().unwrap_err()
            )
        })?;
    }
    result
}

pub(crate) fn autostart_at_startup(
    debug: bool,
    apply: impl FnOnce() -> Result<(), String>,
) -> Result<(), String> {
    if debug {
        Ok(())
    } else {
        apply()
    }
}

pub(crate) fn refresh_autostart(
    on: bool,
    respect_external_disable: bool,
    query: impl FnOnce() -> Result<bool, String>,
    change: impl FnOnce(bool) -> Result<(), String>,
) -> Result<(), String> {
    if on && respect_external_disable {
        if query()? {
            change(true)
        } else {
            Ok(())
        }
    } else if on {
        change(true)
    } else if query()? {
        change(false)
    } else {
        Ok(())
    }
}

pub(crate) struct Applied<T> {
    pub actual: Option<T>,
    pub error: Option<String>,
}

pub(crate) fn apply_checked<T: PartialEq>(
    desired: T,
    apply: impl FnOnce() -> Result<(), String>,
    read: impl FnOnce() -> Result<T, String>,
) -> Applied<T> {
    let changed = apply();
    match read() {
        Ok(actual) => {
            let error = changed.err().or_else(|| {
                (actual != desired).then(|| {
                    "系统实际状态未按请求改变 / The system state did not change as requested".into()
                })
            });
            Applied {
                actual: Some(actual),
                error,
            }
        }
        Err(error) => Applied {
            actual: None,
            error: Some(format!(
                "{}状态未知 / State unknown: {error}",
                changed.err().map(|e| format!("{e}; ")).unwrap_or_default()
            )),
        },
    }
}

pub(crate) fn apply_with_restore<T>(
    desired: T,
    previous: T,
    apply: impl FnOnce() -> Result<(), String>,
    restore: impl FnOnce() -> Result<(), String>,
) -> Applied<T> {
    match apply() {
        Ok(()) => Applied {
            actual: Some(desired),
            error: None,
        },
        Err(error) => match restore() {
            Ok(()) => Applied {
                actual: Some(previous),
                error: Some(error),
            },
            Err(restore) => Applied {
                actual: None,
                error: Some(format!("{error}; 恢复失败 / Restore failed: {restore}")),
            },
        },
    }
}
