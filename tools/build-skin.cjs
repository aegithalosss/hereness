const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const RIG_DIR_NAMES = ["idle_rig", "idle"];
const ROTATING_PARTS = ["Tail1", "Tail2", "Tail3", "Tail4", "earL", "earR"];

const ROOT = path.join(__dirname, "..");
const canonicalImage = (name) => name.toLowerCase();
const SKINS_DIR = path.join(ROOT, "skins");
const ALPHA = 40;

const DEFAULT_PIVOT_PCT = [200 / 400, 325 / 400];
const DEFAULT_GRAB_PCT = [200 / 400, 90 / 400];
const DEFAULT_SHADOW_PCT = [200 / 400, 332 / 400];
const defaultPivot = (W, H) => [Math.round(W * DEFAULT_PIVOT_PCT[0]), Math.round(H * DEFAULT_PIVOT_PCT[1])];
const defaultGrab = (W, H) => [Math.round(W * DEFAULT_GRAB_PCT[0]), Math.round(H * DEFAULT_GRAB_PCT[1])];
const defaultShadow = (W, H) => [W * DEFAULT_SHADOW_PCT[0], H * DEFAULT_SHADOW_PCT[1]];
const pctTxt = (p) => `${+(p[0] * 100).toFixed(4)}% / ${+(p[1] * 100).toFixed(4)}%`;

function readSkinConfig(rawDir, W, H) {
  const out = {
    pivot: defaultPivot(W, H), grab: defaultGrab(W, H), shadowPivot: defaultShadow(W, H),
    shadowFromFile: false,
    rigPivots: {}, overlays: {}, overlayPivots: {}, fromFile: false, warnings: [],
  };
  const p = path.join(rawDir, "skin.json");
  if (!fs.existsSync(p)) {
    out.warnings.push(`皮肤文件夹里没有 skin.json：支点 / 抓取点 / 投影中心 / 分层部件的旋转点先用默认值。要改就在 ${path.basename(rawDir)}/skin.json 里写（格式见《皮肤制作指南》）`);
    return out;
  }
  let j;
  try {
    j = JSON.parse(fs.readFileSync(p, "utf8")) || {};
  } catch (e) {
    out.warnings.push(`skin.json 读不出来（${e.message}）：先全用默认值`);
    return out;
  }
  out.fromFile = true;
  const pair = (v) => (Array.isArray(v) && v.length === 2 && v.every((n) => Number.isFinite(Number(n))) ? [Number(v[0]), Number(v[1])] : null);
  const inCanvas = (v) => v && v[0] >= 0 && v[0] < W && v[1] >= 0 && v[1] < H;

  if (pair(j.pivot) && inCanvas(pair(j.pivot))) out.pivot = pair(j.pivot);
  else if (pair(j.pivot)) out.warnings.push(`skin.json 的 pivot ${JSON.stringify(j.pivot)} 超出了画布（0–${W - 1} / 0–${H - 1}）：先用默认 ${defaultPivot(W, H).join(", ")}`);
  else if (Number.isFinite(Number(j.footY))) {
    out.pivot = [Math.round((W - 1) / 2), Number(j.footY)];
    out.warnings.push(`skin.json 里是老写法的 footY=${j.footY}：当成 pivot=[${out.pivot.join(", ")}]（现在改叫 pivot，见《皮肤制作指南》）`);
  } else out.warnings.push(`skin.json 里没有 pivot（也没有老的 footY）：支点先用默认 ${defaultPivot(W, H).join(", ")}`);

  if (pair(j.grab) && inCanvas(pair(j.grab))) out.grab = pair(j.grab);
  else if (pair(j.grab)) out.warnings.push(`skin.json 的 grab ${JSON.stringify(j.grab)} 超出了画布：先用默认 ${defaultGrab(W, H).join(", ")}`);

  const sp = pair(j.shadow && j.shadow.pivot);
  if (sp && inCanvas(sp)) { out.shadowPivot = sp; out.shadowFromFile = true; }
  else if (sp) out.warnings.push(`skin.json 的 shadow.pivot ${JSON.stringify(j.shadow.pivot)} 超出了画布（0–${W - 1} / 0–${H - 1}）：先用默认 ${defaultShadow(W, H).join(", ")}`);

  for (const [k, v] of Object.entries((j.rig && j.rig.idle && j.rig.idle.pivots) || {})) if (pair(v)) out.rigPivots[k] = pair(v);
  for (const [k, v] of Object.entries(j.overlays && typeof j.overlays === "object" ? j.overlays : {})) {
    const on = Array.isArray(v && v.on) ? v.on.map(String) : [];
    const pv = pair(v && v.pivot);
    out.overlays[k] = { ...(v && typeof v === "object" ? v : {}), on, pivot: pv };
    if (pv) out.overlayPivots[k] = pv;
    if (!on.length) out.warnings.push(`skin.json 的 overlays.${k} 没写 on（要填这只皮肤里它叠在哪几张图上，比如 "on": ["thinking"]）：这个特效不会显示`);
  }
  return out;
}

