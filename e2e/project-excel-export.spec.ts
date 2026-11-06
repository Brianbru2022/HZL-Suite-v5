import { expect, test } from '@playwright/test';
import { openSeededBillWorkspace } from './support/workspaceSeed';

test('exports the project workbook in the browser runtime', async ({ page }) => {
  await openSeededBillWorkspace(page);

  await page.getByLabel('Project menu').click();
  await page.getByRole('menuitem', { name: /Project workbook/ }).click();
  await expect(page.getByText('Export Revision E2E Project')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();

  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('BoQ-Revision_E2E_Project.xlsx');
  await expect(download.failure()).resolves.toBeNull();
});
