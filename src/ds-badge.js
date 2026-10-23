(function () {
  "use strict";

  const TEXT = {
    zh: {
      peak: "高峰",
      offpeak: "半价",
      title: "DeepSeek 价格时段",
      now: "现在",
      next: "下次切换",
      weekTitle: "本周（当地时间）",
      allDay: "全天半价",
      daysLater: (n) => `${n}天`,
      updated: (date) => `规则更新于 ${date}，以`,
      link: "DeepSeek 官网",
      tail: "为准",
      missing: (years) => `缺少 ${years.join("、")} 年的节假日数据，那几天按普通工作日算`,
      close: "关闭",
    },
    en: {
      peak: "Peak",
      offpeak: "Off-peak",
      title: "DeepSeek price hours",
      now: "Now",
      next: "Next change",
      weekTitle: "This week (local time)",
      allDay: "Off-peak all day",
      daysLater: (n) => `${n} ${n === 1 ? "day" : "days"}`,
      updated: (date) => `Rules updated ${date}, see`,
      link: "DeepSeek's site",
      tail: "for details",
      missing: (years) => `No holiday data for ${years.join(", ")}; those days count as normal workdays`,
      close: "Close",
    },
  };
  let lang = "zh";
  const T = () => TEXT[lang === "en" ? "en" : "zh"];

  const ICONS = {
    peak: "assets/ui/icon_ds_peak.png",
    offpeak: "assets/ui/icon_ds_offpeak.png",
  };
  const REFRESH_MS = 60 * 1000;

  const stage = document.getElementById("stage");
  if (!stage || !window.DsPrice) return;

  const tauri = window.__TAURI__;

  let engine = null;
  let buildEngine = null;
  let applyLang = null;
  let on = false;
  let opened = false;

  function el(tag, props, ...kids) {
    const node = document.createElement(tag);
    Object.assign(node, props || {});
    node.append(...kids);
    return node;
  }

  const faceImg = el("img", { alt: "", draggable: false, hidden: true });
  const faceDot = el("span", { className: "ds-dot" });
  const nextText = el("span", { className: "ds-next" }, "—");
  const badge = el("div", { id: "ds-badge", hidden: true }, faceImg, faceDot, nextText);

  const closeBtn = el("button", { className: "ds-close", title: TEXT.zh.close, type: "button" }, "×");
  const panel = el("div", { id: "ds-detail", hidden: true });

  faceImg.addEventListener("load", () => {
    faceImg.hidden = false;
    faceDot.hidden = true;
  });
  faceImg.addEventListener("error", () => {
    faceImg.hidden = true;
    faceDot.hidden = false;
  });

  const bottomRow = document.getElementById("bottom-row") || stage;
  bottomRow.append(badge);
  stage.append(panel);

  async function fetchJson(url) {
    try {
      const res = await fetch(url);
      return res.ok ? await res.json() : null;
    } catch (e) {
      return null;
    }
  }

  let faceShown = null;

  function render() {
    if (!engine || !on) return;
    const now = Date.now();
    const peak = engine.isPeakAt(now);

    badge.classList.toggle("is-peak", peak);
    badge.classList.toggle("is-offpeak", !peak);
    const face = peak ? "peak" : "offpeak";
    if (faceShown !== face) {
      faceShown = face;
      faceImg.src = ICONS[face];
    }
    nextText.textContent = engine.switchLabel(engine.nextSwitchAt(now), now);

    if (opened) renderPanel(now);
  }

  function weekRow(row) {
    const t = T();
    const en = lang === "en";
    const times = row.ranges.length
      ? row.ranges.join(en ? ", " : "、")
      : row.holidayName
        ? (en ? `${t.allDay} (${row.holidayName})` : `${t.allDay}（${row.holidayName}）`)
        : t.allDay;
    return el(
      "div",
      { className: "ds-week" + (row.isToday ? " today" : "") },
      el("span", { className: "ds-wd" }, row.weekday),
      el("span", { className: "ds-times" }, times)
    );
  }

  function renderPanel(now) {
    const t = T();
    const peak = engine.isPeakAt(now);
    const link = el("span", { className: "ds-link" }, t.link);
    link.addEventListener("click", () => {
      if (tauri && engine.sourceUrl) tauri.core.invoke("open_url", { url: engine.sourceUrl }).catch(() => {});
    });
    const parts = [
      el("div", { className: "ds-head" }, el("span", {}, t.title), closeBtn),
      el("div", { className: "ds-line" }, el("span", {}, t.now), el("b", {}, peak ? t.peak : t.offpeak)),
      el("div", { className: "ds-line" }, el("span", {}, t.next), el("b", {}, engine.switchLabel(engine.nextSwitchAt(now), now))),
      el("div", { className: "ds-week-title" }, t.weekTitle),
      ...engine.weekRows(now).map(weekRow),
      el("div", { className: "ds-note" }, t.updated(engine.ruleUpdated), link, ` ${t.tail}`),
    ];
    if (engine.missingYears.length) parts.push(el("div", { className: "ds-warn" }, t.missing(engine.missingYears)));
    panel.replaceChildren(...parts);
  }

  function openPanel() {
    opened = true;
    panel.hidden = false;
    if (engine) renderPanel(Date.now());
  }

  function closePanel() {
    opened = false;
    panel.hidden = true;
  }

  function apply() {
    badge.hidden = !on || !engine;
    if (!on) closePanel();
    else render();
  }

  async function readSwitch() {
    if (!tauri) {
      return new URLSearchParams(location.search).get("ds") === "1";
    }
    return tauri.core.invoke("ds_price_on").catch(() => false);
  }

  for (const node of [badge, panel]) {
    node.addEventListener("pointerdown", (e) => e.stopPropagation());
    node.addEventListener("pointerup", (e) => e.stopPropagation());
  }
  badge.addEventListener("click", () => (opened ? closePanel() : openPanel()));
  closeBtn.addEventListener("click", closePanel);
  document.addEventListener("pointerdown", (e) => {
    if (opened && !e.target.closest("#ds-badge, #ds-detail")) closePanel();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePanel();
  });

  (async function boot() {
    const rules = await fetchJson("data/deepseek-pricing.json");
    if (!rules || !rules.peak) return;
    const dir = (rules.holidays && rules.holidays.dir) || "data/holidays-cn";
    const years = (rules.holidays && rules.holidays.years) || [];
    const docs = {};
    for (const y of years) docs[y] = await fetchJson(`${dir}/${y}.json`);
    buildEngine = (p) =>
      window.DsPrice.create(rules, docs, {
        locale: p && p.language === "en" ? "en-US" : p && p.language === "zh" ? "zh-CN" : undefined,
        hour12: p && p.time === "12h" ? true : p && p.time === "24h" ? false : undefined,
        daysLater: T().daysLater,
      });

    applyLang = (p) => {
      lang = p && p.language === "en" ? "en" : "zh";
      closeBtn.title = T().close;
    };

    if (tauri) {
      tauri.event.listen("ds-price-changed", (e) => { on = !!e.payload; apply(); });
      tauri.event.listen("prefs-changed", (e) => {
        applyLang(e.payload && e.payload.prefs);
        engine = buildEngine(e.payload && e.payload.prefs);
        render();
      });
      const view = await tauri.core.invoke("prefs_get").catch(() => null);
      applyLang(view && view.prefs);
      engine = buildEngine(view && view.prefs);
    } else {
      engine = buildEngine(null);
    }
    on = await readSwitch();
    apply();

    (function tick() {
      setTimeout(() => {
        render();
        tick();
      }, REFRESH_MS - (Date.now() % REFRESH_MS) + 50);
    })();
    document.addEventListener("visibilitychange", render);
  })();
})();
