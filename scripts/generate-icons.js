// Optional artwork maintenance tool. Loading the extension needs no build.
// Run after editing extension/icons/starless.svg: node scripts/generate-icons.js
// To replace just one size: node scripts/generate-icons.js 128
import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';

const icons = new URL('../extension/icons/', import.meta.url);
const svg = await readFile(new URL('starless.svg', icons), 'utf8');
const sizes = process.argv.length > 2 ? process.argv.slice(2).map(Number) : [16, 24, 32, 48, 128];
if (sizes.some(size => ![16, 24, 32, 48, 128].includes(size))) {
  throw new Error('Supported sizes: 16, 24, 32, 48, 128');
}
const browser = await chromium.launch({ channel: 'chromium' });
try {
  const page = await browser.newPage();
  await mkdir(icons, { recursive: true });
  for (const size of sizes) {
    // Render at explicit dimensions, independent of viewport/compositor resizing.
    const base64 = await page.evaluate(async ({ svg, size }) => {
      const image = new Image();
      image.src = 'data:image/svg+xml;base64,' + btoa(svg);
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      canvas.getContext('2d').drawImage(image, 0, 0, size, size);
      return canvas.toDataURL('image/png').split(',')[1];
    }, { svg, size });
    await writeFile(new URL(`icon-${size}.png`, icons), Buffer.from(base64, 'base64'));
  }
} finally {
  await browser.close();
}
