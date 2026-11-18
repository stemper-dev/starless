# Research and design decisions

## Smallest useful architecture

Use a static Manifest V3 content script and CSS, shared pure matcher, platform adapters, and one incremental MutationObserver. Run at `document_start` to start observing before feed hydration. Chrome loads declared scripts in order; the default isolated world keeps our JavaScript separate from platform code while sharing the DOM.

No backend, service worker, UI, bundler, runtime package, API access, account actions, or persisted data is needed. The supported HTTPS hosts are the only injection scope. This keeps setup to Chrome's “Load unpacked” and avoids API credentials and remote-code concerns.

Sources:
- [Chrome: content scripts, isolation, script ordering and timing](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Chrome: match patterns](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns)
- [MDN: MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)

The observer queues only affected cards and newly inserted subtrees, batches work into a 16 ms timer, and checks both text-node and relevant attribute changes. It does not rescan the whole document on every mutation or poll forever. Initial load and navigation lifecycle events perform a full scan. The extension's hidden marker is not observed; guarded inline display writes avoid style-observer feedback loops.

Use a CSS marker and an inline important display override rather than removing nodes: React/virtualized feeds own their DOM and can reuse a previously blocked node for safe content. Every recheck can remove our marker and restore the last observed site inline display value and priority. No feed-level ancestor is hidden by walking arbitrary numbers of parents. Some sites can still retain empty layout slots around a hidden card; preserving framework-owned layout is safer than aggressively deleting wrappers.

## Twitch

**Strategy:** inspect each recognized stream/category/sidebar card for category text and category URL slugs, tags, and stream titles. A neutral stream title should still disappear when the game is Grand Theft Auto VI. Do not use hashed/styled-component class names or call Twitch GraphQL APIs.

