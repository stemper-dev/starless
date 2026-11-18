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
  const comparisons = await page.evaluate(async ({ png, svg }) => {
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
    const mask = rgba => Array.from({ length: 128 * 128 }, (_, i) => rgba[i * 4 + 3] >= 128);
    const reference = mask(expected);

    function compare(candidate) {
      // Browser/OS rasterizers can smooth SVG edges differently. Compare solid
      // silhouettes in both directions, allowing a one-pixel edge displacement.
      function coverage(source, target) {
        let total = 0, matched = 0;
        for (let y = 0; y < 128; y++) {
          for (let x = 0; x < 128; x++) {
            if (!source[y * 128 + x]) continue;
            total++;
            let nearby = false;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && nx < 128 && ny >= 0 && ny < 128 && target[ny * 128 + nx]) nearby = true;
              }
            }
            if (nearby) matched++;
          }
        }
        return total ? matched / total : 0;
      }
      const expectedArea = reference.filter(Boolean).length;
      const areaRatio = candidate.filter(Boolean).length / expectedArea;
      return areaRatio >= 0.95 && areaRatio <= 1.05 &&
        coverage(candidate, reference) >= 0.99 && coverage(reference, candidate) >= 0.99;
    }

    // Check the tolerance itself: minor shifts should pass; blank or repeated
    // fragments must fail rather than merely having valid PNG dimensions.
    const shifted = reference.map((_, i) => i % 128 > 0 && reference[i - 1]);
    const fragments = reference.map((_, i) => {
      const x = i % 128, y = Math.floor(i / 128);
      return x >= 44 && x < 84 && reference[(y % 43) * 128 + x];
    });
    return {
      actual: compare(mask(actual)),
      shifted: compare(shifted),
      blank: compare(reference.map(() => false)),
      fragments: compare(fragments),
    };
  }, { png, svg });
  expect(comparisons).toEqual({ actual: true, shifted: true, blank: false, fragments: false });
});
