import { expect, test } from '@playwright/test';
import { openSeededBillWorkspace } from './support/workspaceSeed';

test('Ctrl+Z and redo restore a saved bill edit while text fields keep native undo', async ({ page }) => {
  await openSeededBillWorkspace(page);
  const row = page.locator('[data-bill-row-id="e2e-revision-item"]');
  await row.locator('[data-bill-description]').dblclick();
  const editor = page.getByRole('dialog', { name: 'Edit bill row fields' });
  await editor.getByRole('textbox', { name: 'Row description' }).fill('Revised excavation');
  await editor.getByRole('button', { name: 'Save fields' }).click();
  await expect(row).toContainText('Revised excavation');

  await page.locator('[data-smoke="bill-workspace"]').focus();
  await page.keyboard.press('Control+z');
  await expect(row).toContainText('Excavate reduced levels');
  await page.keyboard.press('Control+Shift+z');
  await expect(row).toContainText('Revised excavation');

  await row.locator('[data-bill-description]').dblclick();
  const description = editor.getByRole('textbox', { name: 'Row description' });
  await description.fill('Temporary typing');
  await description.press('Control+z');
  await expect(row).toContainText('Revised excavation');
});

test('Alt+P opens page creation for the current bill section', async ({ page }) => {
  await openSeededBillWorkspace(page);
  await page.keyboard.press('Alt+p');
  await expect(page.getByText('New Page', { exact: true })).toBeVisible();
});
