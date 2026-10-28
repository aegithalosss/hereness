use std::{
    collections::BTreeMap,
    fs,
    io::Write,
    path::{Path, PathBuf},
    sync::{Mutex, OnceLock},
};

use serde::de::DeserializeOwned;

fn disabled() -> &'static Mutex<BTreeMap<PathBuf, String>> {
    static FILES: OnceLock<Mutex<BTreeMap<PathBuf, String>>> = OnceLock::new();
    FILES.get_or_init(Default::default)
}

pub fn errors() -> Vec<String> {
    disabled()
        .lock()
        .map(|m| m.values().cloned().collect())
        .unwrap_or_default()
}

pub fn read_json<T: DeserializeOwned + Default>(path: &Path) -> Result<T, String> {
    if let Some(error) = disabled().lock().map_err(|e| e.to_string())?.get(path) {
        return Err(error.clone());
    }
    let result = match fs::read(path) {
        Ok(bytes) => serde_json::from_slice(&bytes).map_err(|e| e.to_string()),
        Err(e)
            if e.kind() == std::io::ErrorKind::NotFound && fs::symlink_metadata(path).is_err() =>
        {
            return Ok(T::default())
        }
        Err(e) => Err(e.to_string()),
    };
    result . map_err (| e | { let name = path . file_name () . unwrap_or_default () . to_string_lossy () ; let error = format ! ("{name} 读不了或格式不对，已停用保存；原文件未改，请检查后重启。 / Cannot read {name}; saving is disabled. Original unchanged; check the file and restart.\n{e}") ; if let Ok (mut files) = disabled () . lock () { files . insert (path . to_path_buf () , error . clone ()) ; } error })
}

pub fn write_json<T: DeserializeOwned + Default>(path: &Path, text: &str) -> Result<(), String> {
    read_json::<T>(path)?;
    atomic_write(path, text.as_bytes())
}

pub fn is_symlink(path: &Path) -> bool {
    fs::symlink_metadata(path).is_ok_and(|m| m.file_type().is_symlink())
}

fn target(path: &Path) -> Result<PathBuf, String> {
    if fs::symlink_metadata(path).is_ok() {
        fs::canonicalize(path)
            .map_err(|e| format!("无法解析文件目标 / Cannot resolve file target: {e}"))
    } else {
        Ok(path.to_path_buf())
    }
}

pub fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    atomic_write_with(
        path,
        bytes,
        |_| Ok(()),
        |temp, bytes| {
            let mut file = fs::OpenOptions::new()
                .write(true)
                .truncate(true)
                .open(temp)?;
            file.write_all(bytes)
        },
    )
}

pub fn atomic_write_with(
    path: &Path,
    bytes: &[u8],
    validate: impl FnOnce(&[u8]) -> Result<(), String>,
    write: impl FnOnce(&Path, &[u8]) -> std::io::Result<()>,
) -> Result<(), String> {
    let target = target(path)?;
    let parent = target
        .parent()
        .ok_or("文件没有父目录 / File has no parent")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let name = target
        .file_name()
        .ok_or("文件名无效 / Invalid filename")?
        .to_string_lossy();
    let mut nonce = [0u8; 16];
    getrandom::fill(&mut nonce)
        .map_err(|e| format!("无法生成暂存名 / Cannot generate temporary filename: {e}"))?;
    let nonce: String = nonce.iter().map(|byte| format!("{byte:02x}")).collect();
    let temp = target.with_file_name(format!(
        "{name}.hereness.{}.{nonce}.tmp",
        std::process::id()
    ));
    fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temp)
        .map_err(|e| format!("无法创建暂存 / Cannot create temporary file: {e}"))?;
    let result = (|| {
        match fs::metadata(&target) {
            Ok(meta) => {
                fs::set_permissions(&temp, meta.permissions()).map_err(|e| e.to_string())?
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
            Err(e) => return Err(e.to_string()),
        }
        write(&temp, bytes).map_err(|e| e.to_string())?;
        let read = fs::read(&temp).map_err(|e| e.to_string())?;
        if read != bytes {
            return Err(
                "暂存内容不一致，原文件未改 / Temporary content differs; original unchanged".into(),
            );
        }
        validate(&read)?;
        fs::OpenOptions::new()
            .write(true)
            .open(&temp)
            .and_then(|f| f.sync_all())
            .map_err(|e| e.to_string())?;
        fs::rename(&temp, &target)
            .map_err(|e| format!("替换失败 / Could not replace file: {e}"))?;
        #[cfg(unix)]
        if let Err(e) = fs::File::open(parent).and_then(|f| f.sync_all()) {
            eprintln!("Parent directory sync failed after file replacement: {e}");
        }
        Ok(())
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temp);
    }
    result
}
