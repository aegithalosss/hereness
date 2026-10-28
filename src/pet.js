const SHOW_ERROR = true;

const SEC = 1000;
const MIN = 60 * SEC;
const PROMPT_MS = 1.2 * SEC;
const ERROR_MS = 2 * SEC;
const AGENT_STATE_MIN_MS = 700;
const DONE_MS = 8 * SEC;
const BORED_AT = 3 * MIN;
const LOOK_CHANGE_MS = [3 * SEC, 20 * SEC];
const DROWSY_AT = 7 * MIN;
const SLEEP_AT = 10 * MIN;
const MIN_DROWSY_MS = 30 * SEC;
const SLEEP_CHANGE_MS = 15 * MIN;
const REDROWSY_MS = [30 * SEC, 60 * SEC];
const NOTIFY_ESCALATE_MS = 2 * MIN;
const NOTIFY_ANGRY_MS = 1 * SEC;
const POKE_MS = 1.5 * SEC;
const WAKE_MS = 1.5 * SEC;
const ANGRY_POKES = 10;
const ANGRY_POKE_WINDOW_MS = 3 * SEC;
const ANGRY_MS = 2 * SEC;
const CROSSEYE_LONG_MS = 30 * SEC;
const CROSSEYE_BUSY_MS = 10 * MIN;
const CROSSEYE_COOLDOWN_MS = 5 * MIN;
const LOADING_TURN_MS = 1 * SEC;
const LOADING_STEPS = 9;
const DANGLE_SWING_MS = 900;
const DANGLE_SETTLE_MS = 450;
const DANGLE_PUSH = 2.2;
const DANGLE_MAX_DEG = 35;
const DANGLE_SWAY_DEG = 1.2;
const DANGLE_DROP_MS = 200;
const DANGLE_HAND_MS = 40;
const DANGLE_STILL_MS = 60;
const BUSY_STALE_MS = 10 * MIN;
const BASH_STALE_MS = 30 * MIN;

const FALLBACK = {
  typing: "idle",
  thinking: "idle",
  reading: "typing",
  running: "typing",
  notify: "idle",
  done: "idle",
  error: "thinking",
  angry: "error",
  poked: "idle",
  wake: "poked",
  bored: "idle",
  sleep: "idle",
  onit: "thinking",
};

const STATES = {
  idle:     { name: "待机",       frames: "idle",                     motion: "breathe" },
  prompt:   { name: "接活",       frames: "onit",                    motion: "hop" },
  thinking: { name: "思考",       frames: "thinking",                 motion: "tilt" },
  crosseye: { name: "思考·对眼",  frames: "overthinking",             motion: "tilt" },
  reading:  { name: "查资料",     frames: "reading",                  motion: "sway" },
  typing:   { name: "敲代码",     frames: "typing",   fps: 5,         motion: "jitter" },
  bash:     { name: "等结果",     frames: "running",                     motion: "rock" },
  notify:   { name: "举手",       frames: "notify",   pick: "random", motion: "wave" },
  angry:    { name: "生气",       frames: "angry",                    motion: "shake" },
  done:     { name: "开心",       frames: "done",                     motion: "jump" },
  error:    { name: "出错",       frames: "error",    pick: "random", motion: "shake-once" },
  look1:    { name: "闲着", frames: "bored", motion: "breathe" },
  yawn:     { name: "困",         frames: "yawn",                     motion: "breathe" },
  sleep1:   { name: "睡着", frames: "sleep", motion: "snore" },
  wake:     { name: "惊醒",       frames: "wake",                     motion: "hop" },
};

function stateOf(name) {
  const s = String(name || "");
  if (/^sleep\d*$/.test(s)) return STATES.sleep1;
  if (/^look\d*$/.test(s)) return STATES.look1;
  return STATES[s];
}

const REACTIONS = {
  poke:   { name: "戳戳",     frames: "poked",  motion: "stretch", ms: POKE_MS },
  wake:   { name: "惊醒",     frames: "wake",  motion: "hop",   ms: WAKE_MS },
  angry:  { name: "生气",     frames: "angry", motion: "shake", ms: ANGRY_MS },
  lifted: { name: "被拎起来", frames: "grab", motion: "dangle" },
};

const BLINK_MS = 150;
const BLINK_EVERY_MS = [3000, 7000];

const RIG_TAIL_SEGMENTS = ["Tail1", "Tail2", "Tail3", "Tail4"];
const RIG_BODY_PARTS = [...RIG_TAIL_SEGMENTS, "body", "earL", "earR", "face"];
const RIG_EYELIDS = ["EyelidTL", "EyelidTR", "EyelidBL", "EyelidBR"];
const RIG_PARTS = [...RIG_BODY_PARTS, ...RIG_EYELIDS];
const TAIL_SWING_DEG = 14;
const TAIL_SEG_AMP = [0.35, 0.3, 0.35, 0.3];
const TAIL_SEG_DELAY_MS = [0, 60, 120, 200];
const TAIL_SWING_MS = 550;
const TAIL_GAP_MS = [5 * SEC, 14 * SEC];
const TAIL_DOUBLE_CHANCE = 0.35;
const EAR_ANGLE_MAX_DEG = 30;
const EAR_TWITCH_DEG = 10;
const EAR_TWITCH_MS = 260;
const EAR_LEAN_DEG = 12;
const EAR_LEAN_IN_MS = 220;
const EAR_LEAN_HOLD_MS = [3 * SEC, 10 * SEC];
const EAR_LEAN_SETTLE_MS = 350;
const EAR_LEAN_CHANCE = 0.5;
const EAR_GAP_MS = [4 * SEC, 10 * SEC];
const RIG_BLINK_MS = 120;
const CLOSED_EYES_POKE_CHANCE = 0.5;
const POKE_EAR_ANGLE_DEG = 20;
const POKE_HEAD_DROP_PX = 15;
const POKE_BODY_SQUASH = 0.9;
const POKE_POSE_MS = 150;
document.documentElement.style.setProperty("--tail-angle", TAIL_SWING_DEG + "deg");
document.documentElement.style.setProperty("--ear-angle", Math.min(EAR_TWITCH_DEG, EAR_ANGLE_MAX_DEG) + "deg");
document.documentElement.style.setProperty("--ear-lean-angle", Math.min(EAR_LEAN_DEG, EAR_ANGLE_MAX_DEG) + "deg");
document.documentElement.style.setProperty("--poke-ear-angle", Math.min(POKE_EAR_ANGLE_DEG, EAR_ANGLE_MAX_DEG) + "deg");
document.documentElement.style.setProperty("--poke-head-drop", POKE_HEAD_DROP_PX + "px");
document.documentElement.style.setProperty("--poke-body-squash", POKE_BODY_SQUASH);
document.documentElement.style.setProperty("--poke-pose-ms", POKE_POSE_MS + "ms");
RIG_TAIL_SEGMENTS.forEach((seg, i) => document.documentElement.style.setProperty(`--tail-amp-${i + 1}`, TAIL_SEG_AMP[i]));

const EXTRA_SIGNALS = ["error_stop"];

const isSleepState = (name) => {
  const s = String(name);
  return s === "sleep" || /^sleep\d+$/.test(s);
};
const CALM_STATES = ["idle", "look1", "look2", "look3", "look4", "yawn"];
const isCalmState = (name) => CALM_STATES.includes(name) || isSleepState(name);

const ORDER = Object.keys(STATES);
const stageEl = document.getElementById("stage");
const petEl = document.getElementById("pet");
const artEl = document.getElementById("pet-art");
const imgEl = document.getElementById("pet-img");
const shadowWrap = document.getElementById("pet-shadow-wrap");
const shadowEl = document.getElementById("pet-shadow");
const fxEls = ["pet-overlay", "pet-overlay2", "pet-overlay3"].map((id) => document.getElementById(id)).filter(Boolean);
const emojiEl = document.getElementById("pet-emoji");
const labelEl = document.getElementById("label");
const labelTextEl = document.getElementById("label-text");
const labelCountEl = document.getElementById("label-count");

const CONNECT_HINT = { zh: "右键连接 agent", en: "Right-click to connect" };
function connectHint() {
  return prefs.language === "en" ? CONNECT_HINT.en : CONNECT_HINT.zh;
}
let connected = 1;
const skinHintEl = document.getElementById("skin-hint");
const bubbleEl = document.getElementById("bubble");
const bubbleTextEl = document.getElementById("bubble-text");
const bubbleBodyEl = document.getElementById("bubble-body");
const bubblePawEl = document.getElementById("bubble-paw");
const rigEl = document.getElementById("pet-rig");
const rigImgs = Object.fromEntries(RIG_PARTS.map((p) => [p, document.getElementById("rig-" + p)]));
const rigTailNodes = Object.fromEntries(RIG_TAIL_SEGMENTS.map((seg) => [seg, document.getElementById("rig-" + seg + "-node")]));

