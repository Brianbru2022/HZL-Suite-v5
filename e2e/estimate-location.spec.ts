import { expect, test } from '@playwright/test';
import { seedWorkspace, seededProject } from './support/workspaceSeed';

test('estimate location stays outside the bill controls', async ({ page }) => {
  await seedWorkspace(page, {
    project: {
      ...seededProject,
      siteCountry: 'United Kingdom',
      siteRegion: 'Scotland',
      siteCounty: 'Fife',
    },
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const location = page.getByLabel('Estimate location: United Kingdom · Scotland · Fife');
  await expect(location).toBeVisible();
  await expect(location.locator('img')).toHaveCount(2);
  await expect(location.locator('img').nth(0)).toHaveAttribute('src', './flags/Flag_of_the_United_Kingdom.svg');
  await expect(location.locator('img').nth(1)).toHaveAttribute('src', './flags/Flag_of_Scotland.svg');

  await page.getByRole('button', { name: /Revision E2E Project Estimate location/ }).click();
  await expect(location).toBeVisible();
  await page.getByRole('button', { name: 'Add new bill' }).click();
  await expect(page.getByLabel('Site country')).toHaveCount(0);
  await expect(page.getByLabel('Site region')).toHaveCount(0);
});
