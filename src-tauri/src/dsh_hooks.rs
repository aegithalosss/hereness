use std::{fs, path::Path};

use yaml_rust2::{Yaml, YamlLoader};

const BEGIN: &str = "# BEGIN hereness-dsh-hooks";

const END: &str = "# END hereness-dsh-hooks";

const ID: &str = "hereness-dsh-hooks";

const EMPTY: &str = "# empty-original: ";

fn parse(text: &str) -> Result<Vec<Yaml>, String> {
    let docs = YamlLoader::load_from_str(text.trim_start_matches('\u{feff}'))
        .map_err(|e| format!("DSH 设置不是正确的 YAML：{e}"))?;
    if docs.len() != 1 || docs[0].as_vec().is_none() {
        return Err("DSH 设置最外层必须是一份 YAML 列表（空列表写 []）。".into());
    }
    Ok(docs[0].as_vec().unwrap().clone())
}

fn owned(row: &Yaml) -> bool {
    row["insert"]
        .as_vec()
        .is_some_and(|items| items.iter().any(|item| item["id"].as_str() == Some(ID)))
        || row["id"].as_str() == Some(ID)
}

fn split(text: &str) -> Result<Option<String>, String> {
    let Some(start) = text.find(BEGIN) else {
        if text.contains(END) || parse(text)?.iter().any(owned) {
            return Err("DSH 桌宠配置标记不完整；请检查备份，未改文件。".into());
        }
        return Ok(None);
    };
    let end = text
        .find(END)
        .ok_or("DSH 桌宠配置缺少结束标记，未改文件。")?;
    if end < start || text.matches(BEGIN).count() != 1 || text.matches(END).count() != 1 {
        return Err("DSH 桌宠配置标记重复或顺序不对，未改文件。".into());
    }
    let end = end + END.len();
    if !text[end..].starts_with('\n') {
        return Err("DSH 桌宠配置结束标记被改过，未改文件。".into());
    }
    let end = end + 1;
    let block = &text[start..end];
    let rows = parse(block)?;
    if rows.len() != 1 || !owned(&rows[0]) {
        return Err("DSH 桌宠配置段被改过，未改文件。".into());
    }
    let entry = &rows[0]["insert"];
    let items = entry.as_vec().ok_or("DSH 桌宠 insert 格式不对")?;
    if items.len() != 1
        || items[0]["id"].as_str() != Some(ID)
        || items[0]["name"].as_str() != Some("@deepseek-ai/dsh-hooks-claude-code")
    {
        return Err("DSH 桌宠段含有其他配置，未改文件。".into());
    }
    let config = items[0]["config"]["configPath"]
        .as_str()
        .ok_or("DSH 桌宠配置缺少 configPath")?;
    let empty = block
        .lines()
        .nth(1)
        .and_then(|line| line.strip_prefix(EMPTY));
    let original_empty: Option<String> = empty
        .map(serde_json::from_str)
        .transpose()
        .map_err(|e| e.to_string())?;
    if block != make_block(config, original_empty.as_deref()) {
        return Err("DSH 桌宠管理段有手工改动，请先核对备份；未改文件。".into());
    }
    let original = if let Some(original) = original_empty {
        if start != 0 || !parse(&original)?.is_empty() {
            return Err("DSH 空列表恢复记录不对，未改文件。".into());
        }
        format!("{original}{}", &text[end..])
    } else {
        if start == 0 || text.as_bytes()[start - 1] != b'\n' {
            return Err("DSH 桌宠段前的分隔符被改过，未改文件。".into());
        }
        format!("{}{}", &text[..start - 1], &text[end..])
    };
    let mut expected = parse(&original)?;
    expected.push(rows[0].clone());
    if parse(text)? != expected || parse(&original)?.iter().any(owned) {
        return Err("DSH 桌宠配置位置或 id 不对，未改文件。".into());
    }
    Ok(Some(original))
}

fn make_block(config: &str, empty: Option<&str>) -> String {
    let saved = empty
        .map(|s| format!("{EMPTY}{}\n", serde_json::to_string(s).unwrap()))
        .unwrap_or_default();
    let path = config.replace('\'', "''");
    format ! ("{BEGIN}\n{saved}- insert:\n    - id: {ID}\n      name: '@deepseek-ai/dsh-hooks-claude-code'\n      config:\n        configPath: '{path}'\n{END}\n")
}

pub fn is_connected(patch: &Path, config: &Path) -> bool {
    let Ok(text) = fs::read_to_string(patch) else {
        return false;
    };
    let _ = config;
    split(&text).is_ok_and(|s| s.is_some())
}

