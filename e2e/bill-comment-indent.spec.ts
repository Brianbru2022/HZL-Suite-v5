import { expect, test } from '@playwright/test';
import { openSeededBillWorkspace, seededProject } from './support/workspaceSeed';

for (const rowCount of [5, 55]) {
  test(`comment aligns with H3 in a ${rowCount}-row bill section`, async ({ page }) => {
    const rows = [
      { id: 'e2e-indent-h3', type: 'SUB_SECTION', reference: '', description: 'Vertical tanking and damp proofing', unit: '', quantity: 0, rate: 0, total: 0 },
      { id: 'e2e-indent-comment', type: 'COMMENT', reference: '', description: 'Lay mastic asphalt tanking', unit: '', quantity: 0, rate: 0, total: 0 },
      ...Array.from({ length: rowCount - 2 }, (_, index) => ({ id: `e2e-indent-item-${index}`, type: 'PRICED', reference: String(index + 1), description: '12 mm thick', unit: 'm2', quantity: 1, rate: 0, total: 0 })),
    ];
    const project = {
      ...seededProject,
      bills: seededProject.bills.map((bill) => ({
        ...bill,
        sections: bill.sections.map((section) => ({ ...section, items: rows })),
      })),
    };
    await openSeededBillWorkspace(page, { project });
    const textStart = async (rowId: string) => page.locator(`[data-bill-row-id="${rowId}"] [data-bill-description] > div > div`).evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return rect.left + Number.parseFloat(window.getComputedStyle(node).paddingLeft);
    });
    await expect(page.locator('[data-bill-row-id="e2e-indent-h3"]')).toBeVisible();
    await expect(page.locator('[data-bill-row-id="e2e-indent-comment"]')).toBeVisible();
    expect(Math.abs((await textStart('e2e-indent-h3')) - (await textStart('e2e-indent-comment')))).toBeLessThanOrEqual(1);
  });
}
