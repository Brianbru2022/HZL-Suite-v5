import { expect, test } from '@playwright/test';
import { seedWorkspace } from './support/workspaceSeed';

const smoke = (page: import('@playwright/test').Page, id: string) => page.locator(`[data-smoke="${id}"]`);

test('freezing an appraisal preserves the old version and opens an editable revision', async ({ page }) => {
  await seedWorkspace(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await smoke(page, 'rail-appraisals').click();
  await smoke(page, 'appraisals-new-house').click();
  await smoke(page, 'appraisals-new-name').fill('Frozen version test');
  await expect(smoke(page, 'appraisals-new-create')).toBeEnabled();
  await smoke(page, 'appraisals-new-create').click();

  await smoke(page, 'appraisals-freeze-version').click();
  await page.getByRole('button', { name: 'Freeze version', exact: true }).last().click();
  await expect(smoke(page, 'appraisals-frozen-badge')).toBeVisible();
  await expect(smoke(page, 'appraisals-frozen-watermark')).toHaveText('FROZEN');
  await expect(smoke(page, 'appraisals-freeze-version')).toBeDisabled();
  await expect(smoke(page, 'appraisals-freeze-version')).toHaveClass(/bg-rose-100/);
  await expect(smoke(page, 'appraisals-create-revision')).toBeVisible();
  await expect(page.getByText('View frozen cost summary')).toBeVisible();

  await smoke(page, 'appraisals-register-switch').click();
  await expect(smoke(page, 'appraisals-register-watermark')).toHaveText('FROZEN');
  await smoke(page, 'appraisals-register-card').getByRole('button', { name: 'Open' }).click();
  await expect(smoke(page, 'appraisals-frozen-watermark')).toBeVisible();

  await smoke(page, 'appraisals-create-revision').click();
  await expect(smoke(page, 'appraisals-new-version-drawer')).toBeVisible();
  await smoke(page, 'appraisals-version-summary').fill('Updated prices');
  await smoke(page, 'appraisals-version-create').click();
  await expect(smoke(page, 'appraisals-freeze-version')).toBeVisible();
  await expect(smoke(page, 'appraisals-frozen-badge')).toHaveCount(0);
  await expect(smoke(page, 'appraisals-frozen-watermark')).toHaveCount(0);

  await smoke(page, 'appraisals-register-switch').click();
  await expect(smoke(page, 'appraisals-register-results')).toContainText('Frozen');
  await expect(smoke(page, 'appraisals-register-results')).toContainText('Updated prices');
  await expect(smoke(page, 'appraisals-register-watermark')).toHaveCount(0);
});
