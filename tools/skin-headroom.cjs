const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");
const RAD = Math.PI / 180;

function block(source, marker) {
  const at = source.indexOf(marker);
  if (at < 0) throw new Error(`顶部检查找不到源码：${marker}`);
  const start = source.indexOf("{", at);
  let depth = 1, end = start + 1;
  while (end < source.length && depth) { if (source[end] === "{") depth++; if (source[end] === "}") depth--; end++; }
  if (depth) throw new Error(`顶部检查无法读取：${marker}`);
  return source.slice(start + 1, end - 1);
}

function framesOf(html, name) {
  const body = block(html, `@keyframes ${name} {`);
  const frames = [];
  for (const match of body.matchAll(/((?:\d+%\s*,?\s*)+)\{\s*transform:\s*([^;]+);[^}]*\}/g)) {
    const frame = { sx: 1, sy: 1, angle: 0, tx: 0, ty: 0 };
    const text = match[2];
    for (const [, fn, arg] of text.matchAll(/(\w+)\(([^)]+)\)/g)) {
      const values = arg.split(",").map(v => parseFloat(v));
      if (values.some(v => !Number.isFinite(v))) throw new Error(`顶部检查不认识 ${name} 的 ${text}`);
      if (fn === "scale") [frame.sx, frame.sy] = [values[0], values[1] ?? values[0]];
      else if (fn === "scaleY") frame.sy = values[0];
      else if (fn === "scaleX") frame.sx = values[0];
      else if (fn === "rotate") frame.angle = values[0];
      else if (fn === "translateY") frame.ty = values[0];
      else if (fn === "translateX") frame.tx = values[0];
      else throw new Error(`顶部检查尚未支持 ${name}: ${fn}`);
    }
    for (const offset of match[1].matchAll(/(\d+)%/g)) frames.push({ ...frame, offset: +offset[1] / 100 });
  }
  if (!frames.length) throw new Error(`顶部检查未读到动画 ${name}`);
  return frames.sort((a, b) => a.offset - b.offset);
}

function easing(name, x) {
  if (name === "linear") return x;
  const steps = /^steps\((\d+)\)/.exec(name);
  if (steps) return Math.floor(x * +steps[1]) / +steps[1];
  const bezier = { "ease-in-out": [.42, 0, .58, 1], "ease-out": [0, 0, .58, 1] }[name]
    || name.match(/cubic-bezier\(([^)]+)\)/)?.[1].split(",").map(Number);
  if (!bezier) throw new Error(`顶部检查未支持缓动 ${name}`);
  const [a, b, c, d] = bezier;
  const curve = (t, p, q) => 3 * (1 - t) ** 2 * t * p + 3 * (1 - t) * t * t * q + t ** 3;
  let lo = 0, hi = 1;
  for (let i = 0; i < 30; i++) { const t = (lo + hi) / 2; if (curve(t, a, c) < x) lo = t; else hi = t; }
  return curve((lo + hi) / 2, b, d);
}
const identity = () => ({ sx: 1, sy: 1, angle: 0, tx: 0, ty: 0 });
function at(animation, ms) {
  if (ms < 0 || (!animation.repeat && ms >= animation.duration) || (animation.iterations && ms >= animation.duration * animation.iterations)) return identity();
  const phase = (ms % animation.duration) / animation.duration;
  const frames = animation.frames;
  const right = frames.findIndex(f => f.offset > phase);
  const b = frames[right < 0 ? frames.length - 1 : right], a = frames[Math.max(0, right - 1)];
  const k = a === b ? 0 : easing(animation.easing, (phase - a.offset) / (b.offset - a.offset));
  return Object.fromEntries(Object.keys(identity()).map(key => [key, a[key] + (b[key] - a[key]) * k]));
}
function pointAt(p, frame, origin, factor = 1) {
  const x = (p[0] - origin[0]) * frame.sx, y = (p[1] - origin[1]) * frame.sy;
  const angle = frame.angle * RAD;
  return [origin[0] + x * Math.cos(angle) - y * Math.sin(angle) + frame.tx * factor,
    origin[1] + x * Math.sin(angle) + y * Math.cos(angle) + frame.ty * factor];
}

