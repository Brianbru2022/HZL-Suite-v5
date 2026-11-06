import { expect, test } from '@playwright/test';
import { seedWorkspace } from './support/workspaceSeed';

test('Home shows recent projects with a single-line Import button', async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 720 });
  await seedWorkspace(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const home = page.locator('[data-smoke="home-workspace"]');
  await expect(home.getByRole('heading', { name: 'Recent projects' })).toBeVisible();
  await expect(home.getByText('Suite command centre')).toHaveCount(0);
  await expect(home.getByText('Revision E2E Project')).toBeVisible();

  const importButton = home.locator('[data-help-id="home-import"] button').first();
  await expect(importButton).toBeVisible();
  await expect(importButton).toHaveText(/Import/);
  const bounds = await importButton.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.width).toBeGreaterThan(90);
  expect(bounds!.height).toBeLessThan(46);
  await importButton.click();
  await expect(page.getByRole('menu')).toBeVisible();

  await page.setViewportSize({ width: 760, height: 720 });
  const narrowBounds = await importButton.boundingBox();
  expect(narrowBounds).not.toBeNull();
  expect(narrowBounds!.width).toBeGreaterThan(90);
  expect(narrowBounds!.height).toBeLessThan(46);
  expect(narrowBounds!.x + narrowBounds!.width).toBeLessThanOrEqual(760);
});
