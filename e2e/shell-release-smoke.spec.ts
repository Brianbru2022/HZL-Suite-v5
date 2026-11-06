import { expect, test, type Page } from '@playwright/test';
import { seedWorkspace } from './support/workspaceSeed';

test.setTimeout(90_000);

const releaseSmokeCases = [
  { name: '1180x720 light', width: 1180, height: 720, theme: 'light' },
  { name: '1180x720 dark', width: 1180, height: 720, theme: 'dark' },
  { name: '1440x820 light', width: 1440, height: 820, theme: 'light' },
  { name: '1440x820 dark', width: 1440, height: 820, theme: 'dark' },
  { name: '1920x1080 light', width: 1920, height: 1080, theme: 'light' },
  { name: '1920x1080 dark', width: 1920, height: 1080, theme: 'dark' },
] as const;

function smoke(page: Page, id: string) {
  return page.locator(`[data-smoke="${id}"]`);
}

async function expectTheme(page: Page, theme: 'light' | 'dark') {
  await expect.poll(async () => (
    await page.evaluate(() => document.documentElement.classList.contains('dark'))
  )).toBe(theme === 'dark');
}

async function expectScrollableSmoke(page: Page, id: string) {
  await expect.poll(async () => (
    await smoke(page, id).evaluate((root) => {
      const nodes = [root, ...Array.from(root.querySelectorAll('*'))] as HTMLElement[];
      return nodes.some((node) => {
        const style = getComputedStyle(node);
        return ['auto', 'scroll'].includes(style.overflowY) && node.scrollHeight > node.clientHeight + 16;
      });
    })
  )).toBe(true);
}

