(function (root) {
  "use strict";

  const BUILTIN_ID = "DeskPetOfficialStatus";

  const BUILTIN_ZH = `# 桌宠状态名 · 默认
# 以 # 开头的行是说明，程序不读。
# 写法：英文名 = 显示的字。英文名不要改，只改等号右边。
# 想让它每次随机说一句：用 | 隔开，比如  notify = 我等你哦 | 快来看看嘛
# 右边留空 = 这一句用"默认"版本的。
# 尽量短：胶囊很小，太长会被截掉（中文大概 6 个字以内最好看）。

名字 = 默认

# 干完活、闲着的时候
idle = 待机

# 你刚发完话，约 1 秒
prompt = 接活

# agent 在想
thinking = 思考

# 想了很久（对眼那张图）
crosseye = 思考·对眼

# 读文件、搜索、查网页
reading = 查资料

# 改文件、写代码
typing = 敲代码

# 跑命令、等结果
bash = 等结果

# 要你批准、问你问题
notify = 举手

# 举手 2 分钟没人理之后
call = 看这里

# 干完活了
done = 开心

# 出错了
error = 出错

# 被连戳、背对时被戳、举手等急了
angry = 生气

# 闲了 3 分钟以后
look1 = 无聊·看旁边

# 同上
look2 = 无聊·扭头

# 闲了 5 分钟以后
look3 = 无聊·侧身

# 同上，偶尔背对你
look4 = 无聊·背对你

# 闲了 7 分钟
yawn = 困

# 闲了 10 分钟
sleep1 = 睡

# 再过 15 分钟
sleep2 = 熟睡

# 再过 15 分钟
sleep3 = 死睡

# 再过 15 分钟
sleep4 = 四仰八叉

# 睡着时被戳、睡着时来活
wake = 惊醒

# 醒着时被戳一下
poke = 戳戳

# 按住拖着走的时候
lifted = 被拎起来

# 举手气泡折叠时那行"[名字] 找你"里的"找你"（2026-09-30 起；换性格想换说法就改这一行）
need_you = 找你
`;

  const BUILTIN_EN = `# Desk pet status text (English) · Default
# Lines starting with # are notes; the program skips them.
# Format: key = text to show. Don't change the key on the left; only edit the text after the "=".
# For a random line each time, separate options with |, e.g.  notify = Waiting for you | Take a look?
# Leave the right side empty to use the line from "Default" instead.
# Keep it short: the label under the cat is small, and long text gets cut off (about 12 characters or fewer looks best).

# Name shown in Settings
name = Default

# Done working, nothing to do
idle = Idle

# Right after you send a message (about 1 second)
prompt = On it

# The agent is thinking
thinking = Thinking

# Thinking for a long time (the cross-eyed picture)
crosseye = Overthinking

# Reading files, searching, browsing the web
reading = Reading

# Editing files, writing code
typing = Coding

# Running commands, waiting for results
bash = Running

# Needs your approval, or has a question for you
notify = Need you

# Hand still up after 2 minutes with no reply
call = Over here!

# Finished
done = Done!

# Something went wrong
error = Error

# Poked again and again, poked while turned away, or tired of waiting with a hand up
angry = Angry

# After 3 minutes idle
look1 = Bored

# Same as above
look2 = Bored

# After 5 minutes idle
look3 = Bored

# Same as above; sometimes turns its back on you
look4 = Ignoring you

# After 7 minutes idle
yawn = Sleepy

# After 10 minutes idle
sleep1 = Asleep

# 15 minutes later
sleep2 = Deep sleep

# 15 minutes later
sleep3 = Out cold

# 15 minutes later
sleep4 = Belly up

# Poked while asleep, or work arrives while asleep
wake = Woke up

# The words after the name in the collapsed hand-raise bubble: "[name] ___"
need_you = needs you!

# Poked once while awake
poke = Poked

# Being held and dragged around
lifted = Picked up
`;

  const BUILTIN = { id: BUILTIN_ID, zh: BUILTIN_ZH, en: BUILTIN_EN };

  const MAX_UNITS = 12;

  const WIDE = /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/;
  const widthOf = (ch) => (WIDE.test(ch) ? 2 : 1);

  function parse(text) {
    const out = { name: "", texts: {}, en: { name: "", texts: {} }, inline: false };
    for (const raw of String(text || "").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      let key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim();
      const isEn = key.endsWith(".en");
      if (isEn) { key = key.slice(0, -3); out.inline = true; }
      const target = isEn ? out.en : out;
      if (key === "名字" || key.toLowerCase() === "name") {
        target.name = value;
        continue;
      }
      target.texts[key] = value
        ? value
            .split("|")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
    }
    return out;
  }

  function stateTexts(texts) {
    const out = { ...texts };
    const aliases = {
      onit: ["prompt"], overthinking: ["crosseye"], running: ["bash"],
      poked: ["poke"], grab: ["lifted"],
      bored: ["look1", "look2", "look3", "look4"],
      sleep: ["sleep1", "sleep2", "sleep3", "sleep4"],
    };
    for (const [key, states] of Object.entries(aliases)) {
      if (!Object.prototype.hasOwnProperty.call(texts, key)) continue;
      for (const state of states) out[state] = texts[key];
      delete out[key];
    }
    return out;
  }

  function byLang(files, en) {
    const base = parse(files && files.zh);
    const legacy = parse(files && files.en);
    if (!base.inline && String((files && files.en) || "").trim()) {
      const first = en ? legacy : base;
      const chosen = first.name ? first : (en ? base : legacy);
      return { name: chosen.name, texts: stateTexts(chosen.texts) };
    }
    const order = en ? [base.en, legacy, base] : [base, base.en, legacy];
    const texts = {};
    for (const source of [...order].reverse()) Object.assign(texts, stateTexts(source.texts));
    return { name: order.find((source) => source.name)?.name || "", texts };
  }

  function merge(status, normal) {
    const texts = {};
    for (const [k, v] of Object.entries((normal && normal.texts) || {})) texts[k] = v;
    for (const [k, v] of Object.entries((status && status.texts) || {})) if (v.length) texts[k] = v;
    return texts;
  }

  function pick(list, rand = Math.random) {
    if (!Array.isArray(list) || !list.length) return "";
    return list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
  }

  function truncate(s, maxUnits = MAX_UNITS) {
    const text = String(s || "");
    let total = 0;
    for (const ch of text) total += widthOf(ch);
    if (total <= maxUnits) return text;
    let used = 0;
    let out = "";
    for (const ch of text) {
      const w = widthOf(ch);
      if (used + w > maxUnits - 1) break;
      used += w;
      out += ch;
    }
    return out + "…";
  }

  function allFiles(list) {
    const rest = (Array.isArray(list) ? list : []).filter((v) => v && v.id && v.id !== BUILTIN_ID);
    return [BUILTIN, ...rest];
  }

  function catalog(list, en) {
    return allFiles(list).map((f) => {
      const parsed = byLang(f, en);
      const name = f.read_warning ? `${f.id}${en ? " (read error; save as UTF-8)" : "（读取异常，请另存 UTF-8）"}` : parsed.name || f.id;
      return { id: f.id, name };
    });
  }

  root.Statuses = { MAX_UNITS, BUILTIN_ID, BUILTIN, parse, allFiles, catalog, byLang, merge, pick, truncate };
})(typeof window !== "undefined" ? window : globalThis);