const PET_PORT = 47621;
const resourceKeyQuery = `key=${encodeURIComponent(window.__HERENESS_RESOURCE_KEY__ || "")}`;
let skinResourceRevision = 0;
const skinUrl = (rel) =>
  `http://127.0.0.1:${PET_PORT}/skin/${String(rel).split("/").map(encodeURIComponent).join("/")}?${resourceKeyQuery}${skinResourceRevision ? `&refresh=${skinResourceRevision}` : ""}`;

let skin = { name: "evie" };

const src = (frame) => {
  if (/^[a-z]+:\/\//i.test(frame)) return frame;
  const rel = fileOf.get(String(frame).toLowerCase()) || `${frame}.png`;
  return skinUrl(`${skin.name}/${rel}`);
};

class ImageNames extends Set {
  add(name) { return super.add(String(name).toLowerCase()); }
  has(name) { return super.has(String(name).toLowerCase()); }
}
const available = new ImageNames();
const fileOf = new Map();
const folderImages = new Map();
let skinInfo = { overlays: {} };

const canShowRig = () => RIG_BODY_PARTS.every((p) => available.has("idle_" + p));
const canShowRigEyes = () => canShowRig() && RIG_EYELIDS.every((p) => available.has("idle_" + p));

function applyRigPivots() {
  for (const el of [...Object.values(rigTailNodes), ...Object.values(rigImgs)]) el.style.transformOrigin = "";
  const rig = skinInfo.rig && skinInfo.rig.idle;
  if (!rig) return;
  const [w, h] = canvasSize(skinInfo.size);
  for (const [name, value] of Object.entries(record(rig.pivots))) {
    if (!RIG_PARTS.includes(name)) continue;
    const pair = pairIn(value, w, h);
    if (!pair) continue;
    const [px, py] = pair;
    const el = rigTailNodes[name] || rigImgs[name];
    if (el) el.style.transformOrigin = `${(px / w) * 100}% ${(py / h) * 100}%`;
  }
}

const DEFAULT_PIVOT_PCT = [200 / 400, 325 / 400];
const DEFAULT_GRAB_PCT = [200 / 400, 90 / 400];
const DEFAULT_SHADOW_PCT = [200 / 400, 332 / 400];
let grabArtXRatio = DEFAULT_GRAB_PCT[0];
let grabArtYRatio = DEFAULT_GRAB_PCT[1];

const record = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const canvasSize = (value) => Array.isArray(value) && value.length === 2 && value.every((n) => typeof n === "number" && Number.isFinite(n) && n > 0) ? value : [400, 400];
const pairIn = (v, w, h) =>
    Array.isArray(v) && v.length === 2 && v.every((n) => Number.isFinite(Number(n))) &&
    Number(v[0]) >= 0 && Number(v[0]) < w && Number(v[1]) >= 0 && Number(v[1]) < h
      ? [Number(v[0]), Number(v[1])]
      : null;
function applySkinGeometry() {
  const [W, H] = canvasSize(skinInfo.size);
  const legacy = Number(skinInfo.footY);
  const pv =
    pairIn(skinInfo.pivot, W, H) ||
    (Number.isFinite(legacy) && legacy >= 0 && legacy < H ? [Math.round((W - 1) / 2), legacy] : null) ||
    [Math.round(W * DEFAULT_PIVOT_PCT[0]), Math.round(H * DEFAULT_PIVOT_PCT[1])];
  document.documentElement.style.setProperty("--pivot-x", ((pv[0] / W) * 100).toFixed(2) + "%");
  document.documentElement.style.setProperty("--pivot-y", ((pv[1] / H) * 100).toFixed(2) + "%");
  const gb = pairIn(skinInfo.grab, W, H) || [Math.round(W * DEFAULT_GRAB_PCT[0]), Math.round(H * DEFAULT_GRAB_PCT[1])];
  grabArtXRatio = gb[0] / W;
  grabArtYRatio = gb[1] / H;
  if (shadowEl) {
    const sp = pairIn(skinInfo.shadow && skinInfo.shadow.pivot, W, H) || [W * DEFAULT_SHADOW_PCT[0], H * DEFAULT_SHADOW_PCT[1]];
    shadowEl.style.transformOrigin = `${((sp[0] / W) * 100).toFixed(2)}% ${((sp[1] / H) * 100).toFixed(2)}%`;
  }
}

let probeGen = 0;

async function probeSkin() {
  const gen = ++probeGen;
  const fresh = () => gen === probeGen;
  try {
  if (tauri) {
    try {
      const list = await tauri.core.invoke("skins_available");
      if (!fresh()) return false;
      if (Array.isArray(list)) {
        anySkins = list.length > 0;
        missingSkin = list.some((s) => s.value === requestedSkin) ? "" : requestedSkin;
        const effective = missingSkin ? "evie" : requestedSkin;
        if (skin.name !== effective) skinRows = {};
        skin = { name: effective };
        updateSkinHint();
      }
    } catch (error) { console.warn("[skin-list]", error); }
  }
  if (!fresh()) return false;
  skinInfo = { overlays: {} };
  clearFx();
  fileOf.clear();
  folderImages.clear();
  applySkinGeometry();

  const finish = () => {
    if (!fresh()) return false;
    applySkinGeometry();
    for (const p of RIG_PARTS) if (available.has("idle_" + p)) rigImgs[p].src = src("idle_" + p);
    applyRigPivots();
    if (shadowEl && variants("vfx_grab_shadow").length > 0) {
      shadowEl.src = src(variants("vfx_grab_shadow")[0]);
    }
    return true;
  };

  const listP = fetch(`http://127.0.0.1:${PET_PORT}/skin-list/${encodeURIComponent(skin.name)}?${resourceKeyQuery}`, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => []);
  const infoP = fetch(skinUrl(`${skin.name}/skin.json`))
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  const result = await Promise.all([listP, infoP]).then(([list, j]) => {
    if (!fresh()) return false;
    available.clear();
    for (const f of (Array.isArray(list) ? list.slice().sort() : [])) {
      const path = String(f).replace(/\.png$/i, "");
      const name = (path.toLowerCase().startsWith("idle_rig/") ? "idle_" + path.slice("idle_rig/".length) : path.replace(/^.*\//, "")).toLowerCase();
      const folder = path.includes("/") ? path.slice(0, path.lastIndexOf("/")).toLowerCase() : "";
      if (folder && folder !== "idle_rig") {
        const key = path.toLowerCase();
        if (!fileOf.has(key)) {
          fileOf.set(key, String(f));
          if (!folderImages.has(folder)) folderImages.set(folder, []);
          folderImages.get(folder).push(key);
        }
      }
      if (fileOf.has(name)) continue;
      available.add(name);
      fileOf.set(name, String(f));
    }
    if (j) skinInfo = { overlays: {}, ...j };
    if (!skinInfo.overlays || typeof skinInfo.overlays !== "object") skinInfo.overlays = {};
    return finish();
  });
  if (fresh()) await loadSounds();
  return result;
  } catch (error) {
    console.warn("[skin-probe]", error);
    if (!fresh()) return false;
    available.clear(); fileOf.clear(); folderImages.clear();
    skinRows = {};
    skinInfo = { overlays: {} };
    applySkinGeometry(); applyRigPivots(); clearFx();
    return true;
  }
}

const imageName = (name) => name.toLowerCase().replace(/^.*\//, "");
function variants(name) {
  name = name.toLowerCase();
  if (folderImages.get(name.toLowerCase())?.length) return folderImages.get(name.toLowerCase());
  const list = available.has(name) ? [name] : [];
  const numbered = [...available].filter((n) => n.startsWith(name) && /^[1-9]\d*$/.test(n.slice(name.length)));
  numbered.sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0));
  return list.concat(numbered);
}

function resolveImages(name) {
  const seen = new Set();
  while (name && !seen.has(name)) {
    const list = variants(name);
    if (list.length) return list;
    seen.add(name);
    name = FALLBACK[name];
  }
  return [];
}

const canShow = (s) => !rowOff(s) && resolveImages(s.frames).length > 0;

let shown = null;
let frameTimer = null;

function setFrame(name) {
  imgEl.src = src(name);
  const entries = Object.entries(skinInfo.overlays)
    .filter(([overlay, o]) => variants(overlay).length && Array.isArray(o && o.on) && o.on.some((n) => typeof n === "string" && imageName(n) === imageName(name)))
    .slice(0, fxEls.length);
  const key = skin.name + "|" + entries.map(([overlay]) => overlay).join(",");
  if (key === fxKey) return;
  clearFx();
  fxKey = key;
  entries.forEach(([overlay, o], i) => startFx(fxEls[i], overlay, o));
}

const FX_DEFAULTS = {
  spin: { ms: LOADING_TURN_MS, steps: LOADING_STEPS },
  drip: { ms: 1400, gap: 2600, distance: 36, curve: 0 },
  pulse: { ms: 2800, min: 0.35 },
  flicker: { ms: 1300, min: 0.2 },
};
let fxKey = "";
let fxAnims = [];

function fxPlan(o, size) {
  const [w, h] = Array.isArray(size) && size.length === 2 ? size.map((n) => Number(n) || 400) : [400, 400];
  const given = o && typeof o.motion === "string" ? o.motion.trim().toLowerCase() : "";
  const motion = given === "" ? "spin" : FX_DEFAULTS[given] ? given : "none";
  const d = FX_DEFAULTS[motion] || {};
  const num = (key, lo, hi) => {
    const v = o && o[key];
    const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
    return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d[key];
  };
  const colors = Array.isArray(o && o.colors)
    ? o.colors.filter((c) => typeof c === "string" && /^(#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))$/i.test(c.trim())).map((c) => c.trim())
    : [];
  if (motion === "none") return { motion, colors };
  if (motion === "spin") {
    const steps = Math.round(num("steps", 0, 60));
    return { motion, colors, css: `spin ${num("ms", 100, 60000)}ms ${steps ? `steps(${steps})` : "linear"} infinite` };
  }
  if (motion === "drip") {
    const fall = num("ms", 100, 60000);
    const gap = num("gap", 0, 60000);
    const dy = (num("distance", -2000, 2000) / h) * 100;
    const dx = (num("curve", -2000, 2000) / w) * 100;
    const f = fall / (fall + gap);
    const keyframes = [0, 0.25, 0.5, 0.75, 1].map((k) => ({
      offset: k * f,
      transform: `translate(${(dx * (1 - (1 - k) ** 2)).toFixed(3)}%, ${(dy * k * k).toFixed(3)}%)`,
      opacity: +(1 - k * k).toFixed(3),
    }));
    if (gap > 0) keyframes.push({ offset: 1, transform: keyframes[4].transform, opacity: 0 });
    return { motion, colors, keyframes, timing: { duration: fall + gap, iterations: Infinity, easing: "linear" } };
  }
  if (motion === "pulse") {
    const min = num("min", 0, 1);
    return {
      motion,
      colors,
      keyframes: [{ opacity: 1 }, { opacity: min }, { opacity: 1 }],
      timing: { duration: num("ms", 200, 60000), iterations: Infinity, easing: "ease-in-out" },
    };
  }
  const min = num("min", 0, 1);
  const marks = [[0, 1], [0.1, min], [0.18, 0.9], [0.34, 0.55], [0.42, 1], [0.58, min], [0.66, 0.85], [0.84, 0.5], [1, 1]];
  const keyframes = marks.map(([offset, opacity]) => {
    const frame = { offset, opacity };
    if (colors.length) frame.backgroundColor = colors[Math.min(colors.length - 1, Math.floor(offset * colors.length))];
    return frame;
  });
  if (colors.length) keyframes[keyframes.length - 1].backgroundColor = colors[0];
  return { motion, colors, keyframes, timing: { duration: num("ms", 200, 60000), iterations: Infinity, easing: "linear" } };
}

function startFx(el, overlay, o) {
  const [w, h] = canvasSize(skinInfo.size);
  const plan = fxPlan(o, [w, h]);
  const [px, py] = pairIn(o && o.pivot, w, h) || [w / 2, h / 2];
  el.style.transformOrigin = `${(px / w) * 100}% ${(py / h) * 100}%`;
  const url = `url("${src(variants(overlay)[0])}")`;
  if (plan.colors.length) {
    el.style.backgroundImage = "none";
    el.style.webkitMaskImage = url;
    el.style.maskImage = url;
    el.style.backgroundColor = plan.colors[0];
  } else {
    el.style.backgroundImage = url;
    el.style.webkitMaskImage = "none";
    el.style.maskImage = "none";
    el.style.backgroundColor = "transparent";
  }
  el.style.animation = plan.css || "none";
  el.hidden = false;
  if (plan.keyframes && typeof el.animate === "function") {
    const anim = el.animate(plan.keyframes, plan.timing);
    if (document.hidden) anim.pause();
    fxAnims.push(anim);
  }
}

function clearFx() {
  for (const anim of fxAnims) anim.cancel();
  fxAnims = [];
  fxKey = "";
  for (const el of fxEls) {
    el.hidden = true;
    el.style.animation = "none";
    el.style.backgroundImage = "none";
    el.style.webkitMaskImage = "none";
    el.style.maskImage = "none";
  }
}

document.addEventListener("visibilitychange", () => {
  for (const anim of fxAnims) document.hidden ? anim.pause() : anim.play();
  for (const el of fxEls) el.style.animationPlayState = document.hidden ? "paused" : "running";
});

const randomOf = (list) => list[Math.floor(Math.random() * list.length)];

const lastRandom = new Map();
function pickRandom(id, frames) {
  let list = frames;
  const last = lastRandom.get(id);
  if (last !== undefined && frames.length > 1) {
    const others = frames.filter((f) => f !== last);
    if (others.length) list = others;
  }
  const frame = randomOf(list);
  lastRandom.set(id, frame);
  return frame;
}

let shownCycle = null;
let shownAt = 0;
const HELD_AGENT_STATES = new Set(["prompt", "thinking", "crosseye", "reading", "typing", "bash"]);
function show(id, s, cycle = null) {
  if (id === shown && cycle === shownCycle) return;
  if (isSleepState(String(shown).replace(/^state:/, "")) && !isSleepState(id.replace(/^state:/, "")) && playingRow === "sleep") stopSound();
  shown = id;
  shownAt = Date.now();
  shownCycle = cycle;
  if (id.startsWith("state:") && id !== soundState) {
    soundState = id;
    playSound(ROW_OF[id], undefined, true);
  }

  const useRig = id === "state:idle" && canShowRig() && !overrideFor(id);
  rigEl.hidden = !useRig;
  artEl.hidden = false;

  clearInterval(frameTimer);
  if (useRig) {
    imgEl.hidden = true;
    emojiEl.hidden = true;
    clearFx();
  } else {
    let frames = resolveImages(s.frames);
    const override = overrideFor(id);
    if (override && override.urls.length) frames = override.urls;
    if (!frames.length) frames = resolveImages("idle");
    imgEl.hidden = !frames.length;
    emojiEl.hidden = !!frames.length;
    clearFx();
    if (frames.length) {
      const pick = s.pick || (s.fps ? "loop" : "random");
      setFrame(pick === "loop" ? frames[0] : pickRandom(ROW_OF[id] || id, frames));
      if (frames.length > 1 && pick === "loop") {
        let i = 0;
        frameTimer = setInterval(() => setFrame(frames[(i = (i + 1) % frames.length)]), 1000 / (s.fps || 4));
      }
    }
  }

  if (!useRig && imgEl.hidden) artEl.hidden = true;

  petEl.className = "m-" + s.motion;

  artEl.classList.remove("pop");
  void artEl.offsetWidth;
  artEl.classList.add("pop");
}

const sessions = new Map();
const STUCK_STATES = new Set(["prompt", "thinking", "crosseye", "reading", "typing", "bash", "error"]);

function stuckSince(s, now) {
  if (s.stuckAt != null) return s.stuckAt;
  if (!STUCK_STATES.has(s.state) || s.stuckAcknowledged || prefs.stuck_reminder === false) return null;
  const minutes = Math.max(1, Math.min(1440, Math.floor(Number(prefs.stuck_minutes) || 10)));
  const due = s.at + minutes * MIN;
  if (now < due) return null;
  s.stuckAt = due;
  return due;
}

let calm = { kind: "idle", at: Date.now() };

let manual = null;

function sessionView(s, now) {
  const stuckAt = stuckSince(s, now);
  if (stuckAt !== null) return { kind: "notify", reason: "stuck", state: "notify", at: stuckAt };
  if (s.stuckAcknowledged) return { kind: "calm", state: "idle", at: s.at };
  const watched = prefs.stuck_reminder !== false && STUCK_STATES.has(s.state);
  const e = now - s.at;
  const erroring = SHOW_ERROR && e < ERROR_MS;
  switch (s.state) {
    case "notify":
      return { kind: "notify", reason: s.ask ? "ask" : "approval", state: "notify", at: s.at };
    case "error_stop":
      return erroring ? { kind: "error", state: "error", at: s.at } : { kind: "calm", state: "idle", at: s.at };
    case "done":
    case "idle":
      return { kind: "calm", state: s.state, at: s.at };
    case "error":
      if (erroring) return { kind: "error", state: "error", at: s.at };
      return busyView("thinking", s.at, e, s.at + (SHOW_ERROR ? ERROR_MS : 0), watched);
    case "prompt":
      return e < PROMPT_MS ? busyView("prompt", s.at, e, s.at, watched) : busyView("thinking", s.at, e, s.at + PROMPT_MS, watched);
    default:
      return busyView(s.state, s.at, e, s.at, watched);
  }
}

function busyView(state, at, e, since = at, watched = false) {
  const stale = state === "bash" ? BASH_STALE_MS : BUSY_STALE_MS;
  if (!watched && e >= stale) return { kind: "calm", state: "idle", at };
  return { kind: "busy", state, at, since };
}

function acknowledge(id, now) {
  const s = sessions.get(id);
  if (!s) return;
  if (s.stuckAt != null) {
    s.stuckAt = null;
    s.stuckAcknowledged = true;
    return;
  }
  s.state = "idle";
  s.at = now;
}

function seeded(...nums) {
  let h = 2166136261;
  for (const n of nums) {
    h ^= Math.floor(n) >>> 0;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995);
  }
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

const pickMs = ([min, max], ...seed) => min + seeded(...seed) * (max - min);

function lookCycle(seed, t) {
  let end = BORED_AT;
  for (let k = 0; ; k++) {
    end += pickMs(LOOK_CHANGE_MS, seed, 1, k);
    if (t < end) return k;
  }
}

let memo = { base: null, yawnPokedAt: null };
function calmMemo(base) {
  if (memo.base !== base) memo = { base, yawnPokedAt: null };
  return memo;
}

function drowsyStart(seed, m) {
  if (m.yawnPokedAt === null) return DROWSY_AT;
  return m.yawnPokedAt - m.base + pickMs(REDROWSY_MS, seed, 5, m.yawnPokedAt);
}

function calmState(kind, t, seed = 0) {
  if (kind === "done" && t < DONE_MS) return "done";
  if (t < BORED_AT) return "idle";
  const drowsy = drowsyStart(seed, calmMemo(seed));
  if (t < drowsy) return t < DROWSY_AT && !rowsOff.has("look") ? "look1" : "idle";
  const sleepAt = Math.max(SLEEP_AT, drowsy + MIN_DROWSY_MS);
  return t < sleepAt ? "yawn" : "sleep1";
}

function notifyState(waited) {
  if (waited < NOTIFY_ESCALATE_MS) return "notify";
  if (waited < NOTIFY_ESCALATE_MS + NOTIFY_ANGRY_MS) return "angry";
  return "notify";
}

function agentState(now = Date.now()) {
  return agentInfo(now).state;
}

function agentInfo(now) {
  if (manual) return { state: manual, manual: true };
  let notifySince = null;
  let error = false;
  let busy = null;
  let latestCalm = calm;
  for (const s of sessions.values()) {
    const v = sessionView(s, now);
    if (v.kind === "notify") notifySince = notifySince === null ? v.at : Math.min(notifySince, v.at);
    else if (v.kind === "error") error = true;
    else if (v.kind === "busy") {
      if (!busy || v.at >= busy.at) busy = v;
    } else if (v.at > latestCalm.at) {
      latestCalm = { kind: v.state, at: v.at };
    }
  }
  if (notifySince !== null) return { state: notifyState(now - notifySince) };
  if (error) return { state: "error" };
  if (busy) return { state: busy.state, since: busy.since };
  return { state: calmState(latestCalm.kind, now - latestCalm.at, latestCalm.at), calm: true, base: latestCalm.at };
}

let workSince = null;
let thinkSince = null;
let thinkCross = false;
let crossEndedAt = -Infinity;

function crossEye(info, now) {
  if (info.manual) return info.state;
  if (info.calm) workSince = null;
  else if (workSince === null) workSince = info.since ?? now;

  if (info.state !== "thinking") {
    endThinking(now);
    return info.state;
  }
  if (info.since !== thinkSince) {
    endThinking(now);
    thinkSince = info.since;
    if (thinkSince - workSince >= CROSSEYE_BUSY_MS && thinkSince - crossEndedAt >= CROSSEYE_COOLDOWN_MS) {
      thinkCross = true;
      workSince = thinkSince;
    }
  }
  if (!thinkCross && now - thinkSince >= CROSSEYE_LONG_MS && now - crossEndedAt >= CROSSEYE_COOLDOWN_MS) thinkCross = true;
  return thinkCross && canShow(stateOf("crosseye")) ? "crosseye" : "thinking";
}

function endThinking(now) {
  if (thinkCross) crossEndedAt = now;
  thinkSince = null;
  thinkCross = false;
}

const ASK_TOOLS = new Set(["AskUserQuestion"]);

function receive(state, session, extra) {
  if (!stateOf(state) && !EXTRA_SIGNALS.includes(state)) {
    console.warn("未知状态：", state);
    return;
  }
  const now = Date.now();
  manual = null;
  const key = session || "manual";
  const old = sessions.get(key);
  const e = extra || {};
  const asking = ASK_TOOLS.has(e.tool) && (state === "notify" || (state === "thinking" && ["PreToolUse", "preToolUse"].includes(e.event)));
  if (asking) state = "notify";
  const at = old && old.state === "notify" && state === "notify" ? old.at : now;
  const keep = (fresh, before) => (fresh == null || fresh === "" ? before : fresh);
  sessions.set(key, {
    state,
    at,
    ask: asking || (state === "notify" && !!(old && old.state === "notify" && old.ask)),
    question: asking ? e.detail || null : state === "notify" && old && old.ask ? old.question : null,
    cwd: keep(e.cwd, old && old.cwd),
    tool: keep(e.tool, old && old.tool),
    detail: keep(e.detail, old && old.detail),
    command: keep(e.command, old && old.command),
    file: keep(e.file, old && old.file),
  });
  if (state === "done" || state === "idle") calm = { kind: state, at: now };
  refresh();
}

function endSession(session) {
  const s = sessions.get(session || "manual");
  if (!s) return;
  const now = Date.now();
  const v = sessionView(s, now);
  sessions.delete(session || "manual");
  if (v.kind !== "calm" && now - calm.at >= DONE_MS) calm = { kind: "idle", at: now };
  refresh(true);
}

const FORGET_MS = 24 * 60 * MIN;
function forgetOld(now) {
  for (const [id, s] of sessions) {
    if (now - s.at > FORGET_MS && sessionView(s, now).kind === "calm") sessions.delete(id);
  }
}

function scanFolderPaths() {
  forgetOld(Date.now());
  return [...new Set([...sessions.values()].map((s) => s.cwd).filter((p) => FolderNames.normalize(p)))];
}

let reaction = null;
let reactionUntil = 0;
let lastAgent = null;
let wakeUntil = 0;
let closedEyesUntil = 0;
let rigBlinking = false;

let started = false;
let probing = false;

function refresh(immediate = false) {
  if (!started || probing) return;
  const now = Date.now();
  forgetOld(now);
  if (reaction && now >= reactionUntil) reaction = null;
  if (closedEyesUntil && now >= closedEyesUntil) closedEyesUntil = 0;

  const info = agentInfo(now);
  let a = crossEye(info, now);
  if (a === "yawn" && !canShow(stateOf("yawn")) && !manual) a = "idle";
  const urgent = immediate === true || a === "notify" || a === "error" || a === "angry";
  if (urgent) wakeUntil = 0;
  const visible = String(shown).startsWith("state:") ? shown.slice(6) : null;
  if (!urgent && !info.manual && HELD_AGENT_STATES.has(a) && HELD_AGENT_STATES.has(visible) && now - shownAt < AGENT_STATE_MIN_MS) a = visible;
  if (!urgent && isSleepState(lastAgent) && !isCalmState(a) && !manual && canShow(stateOf("wake"))) wakeUntil = now + WAKE_MS;
  lastAgent = a;

  if (dangling() && canShow(REACTIONS.lifted)) show("reaction:lifted", REACTIONS.lifted);
  else if (reaction) show("reaction:" + reaction, REACTIONS[reaction]);
  else if (!urgent && now < wakeUntil && !isCalmState(a)) show("state:wake", stateOf("wake"));
  else {
    let cycle = null;
    if (info.calm && a === "look1") cycle = lookCycle(info.base, now - info.base);
    if (info.calm && isSleepState(a)) {
      const sleepAt = Math.max(SLEEP_AT, drowsyStart(info.base, calmMemo(info.base)) + MIN_DROWSY_MS);
      cycle = Math.floor((now - info.base - sleepAt) / SLEEP_CHANGE_MS);
    }
    show("state:" + a, stateOf(a), cycle);
  }

  updateStatusLabel();

  updateRigEyes(now < closedEyesUntil || rigBlinking);
  if (rigEl.hidden) rigEl.classList.remove("m-rig-poke");
  else rigEl.classList[now < closedEyesUntil ? "add" : "remove"]("m-rig-poke");

  if (shadowWrap) shadowWrap.hidden = !(dangling() && variants("vfx_grab_shadow").length > 0);

  renderBubble(now);
}

function updateRigEyes(closed) {
  for (const p of RIG_EYELIDS) rigImgs[p].hidden = !closed;
}

function scheduleBlink() {
  const [min, max] = BLINK_EVERY_MS;
  setTimeout(() => {
    const now = decodeURIComponent(imgEl.src.split("?")[0].split("/").pop()).replace(/\.png$/i, "");
    if (shown === "state:idle" && !canShowRig() && available.has("idle_blink") && variants("idle").includes(now)) {
      imgEl.src = src("idle_blink");
      setTimeout(() => {
        if (shown === "state:idle") imgEl.src = src(now);
      }, BLINK_MS);
    }
    scheduleBlink();
  }, min + Math.random() * (max - min));
}

function retrigger(el, animation) {
  el.style.transition = "";
  el.style.animation = "none";
  void el.offsetWidth;
  el.style.animation = animation;
}

function swingTail(times) {
  RIG_TAIL_SEGMENTS.forEach((seg, i) => {
    retrigger(rigTailNodes[seg], `rig-tail-whip ${TAIL_SWING_MS}ms ease-in-out ${TAIL_SEG_DELAY_MS[i]}ms ${times}`);
  });
}

function scheduleTailSwing() {
  const [min, max] = TAIL_GAP_MS;
  setTimeout(() => {
    if (shown === "state:idle" && canShowRig() && !holding && !closedEyesUntil) {
      swingTail(Math.random() < TAIL_DOUBLE_CHANCE ? 2 : 1);
    }
    scheduleTailSwing();
  }, min + Math.random() * (max - min));
}

function twitchEar(name) {
  retrigger(rigImgs[name], `rig-ear-twitch ${EAR_TWITCH_MS}ms ease-in-out 1`);
}

function leanEar(name) {
  const el = rigImgs[name];
  el.style.animation = "none";
  el.style.transition = `transform ${EAR_LEAN_IN_MS}ms ease-out`;
  el.style.transform = "rotate(calc(var(--ear-lean-angle) * var(--ear-sign, 1)))";
  const [min, max] = EAR_LEAN_HOLD_MS;
  const holdMs = min + Math.random() * (max - min);
  setTimeout(() => {
    el.style.transition = "";
    el.style.transform = "";
    retrigger(el, `rig-ear-lean-settle ${EAR_LEAN_SETTLE_MS}ms ease-in-out 1`);
  }, EAR_LEAN_IN_MS + holdMs);
}

function scheduleEar(name) {
  const [min, max] = EAR_GAP_MS;
  setTimeout(() => {
    if (shown === "state:idle" && canShowRig() && !holding && !closedEyesUntil) {
      if (Math.random() < EAR_LEAN_CHANCE) leanEar(name);
      else twitchEar(name);
    }
    scheduleEar(name);
  }, min + Math.random() * (max - min));
}

function scheduleRigBlink() {
  const [min, max] = BLINK_EVERY_MS;
  setTimeout(() => {
    if (shown === "state:idle" && canShowRigEyes() && !holding && !closedEyesUntil) {
      rigBlinking = true;
      setTimeout(() => (rigBlinking = false), RIG_BLINK_MS);
    }
    scheduleRigBlink();
  }, min + Math.random() * (max - min));
}

function playReaction(name, ms = REACTIONS[name].ms) {
  reaction = name;
  reactionUntil = Date.now() + ms;
  playSound(ROW_OF["reaction:" + name]);
}

function startWake(now) {
  playReaction(canShow(REACTIONS.wake) ? "wake" : "poke");
  if (manual) manual = "idle";
  else calm = { kind: "idle", at: reactionUntil };
  lastAgent = "idle";
}

let pokes = [];
function poke() {
  const now = Date.now();
  const info = agentInfo(now);
  const before = info.state;
  pokes = [...pokes.filter((t) => now - t < ANGRY_POKE_WINDOW_MS), now];

  if (reaction === "angry" && now < reactionUntil) {
    pokes = [];
    playReaction("angry");
  } else if (pokes.length >= ANGRY_POKES) {
    pokes = [];
    playReaction("angry");
  } else if (reaction === "wake" && now < reactionUntil) {
    startWake(now);
  } else if (isSleepState(before)) {
    startWake(now);
  } else if (before === "yawn" && info.calm) {
    calmMemo(info.base).yawnPokedAt = now;
  } else {
    playReaction("poke");
  }
  refresh();
}

function react(name) {
  if (name === "poke") return poke();
  if (!REACTIONS[name] || !REACTIONS[name].ms) return;
  playReaction(name);
  refresh();
}

function nextState() {
  const i = ORDER.indexOf(agentState());
  manual = ORDER[(i + 1) % ORDER.length];
  reaction = null;
  wakeUntil = 0;
  refresh();
}

function stopTest() {
  manual = null;
  reaction = null;
  wakeUntil = 0;
  refresh();
}

let ready;
function start() {
  ready = probeSkin().catch((error) => console.warn("[skin-start]", error)).finally(() => {
    started = true;
    setInterval(refresh, 250);
    document.addEventListener("visibilitychange", refresh);
    scheduleBlink();
    scheduleTailSwing();
    scheduleEar("earL");
    scheduleEar("earR");
    scheduleRigBlink();
    refresh();
  });
  return ready;
}

const DRAG_PX = 4;
const LIFT_UP_RATIO = 0 / 300;
const SHADOW_MIN_SCALE = 0.7;
const SHADOW_SCALE_SMOOTH = 0.15;
function liftTarget(grabXY, curXY, scale, liftPx) {
  return {
    x: Math.round((curXY.x - grabXY.x) * scale),
    y: Math.round((curXY.y - grabXY.y - liftPx) * scale),
  };
}
function grabOriginY() {
  return Math.round((petEl.offsetHeight || 0) * grabArtYRatio * 10) / 10;
}
function grabOffset() {
  return {
    x: Math.round(((petEl.offsetLeft || 0) + (petEl.offsetWidth || 0) * grabArtXRatio) * 10) / 10,
    y: Math.round(((petEl.offsetTop || 0) + (petEl.offsetHeight || 0) * grabArtYRatio) * 10) / 10,
  };
}

let dangleAngle = 0;
let dangleVel = 0;
let handVel = 0;
let handRawVel = 0;
let handAccel = 0;
let shadowScale = 1;
let dangleStartAt = 0;
let dangleLastT = 0;
let dangleRaf = 0;
let lastMoveX = 0;
let lastMoveT = 0;
let dropFrom = null;

const softMax = (deg) => DANGLE_MAX_DEG * Math.tanh(deg / DANGLE_MAX_DEG);

function idleSway(t) {
  const s = (t - dangleStartAt) / 1000;
  const fadeIn = Math.min(1, s / 0.6);
  return DANGLE_SWAY_DEG * fadeIn * (0.7 * Math.sin(s * 2 * Math.PI / 1.9) + 0.3 * Math.sin(s * 2 * Math.PI / 3.1 + 1.3));
}

function stepPendulum(dt, accel) {
  const w = (2 * Math.PI) / (DANGLE_SWING_MS / 1000);
  const c = 2 / (DANGLE_SETTLE_MS / 1000);
  const push = (DANGLE_PUSH / 1000) * w * w;
  const n = Math.max(1, Math.ceil(dt / 0.004));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const acc = -w * w * dangleAngle - c * dangleVel + push * accel;
    dangleVel += acc * h;
    dangleAngle += dangleVel * h;
  }
}

function stopDangle() {
  if (dangleRaf && typeof cancelAnimationFrame === "function") cancelAnimationFrame(dangleRaf);
  dangleRaf = 0;
  dangleAngle = 0;
  dangleVel = 0;
  handVel = 0;
  handRawVel = 0;
  handAccel = 0;
  dropFrom = null;
  shadowScale = 1;
  petEl.style.transform = "";
  if (shadowWrap) shadowWrap.style.transform = "";
  if (shadowEl) shadowEl.style.transform = "";
}

function dangling() {
  return holding || dropFrom !== null;
}

function tickDangle() {
  if (!dangling()) {
    dangleRaf = 0;
    return;
  }
  const t = Date.now();
  const dt = Math.min(0.1, Math.max(0, (t - (dangleLastT || t)) / 1000));
  dangleLastT = t;
  let angle;
  if (dropFrom) {
    const k = Math.min(1, (t - dropFrom.at) / DANGLE_DROP_MS);
    angle = dropFrom.angle * (1 - k) ** 3;
    if (k >= 1) {
      stopDangle();
      refresh();
      return;
    }
  } else {
    if (t - lastMoveT > DANGLE_STILL_MS) handRawVel = 0;
    const before = handVel;
    if (dt > 0) handVel += (handRawVel - handVel) * (1 - Math.exp(-(dt * 1000) / DANGLE_HAND_MS));
    handAccel = dt > 0 ? (handVel - before) / dt : 0;
    stepPendulum(dt, handAccel);
    angle = softMax(dangleAngle) + idleSway(t);
  }
  petEl.style.transform = `rotate(${angle.toFixed(2)}deg)`;
  if (shadowWrap && !shadowWrap.hidden) {
    const k = Math.min(1, Math.abs(angle) / DANGLE_MAX_DEG);
    const want = 1 - (1 - SHADOW_MIN_SCALE) * k;
    shadowScale += (want - shadowScale) * (1 - Math.exp(-(dt * 1000) / 100));
    shadowWrap.style.transform = `rotate(${(-angle).toFixed(2)}deg)`;
    if (shadowEl) shadowEl.style.transform = `scale(${shadowScale.toFixed(3)})`;
  }
  dangleRaf = typeof requestAnimationFrame === "function" ? requestAnimationFrame(tickDangle) : 0;
}
const tauri = window.__TAURI__;
const appWindow = tauri && tauri.window.getCurrentWindow();

let press = null;
let holding = false;
let moveTo = null;
let moving = false;

stageEl.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  stageEl.setPointerCapture(e.pointerId);
  press = { x: e.screenX, y: e.screenY, scale: window.devicePixelRatio || 1 };
});

stageEl.addEventListener("pointermove", (e) => {
  if (!press) return;
  const dx = e.screenX - press.x;
  const dy = e.screenY - press.y;
  if (!holding) {
    if (Math.hypot(dx, dy) < DRAG_PX) return;
    holding = true;
    lastMoveX = e.screenX;
    lastMoveT = Date.now();
    const carry = dropFrom ? dropFrom.angle * (1 - Math.min(1, (Date.now() - dropFrom.at) / DANGLE_DROP_MS)) ** 3 : 0;
    stopDangle();
    dangleAngle = carry;
    dangleStartAt = Date.now();
    dangleLastT = Date.now();
    document.documentElement.style.setProperty("--grab-origin-y", grabOriginY() + "px");
    document.documentElement.style.setProperty("--grab-origin-x", (grabArtXRatio * 100).toFixed(1) + "%");
    if (!dangleRaf && typeof requestAnimationFrame === "function") dangleRaf = requestAnimationFrame(tickDangle);
    playSound("lifted");
    refresh();
  }
  const t = Date.now();
  const dtMs = Math.max(1, t - lastMoveT);
  handRawVel = ((e.screenX - lastMoveX) / dtMs) * 1000;
  lastMoveX = e.screenX;
  lastMoveT = t;

  if (!appWindow) return;
  const liftPx = (window.innerHeight || 0) * LIFT_UP_RATIO;
  moveTo = liftTarget(grabOffset(), { x: e.screenX, y: e.screenY }, press.scale, liftPx);
  moveWindow();
});

function moveWindow() {
  if (moving || !moveTo || !appWindow) return;
  const { x, y } = moveTo;
  moveTo = null;
  moving = true;
  appWindow
    .setPosition(new tauri.dpi.PhysicalPosition(x, y))
    .catch(() => {})
    .finally(() => {
      moving = false;
      moveWindow();
    });
}

function release(e, isClick) {
  if (!press) return;
  if (stageEl.hasPointerCapture(e.pointerId)) stageEl.releasePointerCapture(e.pointerId);
  press = null;
  if (holding) {
    holding = false;
    playSound("dropped");
    const m = /rotate\((-?[\d.]+)deg\)/.exec(petEl.style.transform || "");
    const angle = m ? parseFloat(m[1]) : 0;
    if (Math.abs(angle) > 0.05 && DANGLE_DROP_MS > 0) {
      dropFrom = { at: Date.now(), angle };
      if (!dangleRaf && typeof requestAnimationFrame === "function") dangleRaf = requestAnimationFrame(tickDangle);
    } else {
      stopDangle();
    }
    refresh();
  } else if (isClick) {
    poke();
  }
}

stageEl.addEventListener("pointerup", (e) => e.button === 0 && release(e, true));
stageEl.addEventListener("pointercancel", (e) => release(e, false));

document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  if (tauri) tauri.core.invoke("show_menu").catch((err) => console.warn("菜单打不开：", err));
});

