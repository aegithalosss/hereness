const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const STAGE = path.join(ROOT, "src-tauri", "target", "mac-resources");
const SKINS_DIR = path.join(ROOT, "skins");
const STATUS_DIR = path.join(ROOT, "status");
const SKIN_LIST = path.join(__dirname, "release-skins.txt");
const STATUS_LIST = path.join(__dirname, "release-status.txt");

const release = process.argv.includes("--release");

for (const name of ["LICENSE", "THIRD_PARTY_ASSETS.md"]) {
  const file = path.join(ROOT, name);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    console.error(`[mac 自带] 停下来了：缺少许可文件 ${name}（必须是文件）`);
    process.exit(1);
  }
}
if (process.argv.includes("--check")) {
  console.log("[mac 自带] 两份许可文件检查通过；未暂存资源、未写入或覆盖文件。");
  process.exit(0);
}

function missing(msg) {
  if (release) {
    console.error(`\n[mac 自带] 停下来了：${msg}`);
    process.exit(1);
  }
  console.warn(`[mac 自带] 提醒：${msg}（开发版照常跑；打正式版会停下来）`);
}

function readList(file) {
  if (!fs.existsSync(file)) {
    missing(`找不到 ${path.relative(ROOT, file)}`);
    return null;
  }
  const names = fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  if (!names.length) missing(`${path.relative(ROOT, file)} 里一行都没写`);
  return names;
}

const KEEP = (name) => /\.(png|mp3|wav|ogg)$/i.test(name) || name.toLowerCase() === "skin.json";
function copySkin(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, e.name);
    const dst = path.join(to, e.name);
    if (e.isDirectory()) copySkin(src, dst);
    else if (KEEP(e.name)) fs.copyFileSync(src, dst);
  }
}

const stageSkins = path.join(STAGE, "skins");
const stageStatuses = path.join(STAGE, "status");
for (const dir of [stageSkins, stageStatuses]) fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(stageSkins, { recursive: true });
fs.mkdirSync(stageStatuses, { recursive: true });

const skins = readList(SKIN_LIST) || [];
let skinCount = 0;
for (const name of skins) {
  const dir = path.join(SKINS_DIR, name);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    missing(`skins/${name} 不存在（${path.relative(ROOT, SKIN_LIST)} 里点名了它）——名字要和 skins/ 里的文件夹一模一样`);
    continue;
  }
  copySkin(dir, path.join(stageSkins, name));
  skinCount++;
}

const statuses = readList(STATUS_LIST) || [];
let statusCount = 0;
for (const name of statuses) {
  if (!name.toLowerCase().endsWith(".txt")) {
    missing(`status/${name} 不是 txt —— 状态提示文件都是 .txt（一种状态提示中英文各一份）`);
    continue;
  }
  const file = path.join(STATUS_DIR, name);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    missing(`status/${name} 不存在（${path.relative(ROOT, STATUS_LIST)} 里点名了它）——名字要和 status/ 里的文件一模一样`);
    continue;
  }
  fs.copyFileSync(file, path.join(stageStatuses, name));
  statusCount++;
}

console.log(
  `[mac 自带] ${release ? "打包" : "开发"}：把 ${skinCount} 只皮肤、${statusCount} 份状态提示放到 ` +
    `${path.relative(ROOT, STAGE)}/（只带 png 和 skin.json / .txt，原样复制）`,
);
console.log("[mac 自带] 这一步只给 Mac 的 tauri.macos.conf.json 用；Windows 打包走 tools/make-release.cjs，读的是 exe 旁边那份。");
