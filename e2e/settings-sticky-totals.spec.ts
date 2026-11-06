import { expect, test } from '@playwright/test';
import { openSeededBillWorkspace } from './support/workspaceSeed';

test('settings can disable sticky bill totals for the current project', async ({ page }) => {
  await openSeededBillWorkspace(page);

  const stickyTotals = page.locator('[data-smoke="sticky-bill-totals"]');
  await expect(stickyTotals).toBeHidden();
  await page.getByRole('button', { name: 'Show bill and project totals' }).click();
  await expect(stickyTotals).toBeVisible();
  await expect(stickyTotals).toContainText('Current bill');
  await expect(stickyTotals).toContainText('Project total');
  await expect(stickyTotals).toContainText('Main bill');

  await page.locator('[data-smoke="rail-settings"]').click();
  await expect(page.locator('[data-smoke="settings-workspace"]')).toBeVisible();
  await expect(page.locator('[data-smoke="sticky-bill-totals"]')).toBeHidden();

  await page.locator('[data-smoke="settings-section-project-defaults"]').click();
  await page.locator('[data-smoke="settings-sticky-totals-toggle"]').click();
  await page.locator('[data-smoke="settings-save"]').click();
  await expect(page.getByText('App settings saved.')).toBeVisible();

  await page.locator('[data-smoke="settings-section-current-project"]').click();
  await page.locator('[data-smoke="settings-apply-defaults-current-project"]').click();
  await expect(page.getByText('Applied app defaults to Revision E2E Project.')).toBeVisible();

  await page.locator('[data-smoke="rail-estimate"]').click();
  await expect(page.locator('[data-smoke="bill-workspace"]')).toBeVisible();
  await expect(page.locator('[data-smoke="sticky-bill-totals"]')).toBeHidden();
});
