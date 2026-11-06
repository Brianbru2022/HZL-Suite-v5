import { expect, test } from '@playwright/test';
import { openSeededBillWorkspace } from './support/workspaceSeed';

test('bill rows support single, Ctrl and Shift range selection', async ({ page }) => {
  await openSeededBillWorkspace(page);
  const heading = page.locator('[data-bill-row-id="e2e-revision-heading"]');
  const item = page.locator('[data-bill-row-id="e2e-revision-item"]');
  const provisionalSum = page.locator('[data-bill-row-id="e2e-revision-ps"]');
  const selected = (row: typeof heading) => row.locator('[data-bill-select-row]');

  await heading.locator('[data-bill-description]').click();
  await expect(selected(heading)).toHaveAttribute('aria-pressed', 'true');
  await expect(selected(item)).toHaveAttribute('aria-pressed', 'false');

  await provisionalSum.locator('[data-bill-description]').click({ modifiers: ['Control'] });
  await expect(selected(heading)).toHaveAttribute('aria-pressed', 'true');
  await expect(selected(provisionalSum)).toHaveAttribute('aria-pressed', 'true');

  await heading.locator('[data-bill-description]').click({ modifiers: ['Shift'] });
  await expect(selected(heading)).toHaveAttribute('aria-pressed', 'true');
  await expect(selected(item)).toHaveAttribute('aria-pressed', 'true');
  await expect(selected(provisionalSum)).toHaveAttribute('aria-pressed', 'true');

  await item.locator('[data-bill-description]').click();
  await expect(selected(heading)).toHaveAttribute('aria-pressed', 'false');
  await expect(selected(item)).toHaveAttribute('aria-pressed', 'true');
  await expect(selected(provisionalSum)).toHaveAttribute('aria-pressed', 'false');
});
