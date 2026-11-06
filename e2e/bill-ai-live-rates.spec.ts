import { expect, test } from '@playwright/test';
import { openSeededBillWorkspace, seededProject } from './support/workspaceSeed';

test('selected heading opens a review of its priced children only', async ({ page }) => {
  const rows = [
    { id: 'rate-h3', type: 'SUB_SECTION', reference: '', description: 'Paving', unit: '', quantity: 0, rate: 0, total: 0 },
    { id: 'rate-item-1', type: 'PRICED', reference: '01', description: 'Concrete paving', unit: 'm2', quantity: 4, rate: 20, total: 80 },
    { id: 'rate-item-2', type: 'PRICED', reference: '02', description: 'Edging', unit: 'm', quantity: 6, rate: 10, total: 60 },
    { id: 'rate-peer-h3', type: 'SUB_SECTION', reference: '', description: 'Drainage', unit: '', quantity: 0, rate: 0, total: 0 },
    { id: 'rate-item-3', type: 'PRICED', reference: '03', description: 'Drainage pipe', unit: 'm', quantity: 4, rate: 12, total: 48 },
  ];
  const project = {
    ...seededProject,
    bills: seededProject.bills.map((bill) => ({ ...bill, sections: bill.sections.map((section) => ({ ...section, items: rows })) })),
  };
  await openSeededBillWorkspace(page, { project });
  await page.locator('[data-bill-row-id="rate-h3"]').getByRole('button', { name: 'Select Paving', exact: true }).click();
  await page.getByRole('button', { name: 'AI live rates' }).click();
  const review = page.getByRole('dialog', { name: 'AI live unit rates' });
  await expect(review).toBeVisible();
  await expect(review).toContainText('2 priced items to research');
  await expect(review).toContainText('Concrete paving');
  await expect(review).toContainText('Edging');
  await expect(review).not.toContainText('Drainage pipe');
  await expect(review.getByRole('button', { name: 'Apply 0 rates' })).toBeDisabled();
  await review.getByRole('button', { name: 'Close AI rate review' }).click();
  await expect(review).toHaveCount(0);
});