function hullOf(png, alpha = 40) {
  const points = [];
  let top = png.height;
  for (let y = 0; y < png.height; y++) {
    let left = png.width, right = -1;
    for (let x = 0; x < png.width; x++) if (png.data[(y * png.width + x) * 4 + 3] > alpha) { left = Math.min(left, x); right = x; }
    if (right >= 0) { top = Math.min(top, y); points.push([left, y], [right + 1, y], [left, y + 1], [right + 1, y + 1]); }
  }
  if (!points.length) return { points: [], top: null };
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const half = list => { const h = []; for (const p of list) { while (h.length > 1 && cross(h.at(-2), h.at(-1), p) <= 0) h.pop(); h.push(p); } return h; };
  const a = half(points), b = half(points.slice().reverse());
  return { points: [...a.slice(0, -1), ...b.slice(0, -1)], top };
}

function createModel() {
  const read = name => fs.readFileSync(path.join(ROOT, name), "utf8").replace(/\r\n/g, "\n");
  const html = read("src/index.html"), pet = read("src/pet.js"), prefs = read("src-tauri/src/prefs.rs");
  const number = name => {
    const match = pet.match(new RegExp(`const ${name} = ([^;\\n]+);`));
    const expression = match?.[1].replace(/\bSEC\b/g, "1000").replace(/\bMIN\b/g, "60000");
    if (!expression || !/^[\d.e+*/()\s-]+$/.test(expression)) throw new Error(`顶部检查无法读取数字 ${name}`);
    return Function(`return (${expression});`)();
  };
  const pairs = body => Object.fromEntries([...body.matchAll(/(\w+):\s*"([^"]+)"/g)].map(m => [m[1], m[2]]));
  const fallback = pairs(block(pet, "const FALLBACK = {"));
  const rows = ["STATES", "REACTIONS"].flatMap(key => [...block(pet, `const ${key} = {`).matchAll(/(\w+):\s*\{[^\n]*?frames:\s*"([^"]+)"[^\n]*?motion:\s*"([^"]+)"/g)].map(m => ({ id: m[1], frames: m[2], motion: m[3], name: m[1] === "done" ? "干完活" : m[0].match(/name:\s*"([^"]+)"/)?.[1] || m[1] })));
  const sizes = [...prefs.matchAll(/\("([sml])",\s*(\d+),\s*(\d+),\s*(\d+)\)/g)].map(m => ({ id: m[1], pet: +m[2], height: +m[4] }));
  if (sizes.length !== 3 || rows.length < 15) throw new Error("顶部检查未读全状态或大小档");
  const animation = marker => {
    const css = block(html, marker).match(/animation:\s*([\w-]+)\s+([\d.]+)(ms|s)\s+(.+?);/);
    if (!css) throw new Error(`顶部检查未读到动画 ${marker}`);
    const repeat = css[4].includes("infinite");
    return { frames: framesOf(html, css[1]), duration: +css[2] * (css[3] === "s" ? 1000 : 1), repeat,
      easing: css[4].replace(/\s+(infinite|1)$/, "") };
  };
  const pop = animation(".pop {");
  const motions = Object.fromEntries([...new Set(rows.map(r => r.motion))].filter(m => m !== "dangle").map(m => [m, animation(`.m-${m} {`)]));
  const tail = number("TAIL_SWING_DEG");
  const amps = JSON.parse(pet.match(/const TAIL_SEG_AMP = (\[[^;]+\]);/)[1]);
  const array = name => JSON.parse(pet.match(new RegExp(`const ${name} = (\\[[^;]+\\]);`))[1]);
  const rig = { tail, amps, delays: array("TAIL_SEG_DELAY_MS"), tailMs: number("TAIL_SWING_MS"),
    twitch: number("EAR_TWITCH_DEG"), twitchMs: number("EAR_TWITCH_MS"), lean: number("EAR_LEAN_DEG"), settleMs: number("EAR_LEAN_SETTLE_MS") };
  const rigSource = read("src/rig.css");
  rig.animation = (name, duration, variables, repeat = false) => {
    const source = rigSource.replace(/var\((--[\w-]+)(?:,[^)]*)?\)/g, (all, key) => key in variables ? variables[key] : all)
      .replace(/calc\(([-\d.\s*+deg]+)\)/g, (_, expression) => `${Function(`return (${expression.replace(/deg/g, "")});`)()}deg`);
    return { frames: framesOf(source, name), duration, repeat, easing: "ease-in-out" };
  };
  const names = ["DANGLE_SWING_MS", "DANGLE_SETTLE_MS", "DANGLE_PUSH", "DANGLE_MAX_DEG", "DANGLE_SWAY_DEG", "DANGLE_HAND_MS", "SHADOW_MIN_SCALE"];
  const traces = Function(...names, `
    const softMax = ${pet.match(/const softMax = ([^;]+);/)[1]};
    let dangleAngle=0, dangleVel=0, dangleStartAt=0;
    function idleSway(t) { ${block(pet, "function idleSway(t)")} }
    function stepPendulum(dt, accel) { ${block(pet, "function stepPendulum(dt, accel)")} }
    return [0,1500,-1500,6000,-6000].map(speed => {
      dangleAngle=0; dangleVel=0;
      let hand=0, shadow=1; const frames=[];
      for(let ms=0;ms<=6000;ms+=4) {
        const raw=ms>=16&&ms<176 ? speed : ms>=600&&ms<760 ? -speed : 0;
        const before=hand; hand+=(raw-hand)*(1-Math.exp(-4/DANGLE_HAND_MS));
        stepPendulum(.004,(hand-before)/.004);
        const angle=+(softMax(dangleAngle)+idleSway(ms)).toFixed(2);
        const want=1-(1-SHADOW_MIN_SCALE)*Math.min(1,Math.abs(angle)/DANGLE_MAX_DEG);
        shadow+=(want-shadow)*(1-Math.exp(-4/100));
        frames.push({ms,angle,scale:+shadow.toFixed(3)});
      } return {speed,frames};
    });`)(...names.map(number));
  const badge = read("src/ds-badge.css");
  const px = (body, property) => {
    const match = body.match(new RegExp(`${property}:\\s*([\\d.]+)px`));
    if (!match) throw new Error(`顶部检查未读到 ${property}`);
    return +match[1];
  };
  const boxHeight = body => {
    const font = body?.match(/font:\s*([\d.]+)px\/([\d.]+)(px)?\s/);
    const padding = body?.match(/padding:\s*([\d.px\s]+);/);
    if (!font || !padding) throw new Error("顶部检查的标签/胶囊高度需要重新核对");
    const values = padding[1].trim().split(/\s+/).map(parseFloat);
    return +font[2] * (font[3] ? 1 : +font[1]) + values[0] + (values.length >= 3 ? values[2] : values[0]);
  };
  const label = [...html.matchAll(/#label\s*\{([^}]+)\}/g)].find(m => m[1].includes("font:"))?.[1];
  const layout = { bottom: px(block(html, "#stage {"), "padding-bottom"), gap: px(block(html, "#bottom-row {"), "margin-top"), row: Math.max(boxHeight(label), boxHeight(block(badge, "#ds-badge {"))) };
  const fxDefaults = Function("LOADING_TURN_MS", "LOADING_STEPS", `return {${block(pet, "const FX_DEFAULTS = {")}};`)(number("LOADING_TURN_MS"), number("LOADING_STEPS"));
  const fxSource = pet.match(/function fxPlan\(o, size\) \{[\s\S]*?\n\}/)[0];
  const fxPlan = Function("FX_DEFAULTS", `return (${fxSource});`)(fxDefaults);
  const tails = JSON.parse(pet.match(/const RIG_TAIL_SEGMENTS = (\[[^;]+\]);/)[1]);
  const bodies = [...tails, ...[...pet.match(/const RIG_BODY_PARTS = (\[[^;]+\]);/)[1].matchAll(/"([^"]+)"/g)].map(m => m[1])];
  const eyes = JSON.parse(pet.match(/const RIG_EYELIDS = (\[[^;]+\]);/)[1]);
  return { rows, sizes, fallback, pop, motions, rig, traces, fxPlan, bodies, eyes, layout };
}

function poseAt(model, p, motion, cfg, size, H, ms, local = q => q) {
  const inner = pointAt(local(p, ms), at(model.pop, ms), cfg.pivot);
  return pointAt(inner, at(model.motions[motion], ms), cfg.pivot, H / size.pet);
}
function minimum(model, points, motion, cfg, size, H, options = {}) {
  const anim = model.motions[motion] || { frames: [{...identity(),offset:0}], duration: 6000, repeat: true, easing: "linear" };
  const end = options.duration || Math.max(anim.duration, model.pop.duration + anim.duration);
  const start = options.start || 0;
  const times = new Set([0, end]);
  for (let ms = 0; ms <= end; ms += options.step || 1) times.add(ms);
  for (const a of [anim, model.pop]) for (let base = 0; base <= end; base += a.duration)
    for (const f of a.frames) if (base + f.offset * a.duration <= end) times.add(base + f.offset * a.duration);
  let result = { y: Infinity, ms: 0, pixel: null };
  for (const ms of times) {
    const time = start + ms;
    const pop = at(model.pop, time), outer = options.outer ? options.outer(time) : at(anim, time);
    for (const p of points) {
      const local = options.local ? options.local(p, time) : p;
      if (!local) continue;
      const q = pointAt(pointAt(local, pop, cfg.pivot), outer, motion === "dangle" ? cfg.grab : cfg.pivot, H / size.pet);
      if (q[1] < result.y) result = { y: q[1], ms: time, pixel: p };
    }
  }
  return result;
}

function inspect(model, items, cfg, W, H) {
  const files = new Map(), available = new Set(), folders = new Map();
  for (const item of items.slice().sort((a, b) => a.label < b.label ? -1 : a.label > b.label ? 1 : 0)) {
    const stem = item.label.replace(/\.png$/i, ""), lower = stem.toLowerCase();
    const folder = stem.includes("/") ? lower.slice(0, lower.lastIndexOf("/")) : "";
    const name = lower.startsWith("idle_rig/") ? "idle_" + lower.slice(9) : lower.split("/").at(-1);
    if (folder && folder !== "idle_rig") { if (!folders.has(folder)) folders.set(folder, []); folders.get(folder).push(lower); files.set(lower, item); }
    if (!files.has(name)) { files.set(name, item); available.add(name); }
  }
  const exact = name => folders.get(name)?.length ? folders.get(name) : [...available].filter(n => n === name || (n.startsWith(name) && /^[1-9]\d*$/.test(n.slice(name.length))));
  const variants = name => exact(name.toLowerCase());
  const resolve = name => { const seen = new Set(); while (name && !seen.has(name)) { const list = variants(name); if (list.length) return list; seen.add(name); name = model.fallback[name]; } return []; };
  const geometry = new Map(items.map(it => [it, hullOf(it.png)]));
  const checks = [];
  const checkBox = (item, row, size, b, label = "") => {
    const availableTop = (size.height - size.pet - model.layout.bottom - model.layout.gap - model.layout.row) * H / size.pet;
    const excess = -b.y - availableTop;
    if (excess * size.pet / H >= 2) checks.push({ file: item.label, top: geometry.get(item).top, title: row.name || row.id, action: `${row.id}/${row.motion}${label}`, size: size.id, rise: -b.y, excess, ms: b.ms, pixel: b.pixel });
  };
  const check = (item, row, points, label = "", options = {}) => {
    if (!points.length) return;
    for (const size of model.sizes) {
      const b = minimum(model, points, row.motion, cfg, size, H, options);
      checkBox(item, row, size, b, label);
    }
  };
  const rigItems = items.filter(it => it.kind === "rig" && it.label.toLowerCase().startsWith("idle_rig/"));
  const rigActive = model.bodies.every(name => rigItems.some(it => it.partName.toLowerCase() === name.toLowerCase()));
  for (const row of model.rows) for (const name of row.id === "idle" && rigActive ? [] : resolve(row.frames)) {
    const item = files.get(name); if (!item) continue;
    if (row.motion === "dangle") {
      for (const trace of model.traces) check(item, row, geometry.get(item).points, ` 手速轨迹 ${trace.speed}`, {
        duration: 6000, outer: ms => ({...identity(),angle:trace.frames[Math.min(trace.frames.length-1,Math.floor(ms/4))].angle}) });
    } else check(item, row, geometry.get(item).points);
  }
  const r = model.rig;
  const eyeActive = model.eyes.every(name => rigItems.some(it => it.partName.toLowerCase() === name.toLowerCase()));
  const activeParts = [...model.bodies, ...(eyeActive ? model.eyes : [])];
  for (const item of rigActive ? rigItems.filter(it => activeParts.some(name => name.toLowerCase() === it.partName.toLowerCase())) : []) {
    const name = activeParts.find(name => name.toLowerCase() === item.partName.toLowerCase());
    const points = geometry.get(item).points, row = { id: "idle 分层", motion: "breathe" };
    check(item, row, points);
    let sequences = [];
    if (/^Tail[1-4]$/.test(name)) {
      const chain = Array.from({length:+name.slice(4)}, (_,i) => {
        const part = `Tail${i+1}`;
        return { origin: cfg.rigPivots[part] || [W/2,H/2], delay:r.delays[i],
          anim:{...r.animation("rig-tail-whip", r.tailMs, {"--tail-angle":r.tail,"--tail-seg-amp":r.amps[i]}, true),iterations:2} };
      }).reverse();
      sequences = [{ chain, duration:r.tailMs*2+Math.max(...r.delays), earliest:5000 }];
    } else if (/^ear[LR]$/.test(name)) {
      const sign = name === "earL" ? 1 : -1, origin = cfg.rigPivots[name] || [W/2,H/2];
      sequences = [
        {chain:[{origin,delay:0,anim:r.animation("rig-ear-twitch",r.twitchMs,{"--ear-angle":r.twitch,"--ear-sign":sign})}],duration:r.twitchMs,earliest:4000},
        {chain:[{origin,delay:0,anim:r.animation("rig-ear-lean-settle",r.settleMs,{"--ear-lean-angle":r.lean,"--ear-sign":sign})}],duration:r.settleMs,earliest:8000},
      ];
    }
    for (const seq of sequences) for (let phase=0;phase<model.motions.breathe.duration;phase+=100) {
      const start=seq.earliest+phase;
      let last=-1, transforms;
      const local=(p,ms) => {
        if(ms!==last) { last=ms; transforms=seq.chain.map(c => ({origin:c.origin,frame:at(c.anim,ms-start-c.delay)})); }
        return transforms.reduce((q,c) => pointAt(q,c.frame,c.origin),p);
      };
      check(item,row,points," 耳/尾动作",{start,duration:seq.duration,step:4,local});
    }
  }
  const gcd = (a,b) => b ? gcd(b,a%b) : a;
  for (const row of model.rows.filter(row => row.motion !== "dangle" && !(row.id === "idle" && rigActive))) {
    const frames=resolve(row.frames);
    const overlays=Object.entries(cfg.overlays).filter(([,fx]) => frames.some(n => (fx.on||[]).some(on => variants(on.toLowerCase()).includes(n)))).slice(0,3);
    for (const [name,fx] of overlays) {
      const item=files.get(variants(name.toLowerCase())[0]); if(!item) continue;
      const plan=model.fxPlan(fx,[W,H]);
      let duration,local;
      if(plan.motion === "spin") {
        const css=plan.css.match(/spin ([\d.]+)ms (.*?) infinite/);
        const anim={duration:+css[1],repeat:true,easing:css[2],frames:[{...identity(),offset:0},{...identity(),angle:360,offset:1}]};
        duration=anim.duration*model.motions[row.motion].duration/gcd(anim.duration,model.motions[row.motion].duration)+model.pop.duration;
        let last=-1,f;
        local=(p,ms) => { if(last!==ms) {last=ms;f=at(anim,ms);} return pointAt(p,f,fx.pivot||[W/2,H/2]); };
      } else if(plan.motion === "drip") {
        const anim={duration:plan.timing.duration,repeat:true,easing:"linear",frames:plan.keyframes.map(k => {
          const m=k.transform.match(/translate\(([-\d.]+)%,\s*([-\d.]+)%\)/);
          return {...identity(),offset:k.offset,tx:+m[1]*W/100,ty:+m[2]*H/100};
        })};
        duration=anim.duration*model.motions[row.motion].duration/gcd(anim.duration,model.motions[row.motion].duration)+model.pop.duration;
        const visibleEnd=plan.keyframes.find(k=>k.opacity===0).offset;
        let last=-1,f;
        local=(p,ms)=> { if(ms%anim.duration/anim.duration>=visibleEnd) return null;
          if(last!==ms) {last=ms;f=at(anim,ms);} return pointAt(p,f,[0,0]); };
      }
      check(item,row,geometry.get(item).points,` + 特效 ${plan.motion}`,{duration,local});
    }
  }
  for (const name of variants("vfx_grab_shadow")) {
    const item=files.get(name); if(!item) continue;
    for(const trace of model.traces) {
      const local=(p,ms)=> {
        const f=trace.frames[Math.min(trace.frames.length-1,Math.floor(ms/4))];
        return pointAt(pointAt(p,{...identity(),sx:f.scale,sy:f.scale},cfg.shadowPivot||[W/2,H*332/400]),{...identity(),angle:-f.angle},cfg.grab);
      };
      check(item,{id:"lifted 投影",motion:"dangle"},geometry.get(item).points,` 手速轨迹 ${trace.speed}`,{
        duration:6000,local,outer:ms=>({...identity(),angle:trace.frames[Math.min(trace.frames.length-1,Math.floor(ms/4))].angle})});
    }
  }
  return checks;
}

module.exports = { createModel, hullOf, inspect, minimum, poseAt, at, pointAt, easing };
