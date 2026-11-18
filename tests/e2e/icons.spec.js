import { readFile } from 'node:fs/promises';
import { test, expect } from './fixtures.js';

const icons = new URL('../../extension/icons/', import.meta.url);

test('all icon sizes contain a complete star on a transparent background', async ({ page }) => {
  for (const size of [16, 24, 32, 48, 128]) {
    const base64 = (await readFile(new URL(`icon-${size}.png`, icons))).toString('base64');
    const result = await page.evaluate(async base64 => {
      const image = new Image();
      image.src = 'data:image/png;base64,' + base64;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
      let left = image.width, right = 0, top = image.height, bottom = 0;
      for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
          if (pixels[(y * image.width + x) * 4 + 3] > 128) {
            left = Math.min(left, x); right = Math.max(right, x);
            top = Math.min(top, y); bottom = Math.max(bottom, y);
          }
        }
      }
      return { width: image.width, height: image.height, left, right, top, bottom, cornerAlpha: pixels[3] };
    }, base64);
    expect(result.width).toBe(size);
    expect(result.height).toBe(size);
    expect(result.cornerAlpha).toBe(0);
    expect(result.left).toBeLessThan(size * 0.16);
    expect(result.right).toBeGreaterThan(size * 0.8);
    expect(result.top).toBeLessThan(size * 0.16);
    expect(result.bottom).toBeGreaterThan(size * 0.8);
  }
});

test('128px PNG matches the full SVG silhouette, not repeated partial renders', async ({ page }) => {
  const png = (await readFile(new URL('icon-128.png', icons))).toString('base64');
  const svg = (await readFile(new URL('starless.svg', icons))).toString('base64');
  const differences = await page.evaluate(async ({ png, svg }) => {
    async function pixels(type, base64) {
      const image = new Image();
      image.src = `data:image/${type};base64,${base64}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, 128, 128);
      return ctx.getImageData(0, 0, 128, 128).data;
    }
    const actual = await pixels('png', png);
    const expected = await pixels('svg+xml', svg);
    let different = 0;
    for (let i = 3; i < actual.length; i += 4) {
      if (Math.abs(actual[i] - expected[i]) > 1) different++;
    }
    return different;
  }, { png, svg });
  expect(differences).toBe(0);
});
