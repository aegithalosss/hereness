const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const { SKINS_DIR, RIG_DIR_NAMES, readSkinConfig, ringCenter, canonicalImage } = require("./build-skin.cjs");

const ROOT = path.join(__dirname, "..");
const CELL = 200;
const COLS = 7;
const OUT_DIR = path.join(ROOT, "AgentOutputs");

const RED = [230, 40, 40];
const BLUE = [40, 90, 230];
const ORANGE = [240, 140, 20];
const GREEN = [30, 165, 70];
const PURPLE = [150, 60, 200];

const argOf = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : null;
};
const outArg = argOf("--out");
const wanted = process.argv.slice(2).filter((a) => !a.startsWith("--") && a !== outArg);

function findSkin(name) {
  const dir = path.join(SKINS_DIR, name);
  return fs.existsSync(dir) ? { name, dir } : null;
}
function allSkins() {
  if (!fs.existsSync(SKINS_DIR)) return [];
  const out = [];
  for (const e of fs.readdirSync(SKINS_DIR, { withFileTypes: true }).sort((x, y) => x.name.localeCompare(y.name))) {
    if (!e.isDirectory() || e.name.startsWith("_") || e.name.startsWith(".")) continue;
    const full = path.join(SKINS_DIR, e.name);
    const hasPng = fs.readdirSync(full).some((f) => f.toLowerCase().endsWith(".png"));
    if (hasPng) out.push({ name: e.name, dir: full });
  }
  return out;
}

function itemsOf(skin) {
  const { dir } = skin;
  const items = [];
  for (const f of fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".png")).sort()) {
    items.push({ file: path.join(dir, f), label: f, outName: path.basename(f, ".png") });
  }
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((x, y) => x.name.localeCompare(y.name))) {
    if (!e.isDirectory()) continue;
    const sub = path.join(dir, e.name);
    const files = fs.readdirSync(sub).filter((f) => f.toLowerCase().endsWith(".png")).sort();
    if (RIG_DIR_NAMES.includes(e.name)) {
      for (const f of files) {
        const name = path.basename(f, ".png");
        if (name === "tail") continue;
        items.push({ file: path.join(sub, f), label: `${e.name}/${f}`, outName: "idle_" + name, partName: name });
      }
      continue;
    }
    files.forEach((f, i) => items.push({ file: path.join(sub, f), label: `${e.name}/${f}`, outName: `${e.name}${i + 1}` }));
  }
  return items;
}

function measureCenter(png, { dark = false } = {}) {
  let sx = 0, sy = 0, sw = 0;
  for (let y = 0; y < png.height; y++)
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      const a = png.data[i + 3] / 255;
      if (a <= 0.02) continue;
      const w = dark ? a * (1 - (png.data[i] + png.data[i + 1] + png.data[i + 2]) / (3 * 255)) : a;
      if (w <= 0) continue;
      sx += x * w; sy += y * w; sw += w;
    }
  return sw ? [sx / sw, sy / sw] : null;
}
const fmtPt = (v) => `(${v.map((n) => Math.round(n * 10) / 10).join(", ")})`;

const DIGITS = {
  0: ["111", "101", "101", "101", "111"], 1: ["010", "110", "010", "010", "111"],
  2: ["111", "001", "111", "100", "111"], 3: ["111", "001", "111", "001", "111"],
  4: ["101", "101", "111", "001", "001"], 5: ["111", "100", "111", "001", "111"],
  6: ["111", "100", "111", "101", "111"], 7: ["111", "001", "001", "001", "001"],
  8: ["111", "101", "111", "101", "111"], 9: ["111", "101", "111", "001", "111"],
};

