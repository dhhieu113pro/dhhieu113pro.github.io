import { test, expect } from '@playwright/test';

test('routes the Adblocker project card to the product landing page', async ({ page }) => {
  await page.goto('/');

  const card = page.locator('a.project').filter({ hasText: 'Adblocker' });
  await expect(card).toHaveCount(1);
  await expect(card).toHaveAttribute('href', './adblocker/');
  await expect(card.getByRole('heading', { name: 'Adblocker', exact: true })).toBeVisible();
  await expect(card.getByText('Local browser protection using rules, heuristics and on-device AI.', { exact: true })).toBeVisible();
  await expect(card.getByText('Explore →', { exact: true })).toBeVisible();
});
