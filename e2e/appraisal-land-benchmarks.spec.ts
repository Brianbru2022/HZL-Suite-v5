import { expect, test } from '@playwright/test';
import {
  createDefaultAppraisal,
  createDefaultAppraisalHouseType,
  createHouseTypeScheduleRowFromLibrary,
} from '../utils/appraisal';

test('overall summary shows land cost by gross site area and dwelling mix', async ({ page }) => {
  const appraisal = createDefaultAppraisal();
  const option = {
    ...appraisal.options[0],
    calculationMode: 'KNOWN_LAND_PROFIT_ON_GDV' as const,
    knownLandValue: 1_000_000,
    financeAnnualRatePercent: 0,
    houseTypeSchedule: [
      createHouseTypeScheduleRowFromLibrary(createDefaultAppraisalHouseType({ gifaM2: 100 }), { quantity: 6, tenure: 'PRIVATE' }),
      createHouseTypeScheduleRowFromLibrary(createDefaultAppraisalHouseType({ gifaM2: 80 }), { quantity: 4, tenure: 'AFFORDABLE' }),
    ],
    siteDimensions: [
      { id: 'site-area', category: 'SITE_AREA' as const, costDriver: 'SITE_AREA_M2' as const, isCostDriverInput: true, label: 'Site area', unit: 'm2' as const, quantity: 10_000, rate: 0 },
    ],
  };
  await page.addInitScript((record) => {
    localStorage.clear();
    localStorage.setItem('qs-pro-appraisals-v1', JSON.stringify([record]));
    for (const key of ['qs-pro-projects-v11', 'qs-pro-libraries-v11', 'qs-pro-trades-v11', 'qs-pro-appraisal-house-types-v1', 'qs-pro-appraisal-rates-v1', 'qs-pro-workspace-folders-v1']) localStorage.setItem(key, '[]');
  }, { ...appraisal, name: 'Land benchmark check', options: [option] });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-smoke="rail-appraisals"]').click();
  await page.locator('[data-smoke="appraisals-register-card"]').getByRole('button', { name: 'Open', exact: true }).click();
  await page.locator('[data-smoke="appraisals-house-stage-overall-summary"]').first().click();

  const benchmarks = page.locator('[data-smoke="appraisals-land-cost-benchmarks"]');
  await expect(benchmarks).toBeVisible();
  await expect(benchmarks.getByRole('row', { name: /Per gross site hectare/ })).toContainText('£1,000,000/ha');
  await expect(benchmarks.getByRole('row', { name: /Per private unit/ })).toContainText('£166,667/unit');
  await expect(benchmarks.getByRole('row', { name: /Per private \+ affordable unit/ })).toContainText('£100,000/unit');
  await expect(benchmarks.getByRole('row', { name: /Per private gross ft²/ })).toContainText('£154.84/ft²');
});
