// Optional public-site smoke check. Never uses a personal/logged-in profile.
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import '../extension/matcher.js';

const extensionPath = fileURLToPath(new URL('../extension', import.meta.url));
const { matches } = globalThis.GTA6Shield;
const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  headless: !process.env.HEADED,
  args: [
    '--disable-extensions-except=' + extensionPath,
    '--load-extension=' + extensionPath,
  ],
});
const report = [];
await mkdir('test-results', { recursive: true });
try {
  for (const [name, url, selector, titleSelector] of [
    ['youtube', 'https://www.youtube.com/results?search_query=gta+6',
      'ytd-video-renderer, yt-lockup-view-model',
      '#video-title, h3'],
    ['twitch', 'https://www.twitch.tv/directory/category/grand-theft-auto-vi',
      'article',
      'h3, h4, [data-a-target="preview-card-game-link"]'],
  ]) {
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.locator(selector).first().waitFor({ state: 'attached', timeout: 20000 });
      // Allow initial hydration/observer batches; this is a diagnostic, not CI.
      await page.waitForTimeout(1500);
      const cards = await page.locator(selector).evaluateAll((nodes, titleSelector) =>
        nodes.map(node => ({
          titles: [...node.querySelectorAll(titleSelector)].map(el => el.getAttribute('title') || el.textContent),
          marked: !!node.closest('[data-gta6-shield-hidden]'),
          hidden: (() => {
            for (let el = node; el; el = el.parentElement) {
              const style = getComputedStyle(el);
              if (style.display === 'none' || style.visibility === 'hidden' ||
                  style.visibility === 'collapse' || style.contentVisibility === 'hidden') return true;
            }
            return node.getClientRects().length === 0;
          })(),
        })), titleSelector);
      const matching = cards.filter(card => card.titles.some(matches));
      const leaked = matching.filter(card => !card.hidden);
      report.push({
        name, url: page.url(), cards: cards.length,
        matching: matching.length, hidden: cards.filter(card => card.hidden).length,
        marked: cards.filter(card => card.marked).length,
        leaked,
        status: matching.length ? (leaked.length ? 'FAIL' : 'PASS') : 'INCONCLUSIVE: no matching text rendered',
      });
      await page.screenshot({ path: 'test-results/live-' + name + '.png', fullPage: true });
    } catch (error) {
      report.push({ name, url, status: 'INCONCLUSIVE: network, consent, or page layout', error: error.message });
    } finally {
      await page.close();
    }
  }
} finally {
  await context.close();
}
await mkdir('test-results', { recursive: true });
await writeFile('test-results/live-report.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.some(result => result.status === 'FAIL')) process.exitCode = 1;
if (report.some(result => result.status.startsWith('INCONCLUSIVE'))) process.exitCode = 2;