function alphaAt(png, x, y) {
  return png.data[(y * png.width + x) * 4 + 3];
}

function ringCenter(png) {
  const w = png.width, h = png.height;
  const seen = new Uint8Array(w * h);
  const dots = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (seen[y * w + x] || alphaAt(png, x, y) <= ALPHA) continue;
      let sx = 0, sy = 0, sw = 0;
      const stack = [[x, y]];
      seen[y * w + x] = 1;
      while (stack.length) {
        const [px, py] = stack.pop();
        const a = alphaAt(png, px, py);
        sx += px * a; sy += py * a; sw += a;
        for (const [nx, ny] of [[px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]]) {
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen[ny * w + nx] || alphaAt(png, nx, ny) <= ALPHA) continue;
          seen[ny * w + nx] = 1;
          stack.push([nx, ny]);
        }
      }
      dots.push([sx / sw, sy / sw]);
    }
  }
  if (dots.length < 3) return null;
  const S = { xx: 0, xy: 0, yy: 0, x: 0, y: 0, xz: 0, yz: 0, z: 0, n: dots.length };
  for (const [x, y] of dots) {
    const z = x * x + y * y;
    S.xx += x * x; S.xy += x * y; S.yy += y * y; S.x += x; S.y += y; S.xz += x * z; S.yz += y * z; S.z += z;
  }
  const A = [[S.xx, S.xy, S.x], [S.xy, S.yy, S.y], [S.x, S.y, S.n]];
  const b = [-S.xz, -S.yz, -S.z];
  const det = (m) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const d = det(A);
  if (!d) return null;
  const [D, E, F] = [0, 1, 2].map((i) => det(A.map((row, k) => row.map((v, j) => (j === i ? b[k] : v)))) / d);
  const cx = -D / 2, cy = -E / 2;
  const r = Math.sqrt(cx * cx + cy * cy - F);
  const spread = Math.max(...dots.map(([x, y]) => Math.abs(Math.hypot(x - cx, y - cy) - r)));
  return { cx, cy, r, dots: dots.length, spread };
}

if (require.main !== module) {
  module.exports = {
    SKINS_DIR,
    canonicalImage,
    isKnown,
    RIG_DIR_NAMES,
    ROTATING_PARTS,
    ALPHA,
    defaultPivot,
    defaultGrab,
    defaultShadow,
    readSkinConfig,
    ringCenter,
  };
  return;
}

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const wanted = args.length ? args : skinFolders();
if (!wanted.length) {
  console.error(`skins/ 里没有皮肤文件夹。用法：node tools/build-skin.cjs <皮肤名> [皮肤名…]`);
  process.exit(1);
}

function skinFolders() {
  if (!fs.existsSync(SKINS_DIR)) return [];
  return fs
    .readdirSync(SKINS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_") && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

function lints(png, effect) {
  const problems = [];
  const w = png.width, h = png.height;
  for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) {
    if (alphaAt(png, x, y) > 0) problems.push("四个角不是透明的（可能没去背景）");
  }
  if (effect) return [...new Set(problems)];
  let edge = 0, bright = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    const a = png.data[i + 3];
    if (a > 20 && a < 230) {
      edge++;
      if ((png.data[i] + png.data[i + 1] + png.data[i + 2]) / 3 > 200) bright++;
    }
  }
  const ratio = edge ? bright / edge : 0;
  if (ratio > 0.05) problems.push(`边缘有 ${(ratio * 100).toFixed(0)}% 是很亮的像素，请看看是不是白边（也可能是图里本来就亮的东西）`);
  return [...new Set(problems)];
}

