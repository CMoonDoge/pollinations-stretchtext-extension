// StretchText — content script. Operates only after the reader opts in.
// A paragraph arrives as a one-sentence gist; [+] grows it in place, [−] shrinks it back.

(() => {
  if (window.__stretchtextLoaded) return;
  window.__stretchtextLoaded = true;

  const BLOCK_SELECTOR = "p, li, blockquote, dd, article > div";
  const SKIP_CLOSEST = "nav, header, footer, aside, form, code, pre, figure, .pg-ui, [contenteditable], [role='navigation']";
  const state = new WeakMap();      // element -> { original, gist, expansion, level, nodes }
  const tracked = new Set();        // transformed elements, for stats + restore
  let engaged = false;
  let observer = null;
  let mutationObserver = null;
  let minWords = 25;
  let model = "";

  // ---- message bridge to the service worker ---------------------------------
  const call = (type, payload = {}) =>
    new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type, ...payload }, (res) => {
          if (chrome.runtime.lastError) return resolve({ ok: false, error: chrome.runtime.lastError.message });
          resolve(res || { ok: false, error: "no response" });
        });
      } catch (e) {
        resolve({ ok: false, error: String(e) });
      }
    });

  // ---- text helpers ---------------------------------------------------------
  const normalize = (s) => s.replace(/\s+/g, " ").trim();
  const wordCount = (s) => normalize(s).split(" ").filter(Boolean).length;

  function isCandidate(el) {
    if (state.has(el) || el.dataset.pgSeen) return false;
    if (el.closest(SKIP_CLOSEST)) return false;
    if (el.closest(".pg-ui")) return false;
    const text = normalize(el.textContent || "");
    if (wordCount(text) < minWords) return false;
    if (el.querySelector(BLOCK_SELECTOR) && wordCount(el.querySelector("p")?.textContent || "") > 0) return false;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    return true;
  }

  // ---- rendering ------------------------------------------------------------
  const MAX_LEVEL = 2;

  function currentText(entry) {
    if (entry.level === 0) return entry.gist;
    if (entry.level === 1) return entry.original;
    return entry.expansion || entry.original;
  }

  function render(el) {
    const entry = state.get(el);
    if (!entry) return;
    const text = currentText(entry);
    el.dataset.pgLevel = String(entry.level);
    el.classList.toggle("pg-collapsed", entry.level === 0);
    el.classList.toggle("pg-expanded", entry.level > 0);

    // Keep in-flow: replace children with a text span + inline controls.
    el.textContent = "";
    const span = document.createElement("span");
    span.className = "pg-text";
    span.textContent = text;
    el.appendChild(span);

    const controls = document.createElement("span");
    controls.className = "pg-ui pg-controls";

    const levelPill = document.createElement("span");
    levelPill.className = "pg-level";
    levelPill.title = "Stretch depth";
    levelPill.textContent = entry.level === 0 ? "gist" : `${entry.level}/${MAX_LEVEL}`;
    controls.appendChild(levelPill);

    const minus = document.createElement("button");
    minus.className = "pg-btn pg-minus";
    minus.type = "button";
    minus.title = "Shrink";
    minus.textContent = "−";
    minus.disabled = entry.level === 0;
    minus.addEventListener("click", (e) => { e.stopPropagation(); onChange(el, -1); });

    const plus = document.createElement("button");
    plus.className = "pg-btn pg-plus";
    plus.type = "button";
    plus.title = "Grow";
    plus.textContent = "+";
    plus.disabled = entry.level >= MAX_LEVEL;
    plus.addEventListener("click", (e) => { e.stopPropagation(); onChange(el, +1); });

    controls.append(minus, plus);
    el.appendChild(controls);
    updateHud();
  }

  async function onChange(el, delta) {
    const entry = state.get(el);
    if (!entry) return;
    const target = Math.min(MAX_LEVEL, Math.max(0, entry.level + delta));
    if (target === entry.level) return;

    if (target === 2 && !entry.expansion) {
      el.classList.add("pg-loading");
      const res = await call("expand", { text: entry.original, model });
      el.classList.remove("pg-loading");
      if (res.ok) entry.expansion = res.data.text;
      else { notifyError(res); return; }
    }
    entry.level = target;
    render(el);
  }

  // ---- transform a candidate into a gist ------------------------------------
  const queue = [];
  let active = 0;
  const MAX_CONCURRENT = 3;

  function enqueue(el) {
    if (el.dataset.pgSeen) return;
    el.dataset.pgSeen = "1";
    queue.push(el);
    pump();
  }

  function pump() {
    while (active < MAX_CONCURRENT && queue.length) {
      const el = queue.shift();
      active++;
      transform(el).finally(() => { active--; pump(); });
    }
  }

  async function transform(el) {
    const original = normalize(el.textContent || "");
    if (wordCount(original) < minWords) return;
    const originalHTML = el.innerHTML;
    const entry = { original, originalHTML, gist: original, expansion: null, level: 0 };
    state.set(el, entry);
    let res;
    try {
      res = await call("summarize", { text: original, model });
    } catch (e) {
      res = { ok: false, error: String(e) };
    }
    if (!res.ok) {
      notifyError(res);
      state.delete(el);
      el.dataset.pgSeen = "";
      return;
    }
    entry.gist = res.data.text || original;
    tracked.add(el);
    el.classList.add("pg-stretched");
    render(el);
  }

  // ---- HUD / control bubble -------------------------------------------------
  let bubble, hud, toast;
  function mountUi() {
    if (bubble) return;
    bubble = document.createElement("button");
    bubble.className = "pg-ui pg-bubble";
    bubble.type = "button";
    bubble.title = "StretchText (Alt+S)";
    bubble.innerHTML = '<span class="pg-logo">≡</span><span class="pg-hud"></span>';
    hud = bubble.querySelector(".pg-hud");
    bubble.addEventListener("click", () => engaged ? disengage() : engage());
    document.documentElement.appendChild(bubble);

    toast = document.createElement("div");
    toast.className = "pg-ui pg-toast";
    document.documentElement.appendChild(toast);
  }

  function updateHud() {
    if (!bubble) return;
    bubble.classList.toggle("pg-on", engaged);
    if (!engaged) { hud.textContent = ""; return; }
    let total = 0, shown = 0;
    for (const el of tracked) {
      const e = state.get(el); if (!e) continue;
      total += wordCount(e.original);
      shown += wordCount(currentText(e));
    }
    const pct = total ? Math.round((shown / total) * 100) : 0;
    hud.textContent = `${tracked.size} ¶ · ${pct}%`;
  }

  function notifyError(res) {
    const map = {
      NOT_CONNECTED: "Connect your Pollen in the extension options first.",
      KEY_INVALID: "Your key was rejected. Reconnect Pollen.",
      NO_POLLEN: "Out of Quest/Paid Pollen for this request.",
      ERROR: res.error,
    };
    showToast(map[res.code] || res.error || "Request failed");
  }

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("pg-show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("pg-show"), 4200);
  }

  // ---- engage / disengage ---------------------------------------------------
  function collectRoots() {
    const scope = document.querySelector("article, main, [role='main']") || document.body;
    return scope ? [scope] : [];
  }

  async function engage() {
    mountUi();
    const cfg = await call("getConfig");
    if (cfg.ok) { minWords = cfg.data.minWords ?? minWords; model = cfg.data.model || ""; }

    const st = await call("status");
    if (!st.ok || !st.data.connected) {
      showToast("Connect your Pollen (options) to use StretchText.");
      chrome.runtime.sendMessage({ type: "openOptions" }).catch?.(() => {});
      return;
    }

    engaged = true;
    observer = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting && isCandidate(e.target)) enqueue(e.target);
    }, { rootMargin: "200px" });

    const roots = collectRoots();
    for (const root of roots) {
      root.querySelectorAll(BLOCK_SELECTOR).forEach((el) => { if (isCandidate(el)) observer.observe(el); });
    }

    mutationObserver = new MutationObserver((muts) => {
      for (const m of muts) for (const node of m.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches?.(BLOCK_SELECTOR) && isCandidate(node)) observer.observe(node);
        node.querySelectorAll?.(BLOCK_SELECTOR).forEach((el) => { if (isCandidate(el)) observer.observe(el); });
      }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    updateHud();
    showToast("StretchText on — paragraphs will arrive short.");
  }

  function disengage() {
    engaged = false;
    observer?.disconnect();
    mutationObserver?.disconnect();
    for (const el of tracked) {
      const entry = state.get(el);
      if (entry) { el.innerHTML = entry.originalHTML; el.classList.remove("pg-stretched", "pg-collapsed", "pg-expanded"); delete el.dataset.pgSeen; delete el.dataset.pgLevel; }
    }
    tracked.clear();
    updateHud();
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "toggle") engaged ? disengage() : engage();
  });

  // Keep a small control bubble visible so there is always an opt-in entry
  // point. Nothing is sent anywhere until the reader engages it.
  mountUi();
})();