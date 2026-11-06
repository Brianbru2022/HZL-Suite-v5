import { expect, test } from '@playwright/test';
import { seedWorkspace } from './support/workspaceSeed';

const smoke = (page: import('@playwright/test').Page, id: string) => page.locator(`[data-smoke="${id}"]`);

test('unviable site is grey and watermarked in the register even when the appraisal is frozen', async ({ page }) => {
  await seedWorkspace(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await smoke(page, 'rail-appraisals').click();
  await smoke(page, 'appraisals-new-house').click();
  await smoke(page, 'appraisals-new-name').fill('Unviable site test');
  await smoke(page, 'appraisals-new-create').click();

  await smoke(page, 'appraisals-more-actions').click();
  await page.getByRole('menuitem', { name: 'Appraisal details' }).click();
  await smoke(page, 'appraisals-details-drawer').getByLabel('Site status').selectOption('NOT_VIABLE');
  await smoke(page, 'appraisals-details-drawer').getByRole('button', { name: 'Close' }).click();
  await smoke(page, 'appraisals-register-switch').click();
  const card = smoke(page, 'appraisals-register-card').filter({ hasText: 'Unviable site test' });
  await expect(card).not.toHaveClass(/grayscale/);
  await expect(card.locator('[data-smoke="appraisals-unviable-watermark"]')).toHaveCount(0);
  await card.getByRole('button', { name: 'Open' }).click();

  await smoke(page, 'appraisals-freeze-version').click();
  await page.getByRole('button', { name: 'Freeze version', exact: true }).last().click();
  await expect(smoke(page, 'appraisals-frozen-badge')).toBeVisible();
  await smoke(page, 'appraisals-site-viability').click();
  await page.getByRole('button', { name: 'Mark unviable', exact: true }).last().click();
  await expect(smoke(page, 'appraisals-unviable-badge')).toBeVisible();
  await expect(smoke(page, 'appraisals-frozen-badge')).toBeVisible();
  await expect(smoke(page, 'appraisals-site-viability')).toBeDisabled();
  await expect(smoke(page, 'appraisals-site-viability')).toHaveClass(/bg-rose-100/);

  await smoke(page, 'appraisals-register-switch').click();
  await expect(card).toHaveClass(/grayscale/);
  await expect(card.locator('[data-smoke="appraisals-unviable-watermark"]')).toHaveText('UNVIABLE');
  await smoke(page, 'appraisals-hide-unviable').check();
  await expect(card).toHaveCount(0);
  await smoke(page, 'appraisals-hide-unviable').uncheck();
  await smoke(page, 'appraisals-hide-frozen').check();
  await expect(card).toHaveCount(0);
  await smoke(page, 'appraisals-hide-frozen').uncheck();
  await card.getByRole('button', { name: 'Open' }).click();
  await smoke(page, 'appraisals-more-actions').click();
  await page.getByRole('menuitem', { name: 'Reopen unviable site' }).click();
  await expect(smoke(page, 'appraisals-unviable-badge')).toHaveCount(0);
  await smoke(page, 'appraisals-register-switch').click();
  await expect(card.locator('[data-smoke="appraisals-unviable-watermark"]')).toHaveCount(0);
  await expect(card.locator('[data-smoke="appraisals-register-watermark"]')).toHaveText('FROZEN');
});

test('register folder stays editable while an unviable appraisal is read-only', async ({ page }) => {
  await seedWorkspace(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await smoke(page, 'rail-appraisals').click();
  await smoke(page, 'appraisals-new-house').click();
  await smoke(page, 'appraisals-new-name').fill('Folder move test');
  await smoke(page, 'appraisals-new-create').click();
  await smoke(page, 'appraisals-site-viability').click();
  await page.getByRole('button', { name: 'Mark unviable', exact: true }).last().click();
  await expect(smoke(page, 'appraisals-site-viability')).toBeDisabled();
  await expect(page.getByText('Appraisal inputs are read-only.')).toBeVisible();
  await smoke(page, 'appraisals-register-switch').click();

  await smoke(page, 'appraisals-register-add-folder').click();
  await smoke(page, 'appraisals-folder-name').fill('Review folder');
  await smoke(page, 'appraisals-folder-dialog').getByRole('button', { name: 'Create folder' }).click();
  await smoke(page, 'appraisals-register-folder-filter').selectOption({ label: 'All folders (1)' });
  const card = smoke(page, 'appraisals-register-card').filter({ hasText: 'Folder move test' });
  const folderSelect = card.getByLabel('Appraisal folder');
  await expect(folderSelect).toBeEnabled();
  await folderSelect.selectOption({ label: 'Review folder' });
  await expect(folderSelect).toHaveValue(/.+/);
  await smoke(page, 'appraisals-register-folder-filter').selectOption({ label: 'Review folder (1)' });
  await expect(card).toBeVisible();
  await card.click({ position: { x: 500, y: 20 } });
  await expect(smoke(page, 'appraisals-more-actions')).toBeVisible();
  await smoke(page, 'appraisals-more-actions').click();
  await page.getByRole('menuitem', { name: 'Appraisal details' }).click();
  await expect(smoke(page, 'appraisals-details-drawer').getByLabel('Appraisal name')).toBeDisabled();
  await expect(smoke(page, 'appraisals-details-drawer').getByLabel('Folder')).toBeDisabled();
});

test('register folder stays editable on a frozen appraisal', async ({ page }) => {
  await seedWorkspace(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await smoke(page, 'rail-appraisals').click();
  await smoke(page, 'appraisals-new-house').click();
  await smoke(page, 'appraisals-new-name').fill('Frozen folder test');
  await smoke(page, 'appraisals-new-create').click();
  await smoke(page, 'appraisals-freeze-version').click();
  await page.getByRole('button', { name: 'Freeze version', exact: true }).last().click();
  await smoke(page, 'appraisals-register-switch').click();

  await smoke(page, 'appraisals-register-add-folder').click();
  await smoke(page, 'appraisals-folder-name').fill('Frozen review');
  await smoke(page, 'appraisals-folder-dialog').getByRole('button', { name: 'Create folder' }).click();
  await smoke(page, 'appraisals-register-folder-filter').selectOption({ label: 'All folders (1)' });
  const card = smoke(page, 'appraisals-register-card').filter({ hasText: 'Frozen folder test' });
  const folderSelect = card.getByLabel('Appraisal folder');
  await expect(folderSelect).toBeEnabled();
  await folderSelect.selectOption({ label: 'Frozen review' });
  await smoke(page, 'appraisals-register-folder-filter').selectOption({ label: 'Frozen review (1)' });
  await expect(card).toBeVisible();
  await expect(card.locator('[data-smoke="appraisals-register-watermark"]')).toHaveText('FROZEN');
  await card.getByRole('button', { name: 'Frozen folder test' }).click();
  await expect(smoke(page, 'appraisals-frozen-badge')).toBeVisible();
  await smoke(page, 'appraisals-more-actions').click();
  await page.getByRole('menuitem', { name: 'Appraisal details' }).click();
  await expect(smoke(page, 'appraisals-details-drawer').getByLabel('Appraisal name')).toBeDisabled();
});