test.describe('release shell smoke', () => {
  test.describe.configure({ mode: 'serial' });

  for (const viewport of releaseSmokeCases) {
    test(`navigates core workspaces and closes prior module surfaces at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ colorScheme: viewport.theme });
      await seedWorkspace(page, { theme: viewport.theme });
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      await expectTheme(page, viewport.theme);
      await expect(smoke(page, 'home-workspace')).toBeVisible();

      await smoke(page, 'rail-library').click();
      await smoke(page, 'hub-open-appraisal-libraries').click();
      await expect(smoke(page, 'appraisals-workspace')).toBeVisible();
      await expect(smoke(page, 'appraisals-library-workspace')).toBeVisible();
      await smoke(page, 'appraisals-awd-pack-open').click();
      await smoke(page, 'appraisals-house-type-create').click();
      await expect(smoke(page, 'appraisals-house-build-up-drawer')).toBeVisible();
      await smoke(page, 'appraisals-house-type-name').fill('E2E Type A');
      await smoke(page, 'appraisals-house-type-gifa').fill('88');
      await smoke(page, 'appraisals-house-type-cost').fill('1650');
      await smoke(page, 'appraisals-house-build-up-drawer').getByRole('button', { name: 'Close' }).click();
      await smoke(page, 'appraisals-other-cost-infrastructure').click();
      await expect(smoke(page, 'appraisals-other-cost-drawer')).toBeVisible();
      await smoke(page, 'appraisals-rate-label').fill('Roads standard');
      await smoke(page, 'appraisals-rate-value').fill('75');
      await smoke(page, 'appraisals-rate-create').click();
      await smoke(page, 'appraisals-other-cost-drawer').getByRole('button', { name: 'Close' }).click();
      await smoke(page, 'appraisals-other-cost-plot-works').click();
      await expect(smoke(page, 'appraisals-rate-row-label-awd-plot-works-drives')).toHaveValue('Drives');
      await expect(smoke(page, 'appraisals-rate-row-label-awd-plot-works-steps-borders')).toHaveValue('Steps, borders etc');
      await smoke(page, 'appraisals-other-cost-drawer').getByRole('button', { name: 'Close' }).click();
      await smoke(page, 'appraisals-other-cost-prelims').click();
      await expect(smoke(page, 'appraisals-prelims-section-design_costs')).toContainText('Design Costs');
      await expect(smoke(page, 'appraisals-rate-row-label-awd-prelims-architects-fees')).toHaveValue('Architects Fees');
      await expect(smoke(page, 'appraisals-formula-build-up-awd-prelims-engineers-fees')).toContainText('Non-standard house type count allowance');
      await smoke(page, 'appraisals-prelims-section-site_prelims').getByRole('button', { name: /Site Prelims/ }).click();
      await expect(smoke(page, 'appraisals-rate-row-label-awd-prelims-fuel')).toBeHidden();
      await smoke(page, 'appraisals-other-cost-drawer').getByRole('button', { name: 'Close' }).click();
      await smoke(page, 'appraisals-house-switch').click();
      await smoke(page, 'appraisals-new').click();
      await expect(smoke(page, 'appraisals-new-setup-drawer')).toBeVisible();
      await smoke(page, 'appraisals-new-name').fill('Release smoke house appraisal');
      await smoke(page, 'appraisals-new-create').click();
      await expect(smoke(page, 'appraisals-guided-editor')).toBeVisible();
      await smoke(page, 'appraisals-compare-options').click();
      await expect(smoke(page, 'appraisals-option-table')).toBeVisible();
      await smoke(page, 'appraisals-compare-drawer').getByRole('button', { name: 'Close' }).click();
      await expect(smoke(page, 'appraisals-house-workspace')).toBeVisible();
      await smoke(page, 'appraisals-house-type-add').click();
      await expect(smoke(page, 'appraisals-standard-house-drawer')).toBeVisible();
      await page.getByLabel('Search standard house types').fill('E2E Type A');
      await smoke(page, 'appraisals-standard-house-quantity').fill('3');
      await smoke(page, 'appraisals-standard-house-save').click();
      await expect(smoke(page, 'appraisals-house-schedule')).toContainText('E2E Type A');
      await smoke(page, 'appraisals-house-stage-house-prices').click();
      await expect(smoke(page, 'appraisals-house-prices')).toBeVisible();
      await smoke(page, 'appraisals-sales-price-unit').fill('250000');
      await smoke(page, 'appraisals-house-stage-infrastructure').click();
      await expect(smoke(page, 'appraisals-infrastructure')).toBeVisible();
      await smoke(page, 'appraisals-infrastructure-rate-add').selectOption({ index: 1 });
      await smoke(page, 'appraisals-house-stage-plot-works').click();
      await expect(smoke(page, 'appraisals-plot-works')).toBeVisible();
      await smoke(page, 'appraisals-plot-works-rate-add').selectOption({ index: 1 });
      await smoke(page, 'appraisals-commercial-switch').click();
      await smoke(page, 'appraisals-new').click();
      await expect(smoke(page, 'appraisals-new-setup-drawer')).toBeVisible();
      await smoke(page, 'appraisals-new-name').fill('Release smoke commercial appraisal');
      await smoke(page, 'appraisals-new-create').click();
      await expect(smoke(page, 'appraisals-commercial-workspace')).toBeVisible();

      await smoke(page, 'rail-settings').click();
      await expect(smoke(page, 'settings-workspace')).toBeVisible();
      await expect(smoke(page, 'appraisals-workspace')).toBeHidden();
      await expect(smoke(page, 'sticky-bill-totals')).toBeHidden();

      await smoke(page, 'rail-roadmap').click();
      await expect(smoke(page, 'roadmap-workspace')).toBeVisible();
      await expect(smoke(page, 'settings-workspace')).toBeHidden();
      await expectScrollableSmoke(page, 'roadmap-workspace');

      await smoke(page, 'rail-home').click();
      await expect(smoke(page, 'roadmap-workspace')).toBeHidden();
      await expect(smoke(page, 'open-active-project')).toBeVisible();
      await smoke(page, 'open-active-project').click();

      await expect(smoke(page, 'bill-workspace')).toBeVisible();
      await expect(smoke(page, 'sticky-bill-totals')).toBeHidden();
      await page.getByRole('button', { name: 'Show bill and project totals' }).click();
      await expect(smoke(page, 'sticky-bill-totals')).toBeVisible();

      await smoke(page, 'bill-workspace').click({ button: 'right', position: { x: 260, y: 240 } });
      await expect(smoke(page, 'context-menu')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(smoke(page, 'context-menu')).toBeHidden();

      await smoke(page, 'rail-appraisals').click();
      await expect(smoke(page, 'appraisals-workspace')).toBeVisible();
      await expect(smoke(page, 'sticky-bill-totals')).toBeHidden();

      await smoke(page, 'rail-library').click();
      await expect(smoke(page, 'library-workspace')).toBeVisible();
      await expect(smoke(page, 'appraisals-workspace')).toBeHidden();
      await expect(smoke(page, 'sticky-bill-totals')).toBeHidden();

      await smoke(page, 'rail-tender').click();
      await expect(smoke(page, 'tender-workspace')).toBeVisible();
      await expect(smoke(page, 'library-workspace')).toBeHidden();
      await expect(smoke(page, 'sticky-bill-totals')).toBeHidden();

      await smoke(page, 'rail-reports').click();
      await expect(smoke(page, 'reports-workspace')).toBeVisible();
      await expect(smoke(page, 'tender-workspace')).toBeHidden();
      await expect(smoke(page, 'sticky-bill-totals')).toBeHidden();

      await smoke(page, 'rail-audits').click();
      await expect(smoke(page, 'audits-workspace')).toBeVisible();
      await expect(smoke(page, 'reports-workspace')).toBeHidden();
      await expect(smoke(page, 'sticky-bill-totals')).toBeHidden();

      await smoke(page, 'rail-roadmap').click();
      await expect(smoke(page, 'roadmap-workspace')).toBeVisible();
      await expect(smoke(page, 'audits-workspace')).toBeHidden();
      await expectScrollableSmoke(page, 'roadmap-workspace');

      await smoke(page, 'rail-estimate').click();
      await expect(smoke(page, 'bill-workspace')).toBeVisible();
      await expect(smoke(page, 'roadmap-workspace')).toBeHidden();
      await expect(smoke(page, 'sticky-bill-totals')).toBeHidden();
      await expect(page.getByRole('button', { name: 'Show bill and project totals' })).toBeVisible();
    });
  }
});
