import { expect, test } from '@playwright/test';
import { seededLibrary, seededProject, seededTrades, storageKeys } from './support/workspaceSeed';

test('clicking a bill-level row opens the bill inspector instead of the full editor', async ({ page }) => {
  const billLevelProject = {
    ...seededProject,
    id: 'e2e-bill-level-project',
    name: 'Bill Level E2E Project',
    bills: [
      {
        id: 'e2e-bill-level-bill',
        name: 'Bill level rows',
        sections: [],
        items: [
          {
            id: 'e2e-bill-level-heading',
            type: 'GENERAL_HEADING',
            reference: '',
            description: 'Bill level heading',
            unit: '',
            quantity: 0,
            quantityDecimals: 0,
            rate: 0,
            total: 0,
          },
          {
            id: 'e2e-bill-level-item',
            type: 'PRICED',
            reference: 'B.1',
            description: 'Bill level priced item',
            unit: 'nr',
            quantity: 1,
            quantityDecimals: 0,
            rate: 0,
            total: 0,
          },
        ],
      },
    ],
  };

  await page.addInitScript(({ keys, project, library, trades }) => {
    window.localStorage.clear();
    window.localStorage.setItem(keys.theme, 'light');
    window.localStorage.setItem(keys.projects, JSON.stringify([project]));
    window.localStorage.setItem(keys.libraries, JSON.stringify([library]));
    window.localStorage.setItem(keys.trades, JSON.stringify(trades));
    window.localStorage.setItem(keys.appraisals, JSON.stringify([]));
    window.localStorage.setItem(keys.appraisalHouseTypes, JSON.stringify([]));
    window.localStorage.setItem(keys.appraisalRates, JSON.stringify([]));
    window.localStorage.setItem(keys.spellcheck, JSON.stringify({ enabled: true, language: 'en-GB' }));
  }, {
    keys: storageKeys,
    project: billLevelProject,
    library: seededLibrary,
    trades: seededTrades,
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect.poll(async () => page.evaluate((key) => {
    const projects = JSON.parse(window.localStorage.getItem(key) || '[]');
    return projects[0]?.name;
  }, storageKeys.projects)).toBe('Bill Level E2E Project');

  await page.locator('[data-smoke="home-workspace"]').waitFor({ state: 'visible' });
  await page.locator('[data-smoke="open-active-project"]').click();
  await expect(page.locator('[data-smoke="bill-workspace"]')).toBeVisible();

  await page.locator('[data-bill-row-id="e2e-bill-level-heading"] button[aria-label^="Open"]').first().click();

  await expect(page.locator('[data-smoke="bill-inspector"]')).toBeVisible();
  await expect(page.locator('[data-smoke="item-editor-modal"]')).toBeHidden();
  await expect(page.locator('[data-smoke="bill-inspector"]')).toContainText('General heading');

  await page.locator('[data-bill-row-id="e2e-bill-level-item"] button[aria-label^="Open"]').first().click();

  const rateInput = page.getByLabel('Rate in GBP');
  await expect(rateInput).toBeVisible();
  await expect(rateInput).toHaveValue('');
  await expect(rateInput).toHaveAttribute('placeholder', '0');

  await rateInput.fill('0');
  await expect(rateInput).toHaveValue('0');
  await rateInput.blur();
  await expect(rateInput).toHaveValue('');
});

test('a heading-only section remains visible when switching to a second bill', async ({ page }) => {
  const twoBillProject = {
    ...seededProject,
    id: 'e2e-two-bill-project',
    name: 'Two Bill E2E Project',
    bills: [
      seededProject.bills[0],
      {
        id: 'e2e-second-bill',
        name: 'Second bill',
        sections: [
          {
            id: 'e2e-second-section',
            name: 'Second bill headings',
            items: [
              {
                id: 'e2e-second-heading',
                type: 'GENERAL_HEADING',
                reference: '',
                description: 'Second bill header',
                unit: '',
                quantity: 0,
                quantityDecimals: 0,
                rate: 0,
                total: 0,
              },
            ],
          },
        ],
      },
    ],
  };

  await page.addInitScript(({ keys, project, library, trades }) => {
    window.localStorage.clear();
    window.localStorage.setItem(keys.theme, 'light');
    window.localStorage.setItem(keys.projects, JSON.stringify([project]));
    window.localStorage.setItem(keys.libraries, JSON.stringify([library]));
    window.localStorage.setItem(keys.trades, JSON.stringify(trades));
    window.localStorage.setItem(keys.appraisals, JSON.stringify([]));
    window.localStorage.setItem(keys.appraisalHouseTypes, JSON.stringify([]));
    window.localStorage.setItem(keys.appraisalRates, JSON.stringify([]));
    window.localStorage.setItem(keys.spellcheck, JSON.stringify({ enabled: true, language: 'en-GB' }));
  }, {
    keys: storageKeys,
    project: twoBillProject,
    library: seededLibrary,
    trades: seededTrades,
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await page.locator('[data-smoke="home-workspace"]').waitFor({ state: 'visible' });
  await page.locator('[data-smoke="open-active-project"]').click();
  await expect(page.locator('[data-smoke="bill-workspace"]')).toBeVisible();

  await page.getByRole('button', { name: 'Select or reorder bill' }).click();
  await page.locator('div').filter({ hasText: /^Second billPosition 2Select/ }).getByRole('button', { name: 'Select' }).click();

  await expect(page.getByRole('heading', { name: 'Second bill', exact: true })).toBeVisible();
  await expect(page.locator('[data-bill-row-id="e2e-second-heading"]')).toBeVisible();
  await expect(page.getByText('Second bill header')).toBeVisible();
});