function sheetFor(skin, file) {
  const items = itemsOf(skin);
  if (!items.length) return null;
  const rows = Math.ceil(items.length / COLS);
  const sheet = new PNG({ width: CELL * COLS, height: CELL * rows });
  for (let y = 0; y < sheet.height; y++)
    for (let x = 0; x < sheet.width; x++) {
      const v = ((x >> 3) + (y >> 3)) % 2 ? 236 : 208;
      const i = (y * sheet.width + x) * 4;
      sheet.data[i] = sheet.data[i + 1] = sheet.data[i + 2] = v;
      sheet.data[i + 3] = 255;
    }
  const box = (ox, oy, w, h, rgb) => {
    for (let y = oy; y < oy + h; y++)
      for (let x = ox; x < ox + w; x++) {
        if (x < 0 || y < 0 || x >= sheet.width || y >= sheet.height) continue;
        const i = (y * sheet.width + x) * 4;
        sheet.data[i] = rgb[0]; sheet.data[i + 1] = rgb[1]; sheet.data[i + 2] = rgb[2];
      }
  };
  const cross = (cx, cy, arm, rgb) => {
    box(cx - arm, cy, arm * 2 + 1, 1, rgb);
    box(cx, cy - arm, 1, arm * 2 + 1, rgb);
  };

  const first = PNG.sync.read(fs.readFileSync(items[0].file));
  const W0 = first.width, H0 = first.height;
  const cfg = readSkinConfig(skin.dir, W0, H0);
  const pivot = cfg.pivot, grab = cfg.grab, rigPivots = cfg.rigPivots;
  const shadowPivot = cfg.shadowPivot, overlays = cfg.overlays;

  const lines = [];
  items.forEach((it, k) => {
    const img = k === 0 ? first : PNG.sync.read(fs.readFileSync(it.file));
    const ox = (k % COLS) * CELL, oy = Math.floor(k / COLS) * CELL;
    const s = Math.min(CELL / img.width, CELL / img.height);
    const dx = ox + Math.round((CELL - img.width * s) / 2), dy = oy + Math.round((CELL - img.height * s) / 2);
    const dw = Math.max(1, Math.round(img.width * s)), dh = Math.max(1, Math.round(img.height * s));
    for (let y = 0; y < dh; y++)
      for (let x = 0; x < dw; x++) {
        const si = (Math.min(img.height - 1, Math.floor(y / s)) * img.width + Math.min(img.width - 1, Math.floor(x / s))) * 4;
        const di = ((dy + y) * sheet.width + dx + x) * 4;
        const a = img.data[si + 3] / 255;
        for (let c = 0; c < 3; c++) sheet.data[di + c] = Math.round(img.data[si + c] * a + sheet.data[di + c] * (1 - a));
      }
    const px = dx + Math.round(pivot[0] * s), py = dy + Math.round(pivot[1] * s);
    box(ox, py, CELL, 1, RED);
    box(px, oy, 1, CELL, RED);
    if (it.outName === "grab") cross(dx + Math.round(grab[0] * s), dy + Math.round(grab[1] * s), 6, BLUE);
    if (it.partName && rigPivots[it.partName]) {
      const pv = rigPivots[it.partName];
      cross(dx + Math.round(pv[0] * s), dy + Math.round(pv[1] * s), 6, ORANGE);
    }
    const green = [];
    for (const [ov, o] of Object.entries(overlays)) {
      if (!o.pivot) continue;
      if (canonicalImage(it.outName) === canonicalImage(ov) || o.on.some((n) => canonicalImage(n) === canonicalImage(it.outName))) {
        cross(dx + Math.round(o.pivot[0] * s), dy + Math.round(o.pivot[1] * s), 6, GREEN);
        green.push(`${ov} (${o.pivot.join(", ")})`);
      }
    }
    if (canonicalImage(it.outName) === "vfx_grab_shadow") cross(dx + Math.round(shadowPivot[0] * s), dy + Math.round(shadowPivot[1] * s), 6, PURPLE);
    const idx = String(k + 1);
    box(ox + 2, oy + 2, idx.length * 12 + 6, 21, [255, 255, 255]);
    idx.split("").forEach((ch, n) => {
      const g = DIGITS[ch];
      g.forEach((row, y) => row.split("").forEach((v, x) => { if (v === "1") box(ox + 5 + n * 12 + x * 3, oy + 5 + y * 3, 3, 3, [20, 20, 24]); }));
    });
    lines.push(
      `${String(k + 1).padStart(2)} = ${it.outName}${it.partName ? `（${it.label}）` : ""}` +
        `${it.partName && rigPivots[it.partName] ? `  ← 橙十字 (${rigPivots[it.partName].join(", ")})` : ""}` +
        `${canonicalImage(it.outName) === "vfx_grab_shadow" ? `  ← 紫十字 = 投影中心 (${shadowPivot.join(", ")})` : ""}` +
        `${green.length ? `  ← 绿十字 = 特效中心 ${green.join("、")}` : ""}`,
    );
  });

  const refs = [];
  const shadowItem = items.find((it) => canonicalImage(it.outName) === "vfx_grab_shadow");
  if (shadowItem) {
    const m = measureCenter(PNG.sync.read(fs.readFileSync(shadowItem.file)), { dark: true });
    refs.push(`投影 ${shadowItem.outName}.png：skin.json 写的中心 ${fmtPt(shadowPivot)}${cfg.shadowFromFile ? "" : "（这只皮肤没写，用的是默认值）"}；图里量出来的参考重心 ${m ? fmtPt(m) : "（量不出来：整张是透明的）"}`);
  }
  for (const [ov, o] of Object.entries(overlays)) {
    const it = items.find((x) => x.outName === canonicalImage(ov)) || items.find((x) => canonicalImage(x.outName) === canonicalImage(ov));
    if (!it) { refs.push(`特效 ${ov}：这只皮肤里没有这张图（skin.json 写了也不会显示）`); continue; }
    const png = PNG.sync.read(fs.readFileSync(it.file));
    const c = ringCenter(png);
    const shown = o.pivot ? fmtPt(o.pivot) : `没写 → 程序按那张图自己的中心，也就是 ${fmtPt([png.width / 2, png.height / 2])}`;
    const fitted = c
      ? `${fmtPt([c.cx, c.cy])}（拟合了 ${c.dots} 个点、半径 ${c.r.toFixed(1)}、最大误差 ${c.spread.toFixed(2)}）`
      : "（量不出来：这张图里凑不出 3 个点，拟合不了圆）";
    refs.push(`特效 ${ov}：skin.json 写的中心 ${shown}；图里量出来的参考圆心 ${fitted}`);
  }
  if (refs.length) refs.push("（参考值只是给你对照的，程序不会自动采用；要改就自己写进 skin.json，再用这张检查图核对）");

  fs.writeFileSync(file, PNG.sync.write(sheet));
  return { items: lines, pivot, grab, shadowPivot, overlays: Object.keys(overlays), refs, cfg, count: items.length };
}

