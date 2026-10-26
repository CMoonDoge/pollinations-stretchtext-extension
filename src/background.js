// StretchText — MV3 service worker. Owns config + the BYOP key, and proxies
// all Pollinations calls so the user's key never enters a page context.

import {
  chat, GIST_SYSTEM, EXPAND_SYSTEM, pollDeviceToken, requestDeviceCode, userinfo,
} from "./lib/api.js";

const DEFAULT_CONFIG = {
  model: "openai/gpt-5.4-nano",
  appKey: "",            // your publishable App Key (pk_...) — attribution on the consent screen
  targetFraction: 0.22,  // collapsed gist size as a fraction of the original word count
  minWords: 25,          // skip paragraphs shorter than this
  persistKey: false,     // keep the key in local storage instead of session
};

async function getConfig() {
  const { config } = await chrome.storage.local.get("config");
  return { ...DEFAULT_CONFIG, ...(config || {}) };
}

async function getKey() {
  const cfg = await getConfig();
  const area = cfg.persistKey ? chrome.storage.local : chrome.storage.session;
  const { apiKey } = await area.get("apiKey");
  return apiKey || null;
}

async function setKey(key) {
  const cfg = await getConfig();
  const area = cfg.persistKey ? chrome.storage.local : chrome.storage.session;
  await area.set({ apiKey: key });
  // Never leave a copy in the other store.
  const other = cfg.persistKey ? chrome.storage.session : chrome.storage.local;
  await other.remove("apiKey");
}

async function clearKey() {
  await chrome.storage.session.remove("apiKey");
  await chrome.storage.local.remove("apiKey");
}

async function status() {
  const [key, config] = await Promise.all([getKey(), getConfig()]);
  if (!key) return { connected: false, config };
  const user = await userinfo(key).catch(() => null);
  return { connected: Boolean(user), user, config };
}

function words(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function summarize({ text, model }) {
  const key = await getKey();
  if (!key) throw Object.assign(new Error("Not connected"), { code: "NOT_CONNECTED" });
  const cfg = await getConfig();
  const target = Math.max(6, Math.round(words(text) * cfg.targetFraction));
  const out = await chat(key, model || cfg.model, [
    { role: "system", content: GIST_SYSTEM(target) },
    { role: "user", content: text },
  ]);
  return { text: out };
}

async function expand({ text, model }) {
  const key = await getKey();
  if (!key) throw Object.assign(new Error("Not connected"), { code: "NOT_CONNECTED" });
  const cfg = await getConfig();
  const out = await chat(key, model || cfg.model, [
    { role: "system", content: EXPAND_SYSTEM },
    { role: "user", content: text },
  ]);
  return { text: out };
}

const HANDLERS = {
  status,
  "device:start": async ({ clientId }) => requestDeviceCode(clientId),
  "device:poll": async ({ deviceCode }) => {
    const r = await pollDeviceToken(deviceCode);
    if (!r.pending) await setKey(r.accessToken);
    return r;
  },
  disconnect: async () => { await clearKey(); return { ok: true }; },
  openOptions: async () => { chrome.runtime.openOptionsPage(); return { ok: true }; },
  summarize,
  expand,
  getConfig,
  setConfig: async ({ config }) => {
    const merged = { ...(await getConfig()), ...config };
    await chrome.storage.local.set({ config: merged });
    return merged;
  },
};

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const handler = HANDLERS[msg?.type];
  if (!handler) return false;
  Promise.resolve(handler(msg))
    .then((data) => sendResponse({ ok: true, data }))
    .catch((err) => sendResponse({
      ok: false,
      code: err?.code || "ERROR",
      error: err?.message || String(err),
    }));
  return true; // async
});

// Keyboard shortcut → toggle the active tab's content script.
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-stretch") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "toggle" }).catch(() => {});
});