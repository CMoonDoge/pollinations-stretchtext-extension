# Submitting this extension for POLLEN-QUEST #17998

Two steps remain — both need **your** GitHub account and a store listing.

## 1. Publish the repository (public)

```bash
cd pollinations-stretchtext-extension
git init && git add -A
git commit -m "StretchText for the Web — browser extension (quest #17998)"
gh repo create pollinations-stretchtext-extension --public --source=. --push
# or create it on github.com and: git remote add origin <url> && git push -u origin main
```

Confirm `README.md` shows the **Made with pollinations.ai** badge.

## 2. Publish a store listing / install page

The quest asks for a "store listing or install page" as the App URL. Any of:

- **Chrome Web Store** (Developer account, one-time $5): zip `src/`, upload,
  fill listing, publish. Use its URL.
- **Firefox Add-ons (AMO)** — free.
- **GitHub Releases**: attach a `.zip` of `src/` and use the release URL.

The listing description should include the badge/link to pollinations.ai
(see README).

## 3. Submit the app

Open the form:
<https://github.com/pollinations/pollinations/issues/new?template=app-submission.yml>

Fill it exactly like this (swap the URLs for yours):

| Field | Value |
|---|---|
| **App Name** | StretchText for the Web |
| **App Description** | Turns any web page into stretchtext: each paragraph arrives as a one-sentence gist with an inline `[+]`; a click grows it in place. Uses the Pollinations text API, with readers paying via Bring-your-own-Pollen. |
| **App URL** | your store listing / install page URL |
| **GitHub Repository URL** | `https://github.com/<you>/pollinations-stretchtext-extension` |
| **Screenshot** | a real 16:9 screenshot of the extension stretching a page (`.png/.jpg/.webp`) — required |
| **App Category** | `writing` |
| **Platform** | `browser-ext` |
| **App Language** | `en` |
| **Quest** | `#17998` |

When a maintainer approves, the app joins the catalog, **quest #17998 closes**,
and you claim the **10 Pollen** at <https://enter.pollinations.ai/quests>.

## Screenshot

Take a real screenshot (the form requires it):

1. Load `src/` unpacked, connect Pollen.
2. Open a long article, press `Alt+S`.
3. Capture the page with several paragraphs collapsed and one expanded
   (`12 ¶ · 19%` visible in the bubble).
4. Save at ~16:9 (e.g. 1600×900) as PNG.

## Reviewer notes

- No build step; `src/` is the packed extension. Load unpacked to test.
- All network calls go to `gen.pollinations.ai` / `enter.pollinations.ai` only.
- The API key is stored in `chrome.storage.session` by default (see PRIVACY.md).