if (skinHintEl) {
  const stop = (e) => e.stopPropagation();
  skinHintEl.addEventListener("pointerdown", stop);
  skinHintEl.addEventListener("pointerup", stop);
  skinHintEl.addEventListener("click", (e) => {
    e.stopPropagation();
    if (tauri) tauri.core.invoke("show_settings", { tab: "style" }).catch((err) => console.warn("设置打不开：", err));
  });
}

const ROW_OF = {
  "state:idle": "idle",
  "state:prompt": "prompt",
  "state:thinking": "thinking",
  "state:crosseye": "crosseye",
  "state:reading": "reading",
  "state:typing": "typing",
  "state:bash": "bash",
  "state:notify": "notify",
  "state:error": "error",
  "state:done": "done",
  "state:angry": "angry",
  "state:yawn": "yawn",
  "state:wake": "wake",
  "state:look1": "look",
  "state:look2": "look",
  "state:look3": "look",
  "state:look4": "look",
  "state:sleep1": "sleep",
  "state:sleep2": "sleep",
  "state:sleep3": "sleep",
  "state:sleep4": "sleep",
  "reaction:poke": "poke",
  "reaction:angry": "angry",
  "reaction:wake": "wake",
  "reaction:lifted": "lifted",
};
let skinRows = {};

