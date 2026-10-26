# Privacy Policy — StretchText for the Web

_Last updated: 2026-10-26_

StretchText is a browser extension that condenses web-page paragraphs into short
gists and lets you expand them in place.

## What it collects

**None.** There is no analytics, no telemetry, and no server operated by this
extension.

## What it sends, and to whom

When you opt in (the `≡` bubble, the toolbar popup, or `Alt+S`) the extension
sends the **visible text of paragraphs you scroll to** to the Pollinations API
(`https://gen.pollinations.ai`) to generate a summary or expansion. Those
requests are authenticated with **your own** Pollinations key.

- The Pollinations API is operated by Pollinations, not by this extension.
  See <https://pollinations.ai/privacy>.
- No other host is contacted.

## What it stores

- Your Pollinations key, in `chrome.storage.session` (cleared when the browser
  closes), or in `chrome.storage.local` only if you enable **Remember my Pollen
  key**.
- Your settings (model, gist length, etc.) in `chrome.storage.local`.

Page text is **never** stored; it is sent for the single request that produces
your summary and then discarded.

## Permissions

| Permission | Why |
|---|---|
| `storage` | Save your settings and (optionally) your key. |
| `activeTab` | Let the popup/shortcut toggle stretching on the tab you are on. |
| `host_permissions` for `gen.pollinations.ai` and `enter.pollinations.ai` | Call the Pollinations API and the BYOP device-flow sign-in. |
| Content script on `<all_urls>` | The whole point: stretch *any* page. It does nothing until you opt in. |

## Control and removal

You can revoke your key at any time from
<https://enter.pollinations.ai/keys>. Disconnecting in Settings deletes the key
from the extension. Uninstalling the extension removes all stored data.

## Contact

Open an issue on the repository, or reach the Pollinations community on Discord.