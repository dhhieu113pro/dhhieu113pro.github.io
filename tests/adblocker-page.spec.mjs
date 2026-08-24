import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const widths = [320, 375, 414, 768, 1280];
const storeUrl = 'https://microsoftedge.microsoft.com/addons/detail/ai-vision-ad-blocker/oojihjhomcbmbkbhdjldojjhgpejddfm';
const screenshots = [
  ['01-overview.png', 1280, 800],
  ['02-settings.png', 1280, 800],
  ['03-history.png', 1280, 800],
];

function pngSize(buffer) {
  expect(buffer.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test('publishes a grounded Workbench landing page with the real Store action', async ({ page }) => {
  const response = await page.goto('/adblocker/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Local visual protection for the web.' })).toBeVisible();
  await expect(page.getByText('Network rules', { exact: true })).toBeVisible();
  await expect(page.getByText('page heuristics', { exact: true })).toBeVisible();
  await expect(page.getByText('local image classification', { exact: true })).toBeVisible();
  await expect(page.getByText(/MobileNetV4/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Get for Microsoft Edge ↗', exact: true })).toHaveAttribute('href', storeUrl);
  await expect(page.getByRole('link', { name: 'GitHub ↗', exact: true }).first()).toHaveAttribute(
    'href',
    'https://github.com/dhhieu113pro/adblocker-extension'
  );
  await expect(page.getByText(/trusted by|10×|10x|best ad blocker/i)).toHaveCount(0);
});

test('uses the three pinned 1280x800 screenshots', async ({ page }) => {
  await page.goto('/adblocker/');
  for (const [name, width, height] of screenshots) {
    await expect(page.locator(`img[src="./assets/${name}"]`)).toBeVisible();
    const data = await readFile(`adblocker/assets/${name}`);
    expect(pngSize(data)).toEqual({ width, height });
  }
});

test('shares the root site theme preference', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('site-theme', 'dark'));
  await page.goto('/adblocker/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  const toggle = page.getByRole('button', { name: /Theme:/i });
  await expect(toggle).toBeVisible();
  await toggle.click();
  expect(await page.evaluate(() => localStorage.getItem('site-theme'))).toBe(null);
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
});

test('has no horizontal overflow at Hallmark verification widths', async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/adblocker/');
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth, `overflow at ${width}px`).toBeLessThanOrEqual(dimensions.clientWidth);
  }
});

test('shows a visible keyboard focus indicator', async ({ page }) => {
  await page.goto('/adblocker/');
  const github = page.getByRole('link', { name: 'GitHub ↗', exact: true }).first();
  await github.focus();
  const outline = await github.evaluate((el) => {
    const style = getComputedStyle(el);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });
  expect(outline.style).not.toBe('none');
  expect(outline.width).toBeGreaterThan(0);
});

test('keeps essential content visible with reduced motion', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/adblocker/');
  await expect(page.getByRole('heading', { name: 'Local visual protection for the web.' })).toBeVisible();
  await expect(page.locator('figure img')).toHaveCount(3);
  await context.close();
});