function programNames() {
  const file = path.join(ROOT, "src/pet.js");
  let code;
  try {
    code = fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
  const names = new Set();
  for (const m of code.matchAll(/frames:\s*"([^"]+)"/g)) names.add(m[1]);
  const fb = /\nconst FALLBACK = \{([\s\S]*?)\n\};/.exec(code);
  if (fb) {
    for (const m of fb[1].matchAll(/([A-Za-z_]\w*)\s*:/g)) names.add(m[1]);
    for (const m of fb[1].matchAll(/:\s*"([^"]+)"/g)) names.add(m[1]);
  }
  for (const m of code.matchAll(/const RIG_\w+ = \[([\s\S]*?)\];/g))
    for (const q of m[1].matchAll(/"([^"]+)"/g)) names.add("idle_" + q[1]);
  for (const n of ["vfx_grab_shadow", "idle_blink", "vfx_thinking_loading"]) names.add(n);
  return names.size >= 5 ? new Set([...names].map((n) => n.toLowerCase())) : null;
}

function isKnown(name, known = programNames()) {
  name = name.toLowerCase();
  if (name.startsWith("vfx_")) return true;
  if (!known) return true;
  if (known.has(name)) return true;
  const m = /^(.+?)(\d+)$/.exec(name);
  return !!(m && known.has(m[1]) && /^[1-9]\d*$/.test(m[2]));
}

function collect(rawDir, warnings, folderNotes) {
  const items = [];
  const topFiles = fs.readdirSync(rawDir).filter((f) => f.toLowerCase().endsWith(".png")).sort();
  for (const f of topFiles) items.push({ label: f, from: path.join(rawDir, f), out: path.basename(f, ".png"), kind: "image" });

  const dirs = fs.readdirSync(rawDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  const rigDirName = RIG_DIR_NAMES.find((n) => dirs.includes(n)) || null;
  if (rigDirName && rigDirName !== "idle_rig")
    warnings.push(`分层部件的文件夹还叫 ${rigDirName}/：分层部件的文件夹要叫 idle_rig/（改完这里就不提醒了）`);

  for (const d of dirs) {
    const sub = path.join(rawDir, d);
    const files = fs.readdirSync(sub).filter((f) => f.toLowerCase().endsWith(".png")).sort();
    if (!files.length) { folderNotes.push(`${d}/ 里没有 png，跳过`); continue; }
    if (d === rigDirName) {
      for (const f of files) {
        const name = path.basename(f, ".png");
        if (name === "tail") continue;
        items.push({ label: `${d}/${f}`, from: path.join(sub, f), out: "idle_" + name, partName: name, kind: "rig" });
      }
      const unused = files.length - items.filter((it) => it.kind === "rig").length;
      folderNotes.push(`${d}/ ${files.length} 张文件 → ${files.length - unused} 个部件（部件名就是文件名）${unused ? `，另有 ${unused} 张不用（单根尾巴 tail.png）` : ""}`);
      continue;
    }
    files.forEach((f, i) => items.push({ label: `${d}/${f}`, from: path.join(sub, f), out: `${d}${i + 1}`, kind: "image" }));
    folderNotes.push(`${d}/ 里 ${files.length} 张 → ${d}1${files.length > 1 ? " … " + d + files.length : ""}.png`);
  }
  return { items, topFiles, actionDirs: dirs.filter((d) => d !== rigDirName) };
}

const known = programNames();
const headroom = require("./skin-headroom.cjs");
const headroomModel = headroom.createModel();
console.log("顶部检查：沿动作时间线变换实际可见像素（与原自检一致，alpha > 40）；包含切换弹动、分层和特效；出界不到 2 个显示像素不报。\n");

let problemSkins = 0;
for (const skin of wanted) {
  const rawDir = path.join(SKINS_DIR, skin);
  if (!fs.existsSync(rawDir)) {
    console.log(`\n[${skin}] 找不到皮肤文件夹：${rawDir}`);
    problemSkins++;
    continue;
  }
  const warnings = [];
  const folderNotes = [];
  const { items, topFiles, actionDirs } = collect(rawDir, warnings, folderNotes);
  if (!items.length) {
    console.log(`\n[${skin}] 文件夹里没有 png，跳过`);
    continue;
  }
  for (const it of items) it.png = PNG.sync.read(fs.readFileSync(it.from));

  const sizes = new Set(items.map((it) => `${it.png.width}x${it.png.height}`));
  const sizeOk = sizes.size === 1;
  const [W, H] = [...sizes][0].split("x").map(Number);

  const cfg = readSkinConfig(rawDir, W, H);
  warnings.push(...cfg.warnings);
  const { pivot, grab, rigPivots } = cfg;

  const parts = items.filter((it) => it.kind === "rig");
  const missing = parts.filter((p) => ROTATING_PARTS.includes(p.partName) && !rigPivots[p.partName]).map((p) => p.partName);
  const have = parts.filter((p) => ROTATING_PARTS.includes(p.partName) && rigPivots[p.partName]).map((p) => p.partName);
  const stale = Object.keys(rigPivots).filter((k) => !parts.some((p) => p.partName === k));

  const unknown = items.filter((it) => !isKnown(it.out, known));
  const outNames = new Set(items.map((it) => it.out));
  const overlayNotes = [];
  for (const [k, o] of Object.entries(cfg.overlays)) {
    const hasImage = (name) => [...outNames].some((n) => canonicalImage(n) === canonicalImage(name));
    const miss = o.on.filter((n) => !hasImage(n));
    const where = o.on.length ? `叠在 ${o.on.join("、")} 上` : "没写 on";
    overlayNotes.push(`${k}：${where}；中心 ${o.pivot ? `(${o.pivot.join(", ")})（skin.json）` : "按那张图自己的中心（没写）"}`);
    if (miss.length) warnings.push(`overlays.${k} 的 on 里写了这只皮肤没有的图名：${miss.join("、")}（要填这只皮肤自己的名字，比如思考图就叫 thinking）`);
    if (!hasImage(k)) warnings.push(`overlays.${k}：这只皮肤里没有这张图，特效不会显示`);
  }
  const whites = [];
  for (const it of items) {
    const isEffect = !!(it.out.startsWith("vfx_") || cfg.overlays[it.out]);
    const problems = lints(it.png, isEffect);
    if (problems.length) whites.push({ out: it.out, why: problems.join("；") });
  }
  const topRisks = sizeOk && W === 400 && H === 400 ? headroom.inspect(headroomModel, items, cfg, W, H) : [];
  if (!sizeOk || W !== 400 || H !== 400) warnings.push("顶部几何检查仅适用于同尺寸 400×400 图；当前尺寸先修正后再检查，不能按本次结果判断安全。");
  const worst = new Map();
  for (const risk of topRisks) {
    const key = [risk.file, risk.action.replace(/ 手速轨迹 -?\d+/, ""), risk.size].join("|");
    if (!worst.has(key) || risk.excess > worst.get(key).excess) worst.set(key, risk);
  }
  const topWarnings = [...worst.values()].map(r => `${r.file}：离顶太近（有色像素顶行 ${r.top}px）；${r.title}（${r.action}），${({ s: "小", m: "中", l: "大" })[r.size]}档，动作开始后 ${r.ms.toFixed(1)}ms 超出窗口顶部 ${r.excess.toFixed(2)} 画布像素（${(r.excess * headroomModel.sizes.find(s => s.id === r.size).pet / H).toFixed(2)} 显示像素）`);

  console.log(`\n[${skin}] ${items.length} 张图（顶层 ${topFiles.length} 张 + ${actionDirs.length} 个动作文件夹 + ${parts.length} 个分层部件）`);
  console.log(`  文件夹：${path.relative(ROOT, rawDir)}`);
  console.log(`  画布尺寸：${[...sizes].join("、")}${sizeOk ? "（每张都一样大）" : " ← 每张必须一样大"}`);
  console.log(`  支点 pivot：(${pivot.join(", ")})，抓取点 grab：(${grab.join(", ")})${cfg.fromFile ? "（skin.json）" : `（默认值：画布 ${pctTxt(DEFAULT_PIVOT_PCT)} 和 ${pctTxt(DEFAULT_GRAB_PCT)}）`}`);
  console.log(`  投影 shadow.pivot：(${cfg.shadowPivot.join(", ")})${cfg.shadowFromFile ? "（skin.json）" : `（默认值：画布 ${pctTxt(DEFAULT_SHADOW_PCT)}）`}`);
  if (overlayNotes.length) console.log(`  特效（叠在别的图上）：\n    ${overlayNotes.join("\n    ")}`);
  if (parts.length) {
    console.log(`  会转的部件（${ROTATING_PARTS.length} 个）的旋转点：${missing.length ? `还缺 ${missing.join("、")}（这几个会绕图片中心转；点在 Photoshop 里量，见《皮肤制作指南》）` : `${have.join("、")} 都在 skin.json 里`}`);
  }
  console.log(`  认不出的名字：${unknown.length ? unknown.map((u) => `${u.out}.png（原图 ${u.label}）`).join("、") : "无"}`);
  console.log(`  白边：${whites.length ? whites.map((w) => `${w.out}.png：${w.why}`).join("；") : "无"}`);
  console.log(`  顶部：${topWarnings.length ? "实际动作中出界（不改图）\n    " + topWarnings.join("\n    ") : "本次逐时刻检查未发现达到 2 个显示像素的出界"}`);
  if (folderNotes.length) console.log("  文件夹：\n    " + folderNotes.join("\n    "));
  if (stale.length) warnings.push(`skin.json 里有已经不在用的旋转点：${stale.join("、")}（这些部件不在 idle_rig/ 里了）`);
  const need = [...warnings, ...whites.map((w) => `${w.out}：${w.why}`), ...(topWarnings.length ? [`顶部有 ${topWarnings.length} 项风险，见上面的逐图结果。`] : [])];
  if (need.length) {
    problemSkins++;
    console.log("  需要看一下：\n    " + need.join("\n    "));
  } else {
    console.log("  没有发现问题。");
  }
}

console.log(`\n检查了 ${wanted.length} 只皮肤${problemSkins ? `，其中 ${problemSkins} 只有要看的` : "，都没问题"}。这个工具只读，没写任何文件。`);
