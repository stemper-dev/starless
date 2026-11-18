# GTA VI Spoiler Shield

A tiny Chrome Manifest V3 extension that **hides GTA 6 content locally** on Twitch, YouTube, LinkedIn, and X/Twitter. Nothing is deleted from any account; no platform buttons are clicked.

**No build step, backend, API keys, settings screen, or runtime dependencies.** The extension does not make network requests or store/send browsing data. Playwright is a development-only dependency.

## Install in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this repository's **`extension/`** folder (not the repository root).
5. Refresh any Twitch, YouTube, LinkedIn, or X tabs already open.

It is always on for the supported sites. To turn it off, disable it in `chrome://extensions` and refresh those tabs. After editing files, click the extension's **Reload** button and refresh the website.

Keep extension signing keys outside the repository. Never commit or share a private key; generated `.pem` and `.crx` files are ignored as a safeguard.

## What gets hidden?

| Site | Detection |
| --- | --- |
| Twitch | Stream cards with a matching game/category link, category slug, tag, or title; matching game directory cards and expanded sidebar entries. |
| YouTube | Matching video/Shorts/playlist titles in feeds, search and recommendations, including old and newer layouts. Also checks rendered rich game metadata. A matching title or rendered game card on a watch page hides that watch page and pauses its media. |
| LinkedIn | Matching structured text fields in recognized post containers, including reposts and previews. Supports legacy cards and newer SDUI update cards. |
| X / Twitter | Matching tweet text, quoted-post text, display name/handle text, or rendered link-preview text inside tweet articles. |

New cards and later text/title/category changes are checked automatically. Hidden cards stay mounted so the website's framework can reuse them; if reused for unrelated content, they become visible again. Hidden media is paused, including later playback attempts.

### Name variations

The shared matcher handles case, hashtags, spaces/punctuation, full names, Roman numerals, Unicode compatibility characters, accents, and invisible formatting characters. Examples:

- GTA 6, gta6, #GTA6, GTA-6, G.T.A. 6, G T A 6
- GTA VI, GTAVI, GTA: VI, GTA six
- Grand Theft Auto **with or without a sequel number**, GrandTheftAuto, grand-theft-auto, #GrandTheftAutoVI
- This intentionally also hides full-name mentions of older games, such as Grand Theft Auto V and Grand Theft Auto San Andreas.
- ＧＴＡ ６, GTA Ⅵ, GTA followed by a zero-width space and 6

Abbreviations alone deliberately do **not** block GTA V, GTA IV, GTA Online, GTA 60, GTA VII, “GTA video”, or generic names such as Rockstar, Jason, Lucia and Vice City. It does not use fuzzy matching: arbitrary misspellings, cross-alphabet lookalikes, translated names, and embedded strings like `myGTA6name` are not guaranteed matches. This avoids hiding lots of unrelated content.

To add broader hardcoded phrases, edit `EXTRA_BLOCKED_PHRASES` in [extension/matcher.js](extension/matcher.js), then reload the extension and website. An extra phrase uses normalized substring matching, intentionally broader than the main game-name pattern.

## Honest limitations

- **YouTube's selected game is usually absent from recommendation/search cards.** A neutral title cannot be filtered by a game that the page has not exposed. Game detection works only where the relevant rich metadata is rendered; metadata loaded only after expanding the description is detected only then. We do not fetch every video's watch page or call undocumented APIs.
- Text/metadata filtering is **not** image recognition, OCR, transcript or audio analysis. A thumbnail-only spoiler or unlabeled video can get through.
- A short flash or audio fragment before detection is possible. This is not a network/content-download blocker or a guarantee of zero spoilers.
- Direct Twitch channel players and the active YouTube Shorts player are not blocked. Listing cards are the main target; YouTube watch pages are additionally supported.
- Collapsed Twitch sidebar entries may not expose their game. Unsupported platform layouts, mobile YouTube, embeds, and other unlisted hosts are not covered.
- LinkedIn scans structured text within recognized posts, so a matching comment already inside that post container can also hide it. Off-DOM or truncated-away text cannot be inspected.
- Platforms A/B-test and change markup. Selectors are best-effort, not stable public APIs. If a layout changes, update [extension/sites.js](extension/sites.js) and add a regression test.

## Repository layout

```text
extension/                Load this folder directly in Chrome
  manifest.json           MV3, specific supported hosts only
  matcher.js              Shared hardcoded detection / normalization
  sites.js                Small platform-specific card + signal adapters
  content.js              Shared incremental observer / hide / restore / pause
  hide.css                One hiding rule
scripts/live-smoke.js      Optional real-site smoke check
tests/matcher.test.js     Pure Node matcher tests
tests/e2e/                Real unpacked-extension Chromium tests
docs/research.md          Sources, tradeoffs, test strategy, verification scope
.github/workflows/test.yml Repeatable offline CI
```

The manifest loads the three scripts in order into Chrome's default **isolated world**. A single namespace shares code between them. No bundler, UI framework, background worker, storage permission, tabs permission, broad all-sites permission, or web-accessible resources are needed.

## Test

Use Node.js 22+:

```sh
npm ci
npx playwright install chromium
npm run test:all
```

- `npm test`: 70 matcher cases, including false-positive boundaries.
- `npm run test:e2e`: 24 tests loading the **actual extension** in a disposable persistent Chromium profile. Navigation requests to real matching hostnames are fulfilled with local fixture HTML; no live platform or login is required. Scripts are **not** manually injected.
- `HEADED=1 npm run test:e2e`: watch the fixture tests in Chromium.
- `npm run test:live`: optional public YouTube/Twitch smoke test, with the actual extension loaded. Writes a JSON report and screenshots to `test-results/`. Exit 0 = passed, 1 = detected a visible matching card, 2 = inconclusive (network/consent/layout/no matching cards). Live results vary and are deliberately excluded from CI.

Latest local verification: **70/70 matcher tests, 24/24 extension tests passed**. Earlier public-site smoke checks counted markers rather than independently verifying rendered visibility, so they do not establish that sampled cards were hidden. A current public smoke check independently found 37/37 sampled YouTube matches and 25/25 sampled Twitch matches not rendered; this is a limited snapshot. LinkedIn and X redirected to logged-out/login pages; their authenticated feeds were **not live-verified**.

Tests cover dynamic insertion, text-node mutation, attribute-only changes, late hydration, SPA navigation, recycled-card restoration, quoted/reposted content, a 500-card burst, actual media pausing, isolated-world execution, and no injection on unrelated hosts. Failure traces/screenshots are retained automatically.

For manual acceptance: scroll logged-in home/search/following feeds on each platform, verify neutral content still appears, switch routes without refreshing, and check the Console. Do not export cookies or commit personal feed captures. Chrome's DevTools Elements panel shows `data-gta6-shield-hidden` on hidden cards.