const overrideFor = (id) => skinRows[ROW_OF[id] || ""] || null;

function applySkins(map) {
  skinRows = {};
  for (const [row, info] of Object.entries(map || {})) {
    skinRows[row] = { type: info.type, name: info.name, urls: (info.files || []).map((f) => skinUrl(`${skin.name}/${f}`)) };
  }
  shown = null;
  refresh();
}

let resourceRefreshGeneration = 0;
async function refreshSkinResources() {
  const generation = ++resourceRefreshGeneration;
  const name = requestedSkin;
  skinResourceRevision++;
  probing = true;
  const probe = probeSkin();
  const thisProbe = probeGen;
  try {
    const [map, fresh] = await Promise.all([
      tauri.core.invoke("skin_overrides"), probe,
    ]);
    if (!fresh || generation !== resourceRefreshGeneration || name !== requestedSkin) return;
    probing = false;
    applySkins(map);
  } catch (error) {
    console.warn("[skin-resources-refresh]", error);
  } finally {
    if (generation === resourceRefreshGeneration && thisProbe === probeGen && name === requestedSkin) {
      probing = false;
      refresh();
    }
  }
}

let soundRows = {};
let soundState = null;
let soundGen = 0;

function loadSounds() {
  if (!tauri) return;
  const gen = ++soundGen;
  const name = skin.name;
  tauri.core
    .invoke("skin_rows_off", { folder: name })
    .then((list) => gen === soundGen && applyRowsOff(list))
    .catch(() => {});
  return tauri.core
    .invoke("skin_sounds", { folder: name })
    .then((map) => {
      if (gen !== soundGen) return;
      soundRows = {};
      for (const [row, files] of Object.entries(map || {})) soundRows[row] = (files || []).map((f) => skinUrl(`${name}/${f}`));
    })
    .catch(() => {});
}