Research evidence:
- [Unwanted Twitch README](https://github.com/kwaschny/unwanted-twitch) describes DOM-based game/category/channel/tag filtering and warns of breaking changes and canary layouts.
- [Its card reader source](https://github.com/kwaschny/unwanted-twitch/blob/master/scripts/directory.js) identifies `preview-card-game-link`, `side-nav-game-title`, `.game-card` and `.tw-tag` hooks. Used as structural research, not copied as an implementation.
- [Layout-change issue #132](https://github.com/kwaschny/unwanted-twitch/issues/132) shows that separate directory layouts and rollout variants can break filters. Avoid claiming guaranteed coverage.

Live MCP inspection confirmed category cards with `.game-card`, `tw-box-art-card-link`, `h2` titles and category links. Earlier smoke checks counted markers rather than independently verifying visibility, so their hiding results are not conclusive.

## YouTube

**Strategy:** read video title elements on home/search/recommendation/Shorts cards. Support legacy `#video-title` and newer lockup elements. Read rich game metadata only when it is present. On a watch page, restrict title/game checks to primary metadata, never recommendations, so one GTA recommendation cannot hide an unrelated watched video. Hide the watch container and pause its media when primary title/game matches.

Why not look up every selected game?
- [Official video resource schema](https://developers.google.com/youtube/v3/docs/videos) has `snippet.categoryId`, title, description and tags, but no documented selected-game-title field. A Gaming category is not evidence of GTA VI.
- [YouTube game-title API discussion](https://stackoverflow.com/questions/39280575/youtube-data-api-video-insert-update-setting-game-title) describes the distinction between the general Gaming category and uploader-selected game.
- [Game-title retrieval discussion](https://stackoverflow.com/questions/63578839/how-to-retrieve-game-title-bound-to-video) explains the missing public API field.
- [Description game-card walkthrough](https://vidiq.com/blog/post/how-to-add-video-game-title-youtube-description/) illustrates game artwork/title in description metadata, not universal recommendation metadata.

Fetching every watch page, inspecting private player state, or intercepting internal APIs would add latency, requests, fragility and much more code. Therefore neutral-titled recommendations with no rendered game are explicitly outside guaranteed coverage.

Live Playwright MCP inspection found `yt-lockup-view-model`, `h3[title]`, and `.ytLockupMetadataViewModelTitle`; these are supported alongside legacy markup. Earlier public search smoke checks counted markers rather than independently verifying visibility, so their hiding results are not conclusive. Selected-game watch-page behavior is fixture-tested, not separately live-verified.

## LinkedIn

**Strategy:** match the text of individual update/post containers, not the whole page or feed. Include nested repost containers. No interaction with “see more”, menus or account state.

Research:
- [Better LinkedIn](https://github.com/fx-biocoder/better-linkedin) demonstrates keyword filtering and current feed hooks.
- [Current feed source](https://github.com/fx-biocoder/better-linkedin/blob/main/content-feed.js) uses `[role="listitem"][componentkey^="update-card-focus"]` and `[data-testid="expandable-text-box"]` for the newer SDUI feed.
- [Legacy-selector breakage report](https://github.com/altock/IntentionalBrowsing/issues/1) documents why relying only on `.feed-shared-update-v2` is insufficient.

Both newer SDUI containers and older update/URN hooks are included. Structured text extraction checks block and named-field boundaries independently, while keeping inline formatting together; this includes rendered quote and link-preview text without joining unrelated fields.

Live feed access redirected to LinkedIn login. Authenticated feed correctness is fixture-tested only and must be checked in the user's session; no login credentials or cookies were requested.

## X / Twitter

**Strategy:** scope to `article[data-testid="tweet"]`, then inspect tweet/quote/display-name/link-preview text. Do not assume tweets have separate “titles”. Keep the timeline and unrelated siblings visible. Include the legacy twitter.com hosts.

Research and caveat:
- [DOM filtering discussion covering X and LinkedIn](https://www.justzix.com/en/blog/hide-sponsored-posts-linkedin-facebook-twitter-justzix) discusses data-testid/semantic hooks and selector churn. This is a community source, not an official DOM contract. We do not use its nonstandard CSS text selectors.

The logged-out X page contained no tweet feed, so this adapter has no authenticated live-feed verification. The fixtures cover matching tweet text, quoted text, display names, safe siblings, delayed hydration, and virtualized-node reuse. Platform data-testid attributes are helpful hooks, not a supported public API.

## Matching tradeoffs

Normalize compatibility characters (NFKD), strip combining marks/format controls, lowercase, then match bounded GTA + 6/VI/six forms or the full “Grand Theft Auto” name without requiring a sequel number. The full-name rule intentionally also hides mentions of older franchise games. Allow punctuation separators, not arbitrary words. Check fields separately to avoid a title `GTA` plus unrelated `6 views` becoming a fabricated match.

No fuzzy Levenshtein matcher, generic character-name blacklist, or bare “GTA” rule: those cause substantial false positives. Word boundaries exclude GTA 60/VII/video and embedded alphanumeric strings. Optional hardcoded literal phrases allow deliberate broader filtering. Cross-alphabet homoglyphs, every possible hashtag suffix and image-only spoilers are not promised.

## Testing strategy and evidence

[Playwright's official extension guide](https://playwright.dev/docs/chrome-extensions) requires a persistent Chromium context and recommends bundled Chromium because branded Chrome/Edge removed command-line extension side-loading support. Our tests use that real extension mechanism; they do not fake it by injecting JavaScript. No service worker is added just to discover an extension ID.

Three levels:
1. **Pure Node matcher tests:** 70 positive/negative/regression cases.
2. **Deterministic real-extension browser tests:** 24 tests. Real matching HTTPS origins are intercepted and served minimal local platform-shaped HTML, exercising manifest matching, automatic injection, CSS hiding, isolated-world behavior, safe-content visibility, dynamic DOM, SPA navigation, restoration, large inserts and real media pause behavior. No external network needed.
3. **Optional live smoke:** public YouTube and Twitch, actual unpacked extension, disposable Chromium profile, JSON/screenshot artifacts. Detect visible matching cards. Missing content/network/consent is inconclusive, not passed. These tests are not CI gates because live sites and content change.

Playwright MCP was used for exploratory live DOM inspection. A checked-in Playwright suite is the repeatable equivalent and can explicitly launch with this unpacked extension; an existing MCP browser cannot simply gain the extension after startup.

Local results: **70 matcher tests and 24 extension tests passed**. Earlier live smoke checks used markers as a proxy for visibility and are not evidence of actual hiding. A current visibility-based public smoke check found 37/37 sampled YouTube matches and 25/25 sampled Twitch matches not rendered. No claim of complete live coverage, zero flicker, prevention of download, or logged-in LinkedIn/X verification. CI is configured for Linux but was not run remotely during this session.

Recommended ongoing manual check: use the extension in your existing signed-in Chrome, scroll feed/search/following pages, switch SPA routes, check new title/category markup, and verify safe content remains. Keep any sanitized regression fixtures free of account data. Never commit authentication state.
