const $ = (id) => document.getElementById(id);

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

(async () => {
  const res = await chrome.runtime.sendMessage({ type: "status" });
  const st = res?.ok ? res.data : { connected: false };
  $("dot").classList.toggle("on", !!st.connected);
  $("who").textContent = st.connected
    ? `Connected${st.user?.preferred_username ? " · @" + st.user.preferred_username : ""}`
    : "Not connected";
  $("toggle").disabled = !st.connected;
})();

$("toggle").addEventListener("click", async () => {
  const tab = await activeTab();
  if (tab?.id) {
    try { await chrome.tabs.sendMessage(tab.id, { type: "toggle" }); } catch { /* restricted page */ }
  }
  window.close();
});

$("options").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});