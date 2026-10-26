const $ = (id) => document.getElementById(id);
const send = (type, payload = {}) =>
  new Promise((resolve) => chrome.runtime.sendMessage({ type, ...payload }, (r) => resolve(r || { ok: false })));

let pollTimer = null;

async function refreshStatus() {
  const res = await send("status");
  const st = res.ok ? res.data : { connected: false };
  $("dot").classList.toggle("on", !!st.connected);
  $("who").textContent = st.connected
    ? `Connected${st.user?.preferred_username ? " as @" + st.user.preferred_username : ""}`
    : "Not connected";
  $("connect").style.display = st.connected ? "none" : "";
  $("disconnect").style.display = st.connected ? "" : "none";
  if (st.config) fillConfig(st.config);
}

function fillConfig(c) {
  $("model").value = c.model || "";
  $("appKey").value = c.appKey || "";
  $("fraction").value = c.targetFraction ?? 0.22;
  $("fractionVal").textContent = `${Math.round(($("fraction").value) * 100)}%`;
  $("minWords").value = c.minWords ?? 25;
  $("persistKey").checked = !!c.persistKey;
}

async function startConnect() {
  const cfg = await send("getConfig");
  const clientId = cfg.ok ? cfg.data.appKey : "";
  const res = await send("device:start", { clientId });
  if (!res.ok) { alert("Could not start sign-in: " + res.error); return; }

  const { user_code, verification_uri_complete, device_code, interval } = res.data;
  $("userCode").textContent = user_code;
  $("deviceHint").textContent = "Waiting for approval…";
  $("deviceBox").classList.add("show");
  $("verifyLink").href = verification_uri_complete || "https://enter.pollinations.ai/device";
  chrome.tabs.create({ url: verification_uri_complete });

  clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    const p = await send("device:poll", { deviceCode: device_code });
    if (!p.ok) { $("deviceHint").textContent = "Error: " + p.error; clearInterval(pollTimer); return; }
    if (p.data.pending) return;
    clearInterval(pollTimer);
    $("deviceHint").textContent = "Approved ✓";
    setTimeout(() => { $("deviceBox").classList.remove("show"); refreshStatus(); }, 700);
  }, Math.max(3, interval || 5) * 1000);
}

$("connect").addEventListener("click", startConnect);
$("disconnect").addEventListener("click", async () => { await send("disconnect"); refreshStatus(); });

$("fraction").addEventListener("input", () => {
  $("fractionVal").textContent = `${Math.round($("fraction").value * 100)}%`;
});

$("save").addEventListener("click", async () => {
  const config = {
    model: $("model").value.trim() || "openai/gpt-5.4-nano",
    appKey: $("appKey").value.trim(),
    targetFraction: parseFloat($("fraction").value),
    minWords: parseInt($("minWords").value, 10) || 25,
    persistKey: $("persistKey").checked,
  };
  await send("setConfig", { config });
  // If persistence changed, move the key to the right store.
  const st = await send("status");
  $("saved").classList.add("show");
  setTimeout(() => $("saved").classList.remove("show"), 1200);
  if (!st.ok || !st.data.connected) { /* fine, may not be connected yet */ }
});

refreshStatus();