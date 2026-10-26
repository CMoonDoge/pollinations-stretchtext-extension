# StretchText for the Web

[![Made with pollinations.ai](https://raw.githubusercontent.com/pollinations/pollinations/main/packages/ui/src/brand/badge-made-with.svg)](https://pollinations.ai/?ref=badge)

A browser extension that turns **any web page into stretchtext**.

In 1967 Ted Nelson imagined text that *grows where the reader wants more and shrinks
back where they don't*. Writing every level by hand was too much work, so it never
caught on — until generated text made it cheap. This extension condenses each
paragraph of a page into a one-sentence **gist** with an inline `[+]` handle.
Click to **grow** it back in place; click `[−]` to shrink it again.

Readers pay with **their own Pollen** via [Bring your own Pollen][byop] — the
extension never pays for their reading, and they can revoke access any time.

Built for **POLLEN-QUEST [#17998](https://github.com/pollinations/pollinations/issues/17998)**.

## How it works

1. The reader opts in (the small `≡` bubble, the toolbar popup, or `Alt+S`).
2. Every paragraph in the article/main region is condensed on the fly with a
   Pollinations text model into one tight sentence, and an inline `[−] [+]`
   control is attached.
3. `+` grows the paragraph in place — first back to the **original** text, then
   to a **generated expansion** with more detail. `−` shrinks it back toward the
   gist. No modals, no overlays: the text simply grows where it stands.
4. The bubble shows live stats (`12 ¶ · 19%`): paragraphs stretched and how much
   of the page's words you're actually reading.

Transformation is lazy: paragraphs are only sent to the model when they scroll
into view, so you only pay for what you read.

## Install (developer mode)

1. Download or clone this repository.
2. Open `chrome://extensions` (Chrome, Brave, or Edge), enable **Developer mode**.
3. Click **Load unpacked** and select the `src/` folder.
4. Pin the extension, then open its **Settings & Pollen connection**.

## Connect your Pollen (BYOP)

1. In Settings, click **Connect Pollen** (optional: paste your App Key `pk_…` first
   for attribution and developer earnings).
2. A tab opens at `enter.pollinations.ai/device`. Sign in with GitHub and approve
   a budget and expiry. This mints a scoped `sk_…` key for *your* account only.
3. Return — the popup now says *Connected*.

The key lives in `chrome.storage.session` by default and is gone when the browser
closes. Turn on **Remember my Pollen key** to keep it in `chrome.storage.local`.
Revoke access any time from [enter.pollinations.ai/keys](https://enter.pollinations.ai/keys).

## Settings

| Setting | Purpose |
|---|---|
| **Text model** | Any id from [gen.pollinations.ai/text/models](https://gen.pollinations.ai/text/models). Cheaper models stretch for less Pollen. |
| **App Key (`pk_…`)** | Optional. Shows your app name/author on the consent screen; enables developer earnings. |
| **Gist length** | Collapsed size as a fraction of the paragraph (default 22%). Lower = more aggressive stretchtext. |
| **Min words** | Skip short paragraphs. |
| **Remember key** | Persist the key across restarts. |

## Privacy

StretchText sends **only the paragraph text you are reading** to the Pollinations
API, using **your own** key, and stores that key locally in your browser. There is
no analytics, no telemetry, no third-party server. See [PRIVACY.md](PRIVACY.md).

## Development

No build step. Plain MV3 + ES modules.

```
src/
  manifest.json      MV3 manifest
  background.js      service worker: device-flow auth + API proxy
  content.js         stretchtext engine (opt-in)
  content.css        isolated styles
  popup.html/js      toolbar panel
  options.html/js    settings & Pollen connection
  lib/api.js         Pollinations API helpers
  icons/             generated icons
```

Load `src/` unpacked in `chrome://extensions`.

## License

MIT — see [LICENSE](LICENSE).

[byop]: https://github.com/pollinations/pollinations/blob/main/BRING_YOUR_OWN_POLLEN.md