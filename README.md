# Starless

Hide GTA spoilers from your feeds.

- A Chrome extension for Twitch, YouTube, LinkedIn, and X.
- Works locally. No data collection, accounts, or build step.
- Hides content in your browser; does not delete posts.

## Install

1. [Download the ZIP](https://github.com/stemper-dev/starless/archive/refs/heads/main.zip) and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the **`extension` folder**.
4. Refresh your website tabs.

- After updates: click **Reload ↻** on Starless, then refresh your tabs.

## What it hides

- **Twitch:** matching stream titles, game categories, and tags.
- **YouTube:** matching titles and game names, when available.
- **LinkedIn and X:** matching posts, quotes, and previews.
- Matches **GTA 6**, **GTA VI**, **GTAVI**, and **Grand Theft Auto**, including common variations.
- Full-name mentions of older games are hidden too. Bare **GTA** is not blocked.

## Limits

- Some spoilers can get through, especially in images or videos with unrelated titles.
- Direct Twitch players and the active YouTube Shorts player are not blocked.
- Website changes can break filtering. Signed-in LinkedIn and X feeds have not been live-tested.

## Development

- Use Node.js 22+ to run tests:

```sh
npm ci
npx playwright install chromium
npm run test:all
```

- Never commit signing keys or login data.
- See [research notes](docs/research.md) for technical details.
