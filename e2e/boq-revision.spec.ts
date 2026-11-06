import { expect, test } from '@playwright/test';
import { openSeededBillWorkspace } from './support/workspaceSeed';

test('records a labelled BoQ revision point and opens its revert preview', async ({ page }) => {
  await openSeededBillWorkspace(page);
  const billWorkspace = page.locator('[data-smoke="bill-workspace"]');
  await expect(billWorkspace).toBeVisible();

  await billWorkspace.getByRole('button', { name: 'Revision point' }).click();
  const revisionDialog = page.getByRole('dialog', { name: /record revision point/i });
  await expect(revisionDialog).toBeVisible();
  await expect(revisionDialog.getByText('Scope:')).toBeVisible();
  await expect(revisionDialog.getByText('Main bill')).toBeVisible();

  await page.getByPlaceholder('Before client changes').fill('Before smoke change');
  await page.getByPlaceholder('Instruction 04 pricing changes').fill('Smoke note');
  await revisionDialog.getByRole('button', { name: 'Record revision point' }).click();

  await expect(page.getByText(/Recorded BoQ revision point/i)).toBeVisible();
  await page.getByLabel('Open version history').click();
  await expect(page.getByRole('heading', { name: 'Version history' })).toBeVisible();
  await expect(page.getByText('Before smoke change')).toBeVisible();
  await expect(page.getByText('Smoke note')).toBeVisible();

  await page.getByRole('button', { name: 'Revert' }).click();
  const revertPreview = page.getByRole('dialog', { name: /revert to this boq revision point/i });
  await expect(revertPreview).toBeVisible();
  await expect(revertPreview.getByText('Before smoke change')).toBeVisible();
  await expect(revertPreview.getByText('Smoke note')).toBeVisible();
  await expect(revertPreview.getByText('Added rows')).toBeVisible();
  await expect(revertPreview.getByText('Removed rows')).toBeVisible();
  await expect(revertPreview.getByText('Changed rows')).toBeVisible();
  await expect(revertPreview.getByRole('button', { name: 'Revert to this point' })).toBeVisible();
});
