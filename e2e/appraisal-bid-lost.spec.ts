import { expect, test } from '@playwright/test';
import { seedWorkspace } from './support/workspaceSeed';

const smoke = (page: import('@playwright/test').Page, id: string) => page.locator(`[data-smoke="${id}"]`);

test('a lost bid is grey and watermarked in the register, remains openable, and can be reopened', async ({ page }) => {
  await seedWorkspace(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await smoke(page, 'rail-appraisals').click();
  await smoke(page, 'appraisals-new-house').click();
  await smoke(page, 'appraisals-new-name').fill('Lost bid test');
  await smoke(page, 'appraisals-new-create').click();

  await smoke(page, 'appraisals-bid-lost').click();
  await expect(smoke(page, 'appraisals-bid-lost-badge')).toHaveText('Bid lost');
  await smoke(page, 'appraisals-register-switch').click();
  const card = smoke(page, 'appraisals-register-card').filter({ hasText: 'Lost bid test' });
  await expect(card).toHaveClass(/grayscale/);
  await expect(card.locator('[data-smoke="appraisals-bid-lost-watermark"]')).toHaveText('BID LOST');
  await smoke(page, 'appraisals-hide-bid-lost').check();
  await expect(card).toHaveCount(0);
  await smoke(page, 'appraisals-hide-bid-lost').uncheck();

  await card.getByRole('button', { name: 'Open' }).click();
  await expect(smoke(page, 'appraisals-bid-lost-badge')).toBeVisible();
  await smoke(page, 'appraisals-more-actions').click();
  await page.getByRole('menuitem', { name: 'Reopen lost bid' }).click();
  await expect(smoke(page, 'appraisals-bid-lost-badge')).toHaveCount(0);
  await smoke(page, 'appraisals-register-switch').click();
  await expect(card).not.toHaveClass(/grayscale/);
});

test('moving an unviable appraisal into Bid Lost changes its outcome and watermark', async ({ page }) => {
  await seedWorkspace(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await smoke(page, 'rail-appraisals').click();
  await smoke(page, 'appraisals-new-house').click();
  await smoke(page, 'appraisals-new-name').fill('Bid Lost folder test');
  await smoke(page, 'appraisals-new-create').click();
  await smoke(page, 'appraisals-site-viability').click();
  await page.getByRole('button', { name: 'Mark unviable', exact: true }).last().click();
  await smoke(page, 'appraisals-register-switch').click();

  await smoke(page, 'appraisals-register-add-folder').click();
  await smoke(page, 'appraisals-folder-name').fill('Bid Lost');
  await smoke(page, 'appraisals-folder-dialog').getByRole('button', { name: 'Create folder' }).click();
  await smoke(page, 'appraisals-register-folder-filter').selectOption({ label: 'All folders (1)' });
  const card = smoke(page, 'appraisals-register-card').filter({ hasText: 'Bid Lost folder test' });
  await card.getByLabel('Appraisal folder').selectOption({ label: 'Bid Lost' });
  await expect(card.locator('[data-smoke="appraisals-bid-lost-watermark"]')).toHaveText('BID LOST');
  await expect(card.locator('[data-smoke="appraisals-unviable-watermark"]')).toHaveCount(0);
  await expect(card).toContainText('Bid lost');
  await expect(card).not.toContainText('Unviable');
});