let rowsOff = new Set();

function applyRowsOff(list) {
  rowsOff = new Set(Array.isArray(list) ? list : []);
  shown = null;
  refresh();
}

function rowOff(conf) {
  if (!rowsOff.size || !conf) return false;
  for (const [id, row] of Object.entries(ROW_OF)) {
    if (!rowsOff.has(row)) continue;
    const [kind, key] = id.split(":");
    if ((kind === "state" ? STATES[key] : REACTIONS[key]) === conf) return true;
  }
  return false;
}

let playing = null;
let playingRow = null;
let playingFromAgent = false;
function stopSound() {
  if (playing) playing.pause();
  playing = null;
  playingRow = null;
  playingFromAgent = false;
}
const lastAgentSound = new Map();
function volumeOf100() {
  const n = Number(prefs.volume);
  if (!Number.isFinite(n)) return 70;
  return Math.min(100, Math.max(0, Math.round(n)));
}
function previewVolume(value) {
  if (!Number.isInteger(value) || value < 0 || value > 100) return;
  prefs.volume = value;
  if (playing) playing.volume = value / 100;
}
function playSound(row, list = soundRows[row || ""], fromAgent = false) {
  if (prefs.muted || (fromAgent && prefs.pin === "quiet")) return;
  if (!list || !list.length || typeof Audio !== "function") return;
  const volume = volumeOf100();
  if (volume === 0) return;
  const now = Date.now();
  const seconds = Number.isInteger(prefs.sound_repeat_seconds) ? Math.max(1, prefs.sound_repeat_seconds) : 10;
  let last = lastAgentSound.get(row);
  if (row !== "notify") {
    for (const entry of lastAgentSound.values()) if (!last || entry.at > last.at) last = entry;
  }
  if (fromAgent && prefs.sound_repeat_guard !== false && last && now - last.at < seconds * 1000) return;
  const audio = new Audio(pickRandom("sound:" + row, list));
  audio.volume = volume / 100;
  if (playing) playing.pause();
  playing = audio;
  playingRow = row;
  playingFromAgent = fromAgent;
  const entry = { at: now, audio };
  if (fromAgent) lastAgentSound.set(row, entry);
  const failed = () => {
    if (playing === audio) playing = null;
    if (fromAgent && lastAgentSound.get(row) === entry) lastAgentSound.delete(row);
  };
  audio.onended = () => { if (playing === audio) playing = null; };
  audio.onerror = failed;
  audio.play().catch(failed);
}

