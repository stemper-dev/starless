// Optional artwork maintenance tool. Loading the extension needs no build.
// Run after editing extension/icons/starless.svg: node scripts/generate-icons.js
import { chromium } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const icons = new URL('../extension/icons/', import.meta.url);
const svg = await readFile(new URL('starless.svg', icons), 'utf8');
const browser = await chromium.launch({ channel: 'chromium' });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await mkdir(icons, { recursive: true });
  await page.setContent('<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block;width:100vw;height:100vh}</style>' + svg);
  for (const size of [16, 32, 48, 128]) {
    await page.setViewportSize({ width: size, height: size });
    await page.screenshot({ path: fileURLToPath(new URL(`icon-${size}.png`, icons)), omitBackground: true });
  }
} finally {
  await browser.close();
}
