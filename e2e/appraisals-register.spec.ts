import { expect, test } from '@playwright/test';
import { seedWorkspace } from './support/workspaceSeed';

function smoke(page: import('@playwright/test').Page, id: string) {
  return page.locator(`[data-smoke="${id}"]`);
}

test('Appraisals opens to the register and creates each appraisal type', async ({ page }) => {
  await seedWorkspace(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(smoke(page, 'home-workspace')).toBeVisible();

  await smoke(page, 'rail-appraisals').click();
  await expect(smoke(page, 'appraisals-workspace')).toBeVisible();
  await expect(smoke(page, 'appraisals-register-workspace')).toBeVisible();
  await expect(smoke(page, 'appraisals-register-results')).toBeVisible();
  await smoke(page, 'appraisals-register-add-folder').click();
  await expect(smoke(page, 'appraisals-folder-dialog')).toBeVisible();
  await smoke(page, 'appraisals-folder-name').fill('Register folder');
  await smoke(page, 'appraisals-folder-dialog').getByRole('button', { name: 'Create folder' }).click();
  await expect(smoke(page, 'appraisals-folder-dialog')).toBeHidden();
  await smoke(page, 'appraisals-register-folder-filter').selectOption({ label: 'All folders (0)' });

  await smoke(page, 'appraisals-new-house').click();
  await expect(smoke(page, 'appraisals-new-setup-drawer')).toBeVisible();
  await expect(smoke(page, 'appraisals-new-create')).toBeDisabled();
  await smoke(page, 'appraisals-new-folder-name').fill('June appraisals');
  await smoke(page, 'appraisals-new-folder-create').click();
  await expect(smoke(page, 'appraisals-new-folder')).toHaveValue(/.+/);
  await smoke(page, 'appraisals-new-name').click();
  await page.keyboard.type('Sauchie CTC appraisal');
  await expect(smoke(page, 'appraisals-new-name')).toHaveValue('Sauchie CTC appraisal');
  await expect(smoke(page, 'appraisals-new-cost-pack')).toHaveValue('AWD');
  await smoke(page, 'appraisals-new-calculation-KNOWN_LAND_PROFIT_ON_GDV').check();
  await expect(smoke(page, 'appraisals-new-setup-drawer')).toContainText('.001.A');
  await smoke(page, 'appraisals-new-create').click();
  await expect(smoke(page, 'appraisals-guided-editor')).toBeVisible();
  await expect(smoke(page, 'appraisals-house-workspace')).toBeVisible();
  await expect(smoke(page, 'appraisals-guided-editor')).not.toContainText('Active option');
  await expect(smoke(page, 'appraisals-guided-editor')).not.toContainText('Option name');
  await expect(smoke(page, 'appraisals-guided-editor')).not.toContainText('Duration months');
  await expect(smoke(page, 'appraisals-option-select')).toHaveCount(0);
  await smoke(page, 'appraisals-more-actions').click();
  await page.getByRole('menuitem', { name: 'Appraisal details' }).click();
  await expect(smoke(page, 'appraisals-details-drawer')).toBeVisible();
  const detailsBefore = await smoke(page, 'appraisals-details-drawer').boundingBox();
  const detailsHandle = await smoke(page, 'appraisals-details-drawer-drag-handle').boundingBox();
  if (detailsBefore && detailsHandle) {
    await page.mouse.move(detailsHandle.x + 20, detailsHandle.y + 20);
    await page.mouse.down();
    await page.mouse.move(detailsHandle.x + 100, detailsHandle.y + 85);
    await page.mouse.up();
    const detailsAfter = await smoke(page, 'appraisals-details-drawer').boundingBox();
    expect(Math.abs((detailsAfter?.x || 0) - detailsBefore.x) + Math.abs((detailsAfter?.y || 0) - detailsBefore.y)).toBeGreaterThan(20);
  }
  await page.keyboard.press('Escape');
  await expect(smoke(page, 'appraisals-details-drawer')).toHaveCount(0);
  await smoke(page, 'appraisals-more-actions').click();
  await page.getByRole('menuitem', { name: 'Compare options' }).click();
  await expect(smoke(page, 'appraisals-compare-drawer')).toBeVisible();
  await expect(smoke(page, 'appraisals-option-table')).toBeVisible();
  await smoke(page, 'appraisals-compare-drawer').getByRole('button', { name: 'Close' }).click();
  await smoke(page, 'appraisals-more-actions').click();
  await page.getByRole('menuitem', { name: 'Options', exact: true }).click();
  await expect(smoke(page, 'appraisals-options-drawer')).toBeVisible();
  await smoke(page, 'appraisals-options-drawer').getByLabel('Option name').first().fill('Base scenario');
  await smoke(page, 'appraisals-add-option').click();
  await expect(smoke(page, 'appraisals-options-drawer').getByLabel('Option name')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(smoke(page, 'appraisals-option-select')).toBeVisible();
  await smoke(page, 'appraisals-more-actions').click();
  await expect(page.getByRole('menuitem', { name: 'Export PDF final report' })).toBeVisible();
  await page.keyboard.press('Escape');
  await smoke(page, 'appraisals-add-custom-house').click();
  await expect(smoke(page, 'appraisals-custom-house-drawer')).toBeVisible();
  await smoke(page, 'appraisals-custom-house-name').fill('Custom terrace');
  await smoke(page, 'appraisals-custom-house-quantity').fill('2');
  await smoke(page, 'appraisals-custom-house-gifa').fill('95');
  await smoke(page, 'appraisals-custom-house-cost').fill('1800');
  await page.getByLabel('Use component build-up').check();
  await smoke(page, 'appraisals-custom-house-save-library').check();
  await smoke(page, 'appraisals-custom-house-save').click();
  await expect(smoke(page, 'appraisals-house-schedule')).toContainText('Custom terrace');
  await smoke(page, 'appraisals-house-row').getByRole('button', { name: /Edit Custom terrace/ }).click();
  await expect(smoke(page, 'appraisals-house-edit-drawer')).toBeVisible();
  await smoke(page, 'appraisals-edit-house-quantity').fill('4');
  await smoke(page, 'appraisals-edit-house-save').click();
  await expect(smoke(page, 'appraisals-house-schedule')).toContainText('4');
  await smoke(page, 'appraisals-house-stage-house-prices').first().click();
  await expect(smoke(page, 'appraisals-house-prices')).toBeVisible();
  await smoke(page, 'appraisals-sales-price-unit').fill('320000');
  await expect(smoke(page, 'appraisals-sales-price-unit')).toHaveValue('£320,000');
  await expect(smoke(page, 'appraisals-house-prices')).toContainText('£1,280,000');
  await smoke(page, 'appraisals-sales-mode-house-type-rate-ft2').click();
  await smoke(page, 'appraisals-sales-price-rate-ft2').fill('300');
  await expect(smoke(page, 'appraisals-house-prices')).toContainText('Total GDV');
  await smoke(page, 'appraisals-sales-mode-development-rate-ft2').click();
  await smoke(page, 'appraisals-sales-development-rate-ft2').fill('250');
  await smoke(page, 'appraisals-sales-development-rate-apply').click();
  await expect(smoke(page, 'appraisals-sales-global-price-unit')).toBeDisabled();
  await expect(smoke(page, 'appraisals-sales-global-price-unit')).toHaveValue('£255,643');
  await expect(smoke(page, 'appraisals-house-prices')).toContainText('Individual prices');
  await smoke(page, 'appraisals-house-stage-abnormal-works').first().click();
  await expect(smoke(page, 'appraisals-abnormals')).toBeVisible();
  await smoke(page, 'appraisals-add-abnormal').click();
  await page.getByRole('menuitem', { name: /Road cappings/ }).click();
  await expect.poll(() => smoke(page, 'appraisals-abnormal-title').evaluateAll(inputs => inputs.map(input => (input as HTMLInputElement).value))).toContain('Road cappings');
  await smoke(page, 'appraisals-constraints-report-upload').setInputFiles({
    name: 'constraints.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Constraints report'),
  });
  await expect(smoke(page, 'appraisals-abnormals')).toContainText('constraints.txt');

  await smoke(page, 'appraisals-register-switch').click();
  await expect(smoke(page, 'appraisals-register-card')).toHaveCount(1);
  await expect(smoke(page, 'appraisals-register-results')).toContainText('Housing');
  await smoke(page, 'appraisals-new-version').click();
  await expect(smoke(page, 'appraisals-new-version-drawer')).toBeVisible();
  await smoke(page, 'appraisals-version-summary').fill('Updated pricing and house schedule.');
  await smoke(page, 'appraisals-version-create').click();
  await expect(smoke(page, 'appraisals-guided-editor')).toBeVisible();
  await smoke(page, 'appraisals-register-switch').click();
  await expect(smoke(page, 'appraisals-register-card')).toHaveCount(1);
  await expect(smoke(page, 'appraisals-register-results')).toContainText('Updated pricing and house schedule.');
  await smoke(page, 'appraisals-register-folder-filter').selectOption({ label: 'June appraisals (1)' });
  await expect(smoke(page, 'appraisals-register-year-filter')).toContainText('2026');
  await smoke(page, 'appraisals-register-year-filter').selectOption('2026');
  await expect(smoke(page, 'appraisals-register-results')).toContainText('Sauchie CTC appraisal');

  page.once('dialog', async (dialog) => { await dialog.accept(); });
  await page.getByLabel('Folder actions').click();
  await page.getByRole('menuitem', { name: 'Delete folder' }).click();
  await smoke(page, 'appraisals-register-folder-filter').selectOption({ label: 'Unfiled appraisals (1)' });
  await expect(smoke(page, 'appraisals-register-results')).toContainText('Sauchie CTC appraisal');

  await smoke(page, 'appraisals-new-commercial').click();
  await expect(smoke(page, 'appraisals-new-setup-drawer')).toBeVisible();
  await expect(smoke(page, 'appraisals-new-create')).toBeDisabled();
  await smoke(page, 'appraisals-new-name').fill('Commercial yield appraisal');
  await smoke(page, 'appraisals-new-create').click();
  await expect(smoke(page, 'appraisals-commercial-workspace')).toBeVisible();

  await smoke(page, 'appraisals-register-switch').click();
  await expect(smoke(page, 'appraisals-register-card')).toHaveCount(2);
  await expect(smoke(page, 'appraisals-register-results')).toContainText('Commercial');
  await smoke(page, 'appraisals-register-card').filter({ hasText: 'Commercial yield appraisal' }).locator('[data-smoke="appraisals-delete-appraisal"]').click();
  await expect(page.getByRole('dialog')).toContainText('Delete appraisal?');
  await page.getByRole('dialog').getByRole('button', { name: 'Delete appraisal' }).click();
  await expect(smoke(page, 'appraisals-register-card')).toHaveCount(1);
});