let prefs = { language: "", time: "24h", size: "m", pin: "top", remember_position: false, autostart: false, stuck_reminder: true, stuck_minutes: 10, volume: 70, muted: false, sound_repeat_guard: true, sound_repeat_seconds: 10 };
let statusLang = "";

function applySkinPref(value) {
  const raw = String(value || "").trim();
  const name = (raw.startsWith("user:") ? raw.slice(5) : raw) || "evie";
  const changed = name !== requestedSkin;
  if (changed) { requestedSkin = name; skin = { name }; }
  return changed;
}

function applyPrefs(view) {
  if (!view) return;
  prefs = view.prefs || prefs;
  if (prefs.muted || (prefs.pin === "quiet" && playingFromAgent)) stopSound();
  if (view.pet_px) document.documentElement.style.setProperty("--pet-size", view.pet_px + "px");
  const want = prefs.language === "en" ? "en" : prefs.language === "zh" ? "zh" : "";
  if (want !== statusLang) {
    statusLang = want;
    loadStatuses();
  }
  bubbleSig = "";
  const changedSkin = applySkinPref(prefs.skin);
  updateSkinHint();
  if (!started) return;
  if (changedSkin) {
    available.clear();
    fileOf.clear();
    probing = true;
    const probe = probeSkin();
    const generation = probeGen;
    probe.then((fresh) => {
      if (!fresh) return;
      shown = null;
    }).catch((error) => console.warn("[skin-change]", error)).finally(() => {
      if (generation !== probeGen) return;
      probing = false;
      refresh();
    });
  } else {
    refresh();
  }
}

