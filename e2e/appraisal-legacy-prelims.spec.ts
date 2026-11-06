import { expect, test } from '@playwright/test';
import { createDefaultAppraisal, createSiteDimensionRow } from '../utils/appraisal';
import { seedWorkspace } from './support/workspaceSeed';

test('opening a legacy house-building appraisal restores its missing fixed Prelims bill', async ({ page }) => {
  const legacy = createDefaultAppraisal(null);
  legacy.name = 'Pleasance Road, Coupar Angus';
  const existingRow = createSiteDimensionRow({
    id: 'existing-infrastructure-row',
    sourceRow: 'INFRASTRUCTURE_CUSTOM',
    label: 'Existing site allowance',
    category: 'ROADS',
    costDriver: 'ROADS_M2',
    unit: 'm2',
    quantity: 240,
    rate: 51,
    priceIndex: 233,
    manualAdjustment: 123,
  });
  const awdRow = createSiteDimensionRow({
    libraryRateId: 'awd-infrastructure-roads',
    label: 'Carriageways',
    category: 'ROADS',
    costDriver: 'ROADS_M2',
    unit: 'm2',
    quantity: 0,
    rate: 25.27,
    priceIndex: 233,
  });
  legacy.options[0].siteDimensions = [...(legacy.options[0].siteDimensions || []), existingRow, awdRow];

  await seedWorkspace(page, { appraisals: [legacy] });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-smoke="rail-appraisals"]').click();
  await page.locator('[data-smoke="appraisals-register-card"]').filter({ hasText: legacy.name }).getByRole('button', { name: 'Open' }).click();
  await page.locator('[data-smoke="appraisals-house-stage-prelims"]').first().click();

  const bill = page.locator('[data-smoke="appraisals-prelims-fixed-bill"]');
  await expect(bill.getByText('Architects Fees', { exact: true })).toBeVisible();
  await expect(bill.getByText('Site Manager', { exact: true })).toBeVisible();
  await expect(bill.getByText('Ongoing advertising and marketing', { exact: true })).toBeVisible();
  await expect(bill.locator('tbody tr[data-bill-source]')).toHaveCount(60);

  await page.locator('[data-smoke="appraisals-house-stage-infrastructure"]').first().click();
  const roadsRow = page.locator('[data-smoke="appraisals-infrastructure-fixed-bill"] tr[data-bill-source="existing-infrastructure-row"]');
  await expect(roadsRow).toContainText('Existing site allowance');
  await expect(roadsRow).toContainText('£51.00');
  await expect(page.locator('[data-smoke="appraisals-infrastructure-fixed-bill"]').getByText('Service strips', { exact: true })).toBeVisible();
});