const skins = (wanted.length ? wanted.map(findSkin).filter(Boolean) : allSkins());
if (!skins.length) {
  console.error("没找到皮肤。用法：node tools/pivot-check-sheet.cjs [皮肤名…] [--out 图.png]");
  process.exit(1);
}
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
let done = 0;
for (const skin of skins) {
  const file = outArg && skins.length === 1 ? path.resolve(outArg) : path.join(OUT_DIR, `pivot-check-${skin.name}.png`);
  let r;
  try {
    r = sheetFor(skin, file);
  } catch (e) {
    console.error(`[${skin.name}] 写不出图（${e.message}）——试试点名用 --out 换个位置`);
    continue;
  }
  if (!r) { console.log(`[${skin.name}] 这个文件夹里没有图，跳过`); continue; }
  done++;
  console.log(`\n[${skin.name}] ${r.count} 张 → ${path.relative(ROOT, file)}`);
  console.log(`  支点 pivot (${r.pivot.join(", ")})${r.cfg.fromFile ? "（skin.json）" : "（默认值）"}；抓取点 grab (${r.grab.join(", ")})`);
  console.log(`  投影 shadow.pivot (${r.shadowPivot.join(", ")})${r.cfg.shadowFromFile ? "（skin.json）" : "（默认值）"}`);
  console.log(`  红十字 = 支点；蓝十字 = 抓取点；橙十字 = 分层部件自己的旋转点；绿十字 = 特效（loading 圈）中心；紫十字 = 投影中心`);
  console.log("  " + r.items.join("\n  "));
  if (r.refs.length) console.log("  参考值（量出来的，程序不自动采用）：\n    " + r.refs.join("\n    "));
}
console.log(`\n共画出 ${done} 只皮肤。这个工具只读原图、只写上面那几张检查图。`);