let status = { id: Statuses.BUILTIN_ID, texts: {}, off: false };
let labelChoice = null;

const STATUS_URL = `http://127.0.0.1:${PET_PORT}/status/?${resourceKeyQuery}`;

const statusKey = (id) => String(id).replace(/^(state|reaction):/, "");

function labelText(id, fallback) {
  if (!labelChoice || labelChoice.id !== id) {
    labelChoice = { id, text: Statuses.pick(status.texts[statusKey(id)]) };
  }
  return labelChoice.text || fallback;
}

function updateStatusLabel() {
  const [kind, key] = String(shown).split(":");
  const conf = kind === "reaction" ? REACTIONS[key] : stateOf(key);
  const text = labelText(shown, (conf || stateOf("idle") || {}).name);
  labelTextEl.textContent = connected === 0 ? connectHint() : text;
  labelEl.hidden = status.off;
}

async function loadStatuses() {
  const pack = await fetch(STATUS_URL)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  const list = Array.isArray(pack && pack.statuses) ? pack.statuses : [];
  const en = statusLang ? statusLang === "en" : /^en/i.test(navigator.language || "");
  const official = Statuses.byLang(Statuses.BUILTIN, en);
  const all = Statuses.allFiles(list);
  const texts = {};
  if (status.id === "off") {
  } else {
    const chosen = all.find((v) => v.id === status.id);
    if (chosen) Object.assign(texts, Statuses.merge(Statuses.byLang(chosen, en), official));
    else Object.assign(texts, official.texts);
  }
  status.texts = texts;
  status.off = status.id === "off";
  labelChoice = null;
  updateStatusLabel();
  if (tauri) tauri.core.invoke("set_statuses", { items: Statuses.catalog(list, en) }).catch(() => {});
  refresh();
}

function setStatus(id) {
  status.id = id || Statuses.BUILTIN_ID;
  return loadStatuses().then(() => {
    if (tauri) tauri.core.invoke("status_set", { id: status.id }).catch(() => {});
  });
}

labelEl.hidden = true;
if (tauri) {
  tauri.event.listen("pet-test-next", nextState);
  tauri.event.listen("pet-test-stop", stopTest);
  tauri.event.listen("status-changed", (e) => {
    status.id = String(e.payload || Statuses.BUILTIN_ID);
    loadStatuses();
  });
  tauri.core
    .invoke("status_get")
    .then((id) => {
      status.id = String(id || Statuses.BUILTIN_ID);
      return loadStatuses();
    })
    .catch(() => {});
  tauri.event.listen("prefs-changed", (e) => applyPrefs(e.payload));
  tauri.event.listen("volume-preview", (e) => previewVolume(e.payload?.volume));
  tauri.event.listen("agents-changed", (e) => {
    connected = Number(e.payload) || 0;
    refresh();
  });
  tauri.core
    .invoke("agent_list")
    .then((list) => {
      connected = (Array.isArray(list) ? list : []).filter((a) => a && a.connected).length;
      refresh();
    })
    .catch(() => {});
  tauri.event.listen("skins-changed", (e) => applySkins(e.payload));
  tauri.core.invoke("skin_overrides").then(applySkins).catch(() => {});
  tauri.event.listen("sounds-changed", loadSounds);
  tauri.event.listen("skin-resources-refresh", refreshSkinResources);
  tauri.event.listen("preview-skin-sound", async (event) => {
    const request = event.payload;
    if (!request || request.skin !== skin.name) return;
    try {
      const map = await tauri.core.invoke("skin_sounds", { folder: request.skin });
      if (request.skin !== skin.name) return;
      const files = map[request.row] || [];
      playSound(request.row, files.map((file) => skinUrl(`${request.skin}/${file}`)));
    } catch (error) {
      console.warn("[sound-preview]", error);
    }
  });
  loadSounds();
} else {
  loadStatuses();
}
window.setStatus = setStatus;

