import { test as base, chromium, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const extensionPath = fileURLToPath(new URL('../../extension', import.meta.url));

export const test = base.extend({
  context: async ({}, use) => {
    // A fresh disposable profile; never touches the user's Chrome profile.
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: !process.env.HEADED,
      args: [
        '--autoplay-policy=no-user-gesture-required',
        '--disable-extensions-except=' + extensionPath,
        '--load-extension=' + extensionPath,
      ],
    });
    await use(context);
    await context.close();
  },
});
export { expect };

export async function fixture(page, url, html) {
  // Real matching origins, but zero live website/network dependence.
  await page.context().route('**/*', route => {
    if (route.request().isNavigationRequest()) {
      return route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><html><head><style>' +
          'article,ytd-video-renderer,ytd-rich-item-renderer,yt-lockup-view-model,' +
          'ytd-reel-item-renderer,ytd-watch-flexy{display:block;min-height:24px}' +
          '</style></head><body>' + html + '</body></html>',
      });
    }
    return route.abort();
  });
  await page.goto(url);
}
