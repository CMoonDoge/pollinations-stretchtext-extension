// Pollinations API helpers: BYOP device flow + text completion.
// Docs: https://github.com/pollinations/pollinations/blob/main/BRING_YOUR_OWN_POLLEN.md
//       https://gen.pollinations.ai/docs

export const ENTER_BASE = "https://enter.pollinations.ai";
export const GEN_BASE = "https://gen.pollinations.ai";

/** Request a device code. `clientId` is your publishable App Key (pk_...). */
export async function requestDeviceCode(clientId) {
  const res = await fetch(`${ENTER_BASE}/api/device/code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(clientId ? { client_id: clientId } : {}),
  });
  if (!res.ok) throw new Error(`device/code failed (${res.status})`);
  return res.json();
}

/** Poll once for the minted key. Returns { pending: true } or { accessToken, ... }. */
export async function pollDeviceToken(deviceCode) {
  const res = await fetch(`${ENTER_BASE}/api/device/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_code: deviceCode }),
  });
  const data = await res.json().catch(() => ({}));
  if (data.access_token) return { pending: false, accessToken: data.access_token, expiresIn: data.expires_in };
  if (data.error === "authorization_pending") return { pending: true };
  throw new Error(data.error_description || data.error || `device/token failed (${res.status})`);
}

/** Who's using this key (OIDC userinfo). */
export async function userinfo(apiKey) {
  const res = await fetch(`${ENTER_BASE}/api/device/userinfo`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return null;
  return res.json();
}

/**
 * One-shot chat completion. Returns the assistant text.
 * Throws an Error with a `.code` for auth/balance problems so callers can react.
 */
export async function chat(apiKey, model, messages, { maxTokens = 400, temperature = 0.2, json = false } = {}) {
  const res = await fetch(`${GEN_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json())?.error?.message || ""; } catch { /* ignore */ }
    const err = new Error(detail || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = res.status === 401 ? "KEY_INVALID" : res.status === 402 ? "NO_POLLEN" : "API_ERROR";
    throw err;
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() ?? "";
}

export const GIST_SYSTEM = (targetWords) =>
  "You are a stretchtext engine. Condense the user's web-page paragraph into ONE tight sentence " +
  "that keeps the main claim and any concrete figures. " +
  `Aim for about ${targetWords} words. Preserve the original language. ` +
  "Output only the sentence: no preamble, no quotes, no markdown.";

export const EXPAND_SYSTEM =
  "You are a stretchtext engine. Expand the user's text into a fuller paragraph of 2-3 sentences. " +
  "Add concrete, plausible detail and context, but never invent verifiable facts, numbers, or quotes. " +
  "Preserve the original language. Output only the paragraph.";