const AGENT_NAMES = { claude: "Claude Code", codex: "Codex", dsh: "DSH", cursor: "Cursor", antigravity: "Antigravity" };
const BUBBLE_TEXT = {
  zh: { needs: "找你", approval: "在等你批准", ask: "有问题问你", answer: "在等你回答", gotit: "知道了", run: "想运行", edit: "想修改", read: "想查看", autoMaybe: "(开了自动批准的话请无视)" },
  en: { needs: "needs you", approval: "waiting for your approval", ask: "has a question for you", answer: "waiting for your answer", gotit: "Got it", run: "wants to run", edit: "wants to edit", read: "wants to read", autoMaybe: "(ignore this if auto-approve is on)" },
};
const bubbleWord = (key) => (BUBBLE_TEXT[prefs.language === "en" ? "en" : "zh"] || {})[key] || key;
const bubbleColon = () => (prefs.language === "en" ? ": " : "：");
const RUN_TOOLS = new Set(["Bash", "Shell", "PowerShell", "run_shell_command", "bash", "shell", "run_command"]);
const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit", "apply_patch", "edit", "write_file", "write_to_file"]);
const READ_TOOLS = new Set(["Read", "Grep", "Glob", "WebSearch", "WebFetch", "read_file", "grep_search", "glob", "view_file"]);
const needYou = () => Statuses.truncate(Statuses.pick(status.texts.need_you), 16) || bubbleWord("needs");
let bubbleOpen = false;
let bubbleSig = "";
let bubblePrivacy = false;
let folderNames = {};

function waitingList(now) {
  const list = [];
  for (const [id, s] of sessions) {
    const v = sessionView(s, now);
    if (v.kind === "notify")
      list.push({ id, at: v.at, reason: v.reason, minutes: Math.floor((now - s.at) / MIN), question: s.question, cwd: s.cwd, tool: s.tool, detail: s.detail, command: s.command, file: s.file });
  }
  return list.sort((a, b) => Number(a.reason === "stuck") - Number(b.reason === "stuck") || a.at - b.at);
}

const stuckText = (item) =>
  prefs.language === "en" ? `no signal for ${item.minutes} min — stuck, or already stopped?` : `${item.minutes} 分钟没收到消息，可能卡住了，也可能已经停了`;
const stuckBody = () =>
  prefs.language === "en"
    ? "The pet can't tell if it's stuck or already stopped (e.g. you pressed stop). Click the paw if it's fine."
    : "桌宠分不清是卡住了，还是已经停了（比如你按了停止）。没事就点小猫爪收起。";

function bubbleName(item) {
  const source = String(item.id).split(":")[0];
  const agent = AGENT_NAMES[source] || source;
  const nickname = FolderNames.nickname(folderNames, item.cwd);
  return nickname ? `${nickname} · ${agent}` : agent;
}

function bubbleBody(item) {
  if (item.reason === "stuck") return stuckBody();
  if (item.reason === "ask") return !bubblePrivacy && item.question ? item.question : bubbleWord("answer");
  if (!bubblePrivacy) {
    const tool = item.tool || "";
    if (RUN_TOOLS.has(tool) && item.command) return `${bubbleWord("run")}${bubbleColon()}${item.command}`;
    if (EDIT_TOOLS.has(tool) && item.file) return `${bubbleWord("edit")}${bubbleColon()}${item.file}`;
    if (READ_TOOLS.has(tool) && item.file) return `${bubbleWord("read")}${bubbleColon()}${item.file}`;
    if (item.detail) return item.detail;
  }
  return bubbleWord("approval");
}

function renderBubble(now) {
  const list = waitingList(now);
  labelCountEl.hidden = list.length === 0;
  if (list.length) labelCountEl.textContent = String(list.length);
  if (!list.length || prefs.pin === "quiet") {
    bubbleOpen = false;
    bubbleEl.hidden = true;
    bubbleSig = "";
    return;
  }
  const item = list[0];
  const suffixText = item.reason === "stuck" ? stuckText(item) : item.reason === "ask" ? bubbleWord("ask") : needYou();
  const head = `[${bubbleName(item)}] ${suffixText}`;
  const body = bubbleBody(item);
  const sig = `${item.id}|${item.at}|${head}|${body}|${bubbleOpen}|${bubblePrivacy}|${JSON.stringify(folderNames)}`;
  if (sig === bubbleSig) return;
  bubbleSig = sig;
  bubbleEl.hidden = false;
  bubbleEl.classList.toggle("open", bubbleOpen);
  bubbleEl.classList.toggle("stuck", item.reason === "stuck");
  bubbleEl.classList.toggle("ask", item.reason === "ask");
  const nameSpan = document.createElement("span");
  nameSpan.className = "bubble-name";
  nameSpan.textContent = `[${bubbleName(item)}]`;
  const suffix = document.createElement("span");
  suffix.textContent = ` ${suffixText}`;
  bubbleTextEl.replaceChildren(nameSpan, suffix);
  if (bubblePawEl) bubblePawEl.title = bubbleWord("gotit");
  const bodyMain = document.createElement("div");
  bodyMain.textContent = body;
  if (item.reason === "approval" && String(item.id).split(":")[0] === "codex") {
    const autoMaybe = document.createElement("div");
    autoMaybe.textContent = bubbleWord("autoMaybe");
    autoMaybe.style.color = "#aaa";
    bubbleBodyEl.replaceChildren(bodyMain, autoMaybe);
  } else {
    bubbleBodyEl.replaceChildren(bodyMain);
  }
  bubbleBodyEl.hidden = !bubbleOpen;
}

bubbleEl.addEventListener("pointerdown", (e) => e.stopPropagation());
bubbleEl.addEventListener("pointerup", (e) => e.stopPropagation());
bubbleTextEl.addEventListener("click", () => {
  bubbleOpen = !bubbleOpen;
  bubbleSig = "";
  refresh();
});

if (bubblePawEl) {
  bubblePawEl.addEventListener("click", (e) => {
    e.stopPropagation();
    const first = waitingList(Date.now())[0];
    if (first) acknowledge(first.id, Date.now());
    bubbleSig = "";
    refresh();
  });
}

if (tauri) {
  tauri.event.listen("scan-working-agents", async () => {
    try {
      await tauri.core.invoke("scan_folders", { paths: scanFolderPaths() });
      await tauri.event.emitTo("settings", "folder-scan-result", {});
    } catch (error) {
      await tauri.event.emitTo("settings", "folder-scan-result", { error: String(error) });
    }
  });
  tauri.event.listen("folder-names-changed", (e) => {
    folderNames = e.payload || {};
    bubbleSig = "";
    refresh();
  });
  tauri.event.listen("bubble-privacy-changed", (e) => {
    bubblePrivacy = !!e.payload;
    bubbleSig = "";
    refresh();
  });
  tauri.core
    .invoke("bubble_privacy")
    .then((on) => {
      bubblePrivacy = !!on;
      bubbleSig = "";
    })
    .catch(() => {});
  tauri.core
    .invoke("bubble_folder_names")
    .then((names) => {
      folderNames = names || {};
      bubbleSig = "";
    })
    .catch(() => {});
}
window.setBubblePrivacy = (on) => {
  bubblePrivacy = !!on;
  bubbleSig = "";
  refresh();
};
window.setFolderNames = (names) => {
  folderNames = names || {};
  bubbleSig = "";
  refresh();
};

window.setPetState = receive;
window.petReact = react;

function receiveSignal(payload) {
  const { state, session, cwd, tool, detail, command, file, event } = payload;
  if (state) receive(state, session, { cwd, tool, detail, event, ...(String(session).startsWith("cursor:") ? { command, file } : {}) });
  else endSession(session);
}
if (tauri) tauri.event.listen("pet-state", (e) => receiveSignal(e.payload));

let requestedSkin = "evie";
let missingSkin = "";
let anySkins = true;
function updateSkinHint() {
  if (!skinHintEl) return;
  skinHintEl.textContent = !anySkins
    ? (prefs.language === "en" ? "Skins folder not found" : "找不到 skins 文件夹")
    : (prefs.language === "en" ? `Skin not found: ${missingSkin}` : `找不到皮肤 ${missingSkin}`);
  skinHintEl.hidden = anySkins && !missingSkin;
}

(async function boot() {
  if (tauri) {
    try {
      applyPrefs(await tauri.core.invoke("prefs_get"));
    } catch {
    }
  }
  start();
})();