fn atomic_write_with(
    path: &Path,
    bytes: &[u8],
    validate: impl FnOnce(&[u8]) -> Result<(), String>,
    write: impl FnOnce(&Path, &[u8]) -> std::io::Result<()>,
) -> Result<(), String> {
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("文件名不是有效文字")?;
    let temp = path.with_file_name(format!("{name}.hereness.tmp"));
    write(&temp, bytes).map_err(|e| format!("临时文件写入失败，原文件未改：{e}"))?;
    let read = fs::read(&temp).map_err(|e| e.to_string())?;
    if read != bytes {
        return Err("临时文件内容不一致，原文件未改".into());
    }
    validate(&read)?;
    fs::rename(&temp, path).map_err(|e| format!("替换失败：{e}"))
}

fn atomic_write(
    path: &Path,
    bytes: &[u8],
    validate: impl FnOnce(&[u8]) -> Result<(), String>,
) -> Result<(), String> {
    atomic_write_with(path, bytes, validate, |temp, bytes| fs::write(temp, bytes))
}

fn write_patch(path: &Path, original: &str, next: &str) -> Result<(), String> {
    parse(next)?;
    if fs::read_to_string(path).map_err(|e| e.to_string())? != original {
        return Err("DSH 设置刚被其他程序改过，请稍后重试。".into());
    }
    let backup = super::hooks::backup_path(path);
    fs::copy(path, &backup).map_err(|e| format!("备份失败，未改文件：{e}"))?;
    atomic_write(path, next.as_bytes(), |read| {
        parse(std::str::from_utf8(read).map_err(|e| e.to_string())?)?;
        if fs::read_to_string(path).map_err(|e| e.to_string())? != original {
            return Err("DSH 设置刚被其他程序改过，请稍后重试。".into());
        }
        Ok(())
    })
}

fn restore_config(config: &Path, old: &Option<Vec<u8>>) -> Result<(), String> {
    match old {
        Some(bytes) => return atomic_write(config, bytes, |_| Ok(())),
        None if config.exists() => fs::remove_file(config),
        None => Ok(()),
    }
    .map_err(|e| format!("恢复桌宠 hooks 配置失败：{e}"))
}

pub fn connect(patch: &Path, config: &Path) -> Result<(), String> {
    let text = fs::read_to_string(patch).map_err(|e| format!("读不了 DSH 设置：{e}"))?;
    let original = split(&text)?.unwrap_or_else(|| text.clone());
    let rows = parse(&original)?;
    if !rows.is_empty()
        && !original
            .trim_start_matches('\u{feff}')
            .trim_start()
            .starts_with(['-', '#'])
    {
        return Err("DSH 使用了行内列表，请先改为逐行列表；未改文件。".into());
    }
    let config_str = config.to_str().ok_or("桌宠设置路径不是有效文字")?;
    let block = make_block(config_str, rows.is_empty().then_some(original.as_str()));
    let next = if rows.is_empty() {
        block
    } else {
        format!("{original}\n{block}")
    };
    if split(&next)?.as_deref() != Some(original.as_str()) {
        return Err("DSH 用户原文校验失败，未改文件。".into());
    }
    let old = match fs::read(config) {
        Ok(bytes) => Some(bytes),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => None,
        Err(e) => return Err(e.to_string()),
    };
    if let Some(dir) = config.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    if config.exists() {
        fs::copy(config, super::hooks::backup_path(config))
            .map_err(|e| format!("备份失败：{e}"))?;
    }
    let next_config = super::hooks::dsh_config()?;
    atomic_write(config, next_config.as_bytes(), |read| {
        serde_json::from_slice::<serde_json::Value>(read).map_err(|e| e.to_string())?;
        Ok(())
    })?;
    let result = (|| {
        if next != text {
            write_patch(patch, &text, &next)?;
        }
        Ok(())
    })();
    if result.is_err() {
        restore_config(config, &old)?;
    }
    result
}

pub fn disconnect(patch: &Path, config: &Path) -> Result<(), String> {
    let text = fs::read_to_string(patch).map_err(|e| e.to_string())?;
    let Some(original) = split(&text)? else {
        return Ok(());
    };
    write_patch(patch, &text, &original)?;
    if config.exists() {
        if let Err(e) = fs::remove_file(config) {
            write_patch(patch, &original, &text)
                .map_err(|restore| format!("删除 hooks 失败：{e}；恢复 patch 失败：{restore}"))?;
            return Err(format!("删除 hooks 失败，已恢复连接配置：{e}"));
        }
    }
    Ok(())
}
