(function (root) {
  "use strict";

  const MIN_MS = 60 * 1000;
  const DAY_MS = 24 * 60 * MIN_MS;
  const BOUNDARY_HOURS = [0, 1, 4, 6, 10, 16];
  const MAX_SCAN_DAYS = 400;
  const SAMPLE_MS = 15 * MIN_MS;

  const two = (n) => String(n).padStart(2, "0");
  const toMin = (hhmm) => {
    const [h, m] = String(hhmm).split(":").map(Number);
    return h * 60 + m;
  };

  function create(rules, holidayDocs, options) {
    const opts = options || {};
    const timeZone = opts.timeZone;
    const locale = opts.locale;
    const hour12 = opts.hour12;
    const daysLater = typeof opts.daysLater === "function" ? opts.daysLater : (n) => `${n}天`;
    const cycle = hour12 === true ? "h12" : hour12 === false ? "h23" : undefined;
    const hasDayPeriod = (loc) =>
      new Intl.DateTimeFormat(loc, { timeZone: "UTC", hourCycle: cycle, hour: "numeric" })
        .formatToParts(new Date(Date.UTC(2026, 0, 15, 13)))
        .some((p) => p.type === "dayPeriod");
    const timeLocale = cycle === "h12" || (cycle === undefined && hasDayPeriod(locale)) ? "en-US" : locale;
    const twelve = hasDayPeriod(timeLocale);
    const timeFmt = new Intl.DateTimeFormat(timeLocale, {
      timeZone,
      hourCycle: cycle,
      hour: twelve ? "numeric" : "2-digit",
      minute: "2-digit",
    });
    const hmFmt = new Intl.DateTimeFormat(timeLocale, {
      timeZone: "UTC",
      hourCycle: cycle,
      hour: twelve ? "numeric" : "2-digit",
      minute: "2-digit",
    });
    const is24h = !twelve;
    const hm = (min) =>
      min >= 24 * 60 && is24h
        ? "24:00"
        : hmFmt.format(new Date(Date.UTC(2026, 0, 15, Math.floor(min / 60), min % 60)));

    const peakWeekdays = new Set(rules.peak.weekdays);
    const windows = rules.peak.windows.map((w) => [toMin(w[0]), toMin(w[1])]);
    const holidayCfg = rules.holidays || {};
    const bjOffsetMin = holidayCfg.utcOffsetMinutes == null ? 480 : holidayCfg.utcOffsetMinutes;
    const years = holidayCfg.years || [];
    const docs = holidayDocs || {};

    const holidays = new Map();
    for (const key of Object.keys(docs)) {
      const doc = docs[key];
      if (!doc || !Array.isArray(doc.days)) continue;
      for (const day of doc.days) if (day.isOffDay && day.date) holidays.set(day.date, day.name || "");
    }
    const missingYears = years.filter((y) => {
      const doc = docs[y];
      return !(doc && Array.isArray(doc.days) && doc.days.length);
    });

    let partsFmt = null;
    function partsOf(ts) {
      partsFmt =
        partsFmt ||
        new Intl.DateTimeFormat(locale, {
          timeZone,
          hourCycle: "h23",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
      const out = {};
      for (const p of partsFmt.formatToParts(new Date(ts))) out[p.type] = p.value;
      return { y: +out.year, mo: +out.month, d: +out.day, h: +out.hour, mi: +out.minute };
    }
    const dateKey = (p) => `${p.y}-${two(p.mo)}-${two(p.d)}`;
    const minuteOfDay = (ts) => {
      const p = partsOf(ts);
      return p.h * 60 + p.mi;
    };

    function instantOf(y, mo, d, h, mi) {
      const want = Date.UTC(y, mo - 1, d, h, mi);
      let guess = want;
      for (let i = 0; i < 2; i++) {
        const p = partsOf(guess);
        guess += want - Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi);
      }
      return guess;
    }

    const beijingKey = (ts) => new Date(ts + bjOffsetMin * MIN_MS).toISOString().slice(0, 10);

    function isPeakAt(ts) {
      const dt = new Date(ts);
      if (!peakWeekdays.has(dt.getUTCDay())) return false;
      if (holidays.has(beijingKey(ts))) return false;
      const min = dt.getUTCHours() * 60 + dt.getUTCMinutes();
      return windows.some(([a, b]) => min >= a && min < b);
    }
    const stateAt = (ts) => (isPeakAt(ts) ? "peak" : "offpeak");

    function nextSwitchAt(ts) {
      const now = isPeakAt(ts);
      const day0 = Math.floor(ts / DAY_MS) * DAY_MS;
      for (let i = 0; i < MAX_SCAN_DAYS; i++) {
        for (const h of BOUNDARY_HOURS) {
          const at = day0 + i * DAY_MS + h * 60 * MIN_MS;
          if (at > ts && isPeakAt(at) !== now) return at;
        }
      }
      return null;
    }

    let weekdayFmt = null;
    function weekdayShort(ts) {
      weekdayFmt = weekdayFmt || new Intl.DateTimeFormat(locale, { timeZone, weekday: "short" });
      return weekdayFmt.format(new Date(ts));
    }
    function timeLabel(ts) {
      if (ts == null) return "—";
      return timeFmt.format(new Date(ts));
    }
    function switchLabel(ts, nowTs) {
      if (ts == null) return "—";
      const ms = ts - nowTs;
      if (ms < DAY_MS) return timeLabel(ts);
      return daysLater(Math.ceil(ms / DAY_MS));
    }

    function peakRangesOfLocalDay(startTs) {
      const p = partsOf(startTs);
      const endTs = instantOf(p.y, p.mo, p.d + 1, 0, 0);
      const ranges = [];
      let open = null;
      for (let t = startTs; t < endTs; t += SAMPLE_MS) {
        if (isPeakAt(t)) {
          if (open === null) open = t;
        } else if (open !== null) {
          ranges.push([open, t]);
          open = null;
        }
      }
      if (open !== null) ranges.push([open, endTs]);
      return ranges.map(([a, b]) => [minuteOfDay(a), b >= endTs ? 24 * 60 : minuteOfDay(b)]);
    }

    function weekRows(nowTs) {
      const p = partsOf(nowTs);
      const today = dateKey(p);
      const wd = new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay();
      const back = (wd + 6) % 7;
      const rows = [];
      for (let i = 0; i < 7; i++) {
        const start = instantOf(p.y, p.mo, p.d - back + i, 0, 0);
        const key = dateKey(partsOf(start));
        rows.push({
          key,
          weekday: weekdayShort(start),
          isToday: key === today,
          holidayName: holidays.get(beijingKey(start + 12 * 60 * MIN_MS)) || null,
          ranges: peakRangesOfLocalDay(start).map(([a, b]) => `${hm(a)}–${hm(b)}`),
        });
      }
      return rows;
    }

    return {
      isPeakAt,
      stateAt,
      nextSwitchAt,
      timeLabel,
      switchLabel,
      weekdayShort,
      weekRows,
      missingYears,
      ruleUpdated: rules.ruleUpdated || "",
      sourceUrl: rules.source || "",
    };
  }

  root.DsPrice = { create };
})(typeof window !== "undefined" ? window : globalThis);
