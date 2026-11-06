import { expect, test } from '@playwright/test';
import { openSeededBillWorkspace, seedWorkspace, seededProject } from './support/workspaceSeed';

async function openDetailedItem(page: import('@playwright/test').Page, quantityDecimals = 0) {
  const project = {
    ...seededProject,
    bills: seededProject.bills.map((bill) => ({
      ...bill,
      sections: bill.sections.map((section) => ({
        ...section,
        items: section.items.map((item) => item.id === 'e2e-revision-item' ? { ...item, quantityDecimals } : item),
      })),
    })),
  };
  await openSeededBillWorkspace(page, { project });
  await page.locator('[data-bill-row-id="e2e-revision-item"] [data-bill-description]').dblclick();
  await page.getByRole('dialog', { name: 'Edit bill row fields' }).getByRole('button', { name: 'Open detailed item page' }).click();
  return page.locator('[data-smoke="item-editor-modal"]');
}

test('rate build-up chooses a fixed category before adding a component', async ({ page }) => {
  const editor = await openDetailedItem(page);
  await editor.getByRole('button', { name: 'Derived' }).click();
  await editor.getByRole('button', { name: 'Add component' }).click();
  const picker = page.getByRole('dialog', { name: 'Choose component category' });
  await expect(picker).toBeVisible();
  await picker.getByRole('button', { name: 'Plant' }).click();
  await expect(picker).toHaveCount(0);
  await expect(editor.getByText('Plant', { exact: true })).toBeVisible();
  await expect(editor.locator('select').filter({ has: page.locator('option', { hasText: 'Plant' }) })).toHaveCount(0);
  await editor.getByRole('button', { name: 'Add component' }).click();
  await picker.getByRole('textbox', { name: 'Custom category name' }).fill('Specialist hire');
  await picker.getByRole('button', { name: 'Add custom' }).click();
  await expect(editor.getByText('Specialist hire', { exact: true })).toBeVisible();
  await editor.getByRole('button', { name: 'Add component' }).click();
  await picker.getByRole('button', { name: 'Plant' }).press('Escape');
  await expect(picker).toHaveCount(0);
  await expect(editor).toBeVisible();
});

test('measurement plus and right-click add blank rows with decimal zero placeholders', async ({ page }) => {
  const editor = await openDetailedItem(page, 2);
  await editor.getByRole('button', { name: 'Quantity' }).click();
  await editor.getByRole('button', { name: 'Add measurement row' }).click();
  const times = editor.locator('input[type="number"][placeholder="0"]').first();
  await expect(times).toHaveValue('');
  await expect(editor.locator('input[type="number"][placeholder="0.00"]').first()).toHaveValue('');
  await editor.getByRole('columnheader', { name: 'Notes' }).click({ button: 'right' });
  await expect(editor.getByText('Rows: 2')).toBeVisible();
  const measurementRows = editor.getByRole('columnheader', { name: 'Times' }).locator('xpath=../../..').locator('tbody tr');
  await expect(measurementRows).toHaveCount(2);
  await expect(measurementRows.nth(1).locator('input[type="number"]').first()).toHaveValue('');
  const firstRowFields = measurementRows.nth(0).locator('input');
  await firstRowFields.nth(0).focus();
  for (let index = 1; index < 5; index += 1) {
    await page.keyboard.press('Tab');
    await expect(firstRowFields.nth(index)).toBeFocused();
  }
  await page.keyboard.press('Tab');
  await expect(measurementRows.nth(1).locator('[data-measurement-times]')).toBeFocused();
  await measurementRows.nth(1).locator('input[placeholder="Location / Ref..."]').focus();
  await page.keyboard.press('Tab');
  await expect(measurementRows).toHaveCount(3);
  await expect(measurementRows.nth(2).locator('[data-measurement-times]')).toBeFocused();
});

test('new estimate opens before its first bill exists', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await seedWorkspace(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-smoke="rail-estimate"]').click();
  await page.locator('[data-smoke="estimate-new-estimate"]').click();
  await page.getByRole('textbox', { name: 'New Project' }).fill('Blank Estimate Regression');
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText('Blank Estimate Regression', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Start the project with a live bill')).toBeVisible();
  expect(pageErrors).toEqual([]);
  await expect(page.getByText('HZL QS Suite could not finish loading')).toHaveCount(0);
});
