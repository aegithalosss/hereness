(function (root) {
  const windowsPath = (s) => /^[a-z]:\//i.test(s) || s.startsWith("//");
  function normalize(path) {
    const s = String(path || "").replace(/\\/g, "/");
    if (!s.startsWith("/") && !/^[a-z]:\//i.test(s)) return "";
    const prefix = s.startsWith("//") ? "//" : s.startsWith("/") ? "/" : s.slice(0, 3);
    const parts = [];
    for (const part of s.slice(prefix.length).split("/")) {
      if (!part || part === ".") continue;
      if (part === "..") parts.pop();
      else parts.push(part);
    }
    const result = prefix + parts.join("/");
    return windowsPath(result) ? result.toLowerCase() : result;
  }
  const basename = (s) => String(s).replace(/\\/g, "/").split("/").filter(Boolean).pop() || s;
  const units = (s) => Array.from(s).reduce((n, ch) => n + (ch.codePointAt(0) <= 0x7f ? 1 : 2), 0);
  function limit(s, max = 16) {
    let out = "", used = 0;
    for (const ch of s) {
      const width = units(ch);
      if (used + width > max) break;
      out += ch; used += width;
    }
    return out;
  }
  function nickname(names, cwd) {
    const path = normalize(cwd);
    if (!path) return "";
    let best = "", value = "";
    for (const [folder, name] of Object.entries(names)) {
      if (!name) continue;
      const key = normalize(folder);
      if (key && (path === key || path.startsWith(key.endsWith("/") ? key : key + "/")) && key.length > best.length) {
        best = key; value = name;
      }
    }
    return best ? value : names[basename(cwd)] || "";
  }
  function bindInput(input) {
    let composing = false;
    const fitInsertion = (e, text) => {
      const start = input.selectionStart, end = input.selectionEnd;
      const remaining = Math.max(0, 16 - units(input.value.slice(0, start) + input.value.slice(end)));
      if (units(text) <= remaining) return;
      e.preventDefault();
      const fitted = limit(text, remaining);
      if (!fitted) return;
      input.setRangeText(fitted, start, end, "end");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };
    input.addEventListener("compositionstart", () => { composing = true; });
    input.addEventListener("compositionend", () => { composing = false; input.value = limit(input.value); });
    input.addEventListener("paste", (e) => {
      if (!composing && e.clipboardData) fitInsertion(e, e.clipboardData.getData("text/plain"));
    });
    input.addEventListener("beforeinput", (e) => {
      if (composing || e.isComposing || !e.inputType.startsWith("insert") || e.data == null) return;
      fitInsertion(e, e.data);
    });
    input.addEventListener("input", () => {
      if (composing) return;
      const pos = input.selectionStart;
      input.value = limit(input.value);
      input.setSelectionRange(Math.min(pos, input.value.length), Math.min(pos, input.value.length));
    });
  }
  root.FolderNames = { normalize, basename, units, limit, nickname, bindInput };
})(typeof window !== "undefined" ? window : globalThis);
