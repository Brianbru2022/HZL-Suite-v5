import { expect, test, type Locator } from '@playwright/test';
import { openSeededBillWorkspace, seededLibrary, seededProject } from './support/workspaceSeed';

async function openSeededLibrarySection(panel: Locator) {
  await panel.getByRole('button', { name: 'Open folder A Groundworks' }).click();
  await panel.getByRole('button', { name: 'Open section A10 Excavation' }).click();
}

test('Ctrl+L toggles Standards while plain L remains available for bill input', async ({ page }) => {
  await openSeededBillWorkspace(page);
  const panel = page.locator('[data-standards-insert-panel]');
  const item = page.locator('[data-bill-row-id="e2e-revision-ps"]');
  await item.locator('button[data-bill-inline-field="unit"]').click();
  const unitInput = item.locator('input[data-bill-inline-field="unit"]');
  await unitInput.fill('');
  await unitInput.press('l');
  await expect(unitInput).toHaveValue('l');
  await expect(panel).toHaveCount(0);
  await unitInput.press('Escape');
  await page.keyboard.press('l');
  await expect(panel).toHaveCount(0);
  await page.keyboard.press('Control+l');
  await expect(panel).toBeVisible();
  await page.keyboard.press('Control+l');
  await expect(panel).toHaveCount(0);
});

test('quick add stays open, drags, and follows the selected row', async ({ page }) => {
  await openSeededBillWorkspace(page);
  await page.getByRole('button', { name: 'Open quick add' }).click();
  const palette = page.getByRole('region', { name: 'Quick add bill lines' });
  await expect(palette).toBeVisible();
  const before = await palette.boundingBox();
  const handle = palette.getByText('Quick add', { exact: false });
  const handleBox = await handle.boundingBox();
  await page.mouse.move(handleBox!.x + 30, handleBox!.y + 10);
  await page.mouse.down();
  await page.mouse.move(handleBox!.x - 90, handleBox!.y + 70, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => (await palette.boundingBox())!.x).toBeLessThan(before!.x - 70);
  await page.locator('[data-bill-row-id="e2e-revision-ps"] [data-bill-description]').click();
  await expect(palette).toContainText('After');
  await palette.getByRole('button', { name: 'Add blank H2' }).click();
  await expect(palette).toBeVisible();
  await palette.getByRole('button', { name: 'Close quick add' }).click();
  await expect(palette).toHaveCount(0);
});

test('Ctrl+Q toggles Quick add and its resize handle changes the panel size', async ({ page }) => {
  await openSeededBillWorkspace(page);
  const palette = page.getByRole('region', { name: 'Quick add bill lines' });
  await page.keyboard.press('Control+q');
  await expect(palette).toBeVisible();
  const titleBox = await palette.getByText('Quick add', { exact: false }).boundingBox();
  await page.mouse.move(titleBox!.x + 20, titleBox!.y + 10);
  await page.mouse.down();
  await page.mouse.move(titleBox!.x - 180, titleBox!.y + 10, { steps: 5 });
  await page.mouse.up();
  const before = await palette.boundingBox();
  const handle = palette.getByRole('separator', { name: 'Resize quick add' });
  const handleBox = await handle.boundingBox();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 80, handleBox!.y + handleBox!.height / 2 + 90, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => (await palette.boundingBox())!.width).toBeGreaterThan(before!.width + 60);
  await expect.poll(async () => (await palette.boundingBox())!.height).toBeGreaterThan(before!.height + 70);
  await page.locator('[data-bill-row-id="e2e-revision-item"] [data-bill-description]').click();
  await expect(palette).toBeVisible();
  await palette.getByRole('button', { name: 'Add blank H2' }).click();
  await expect(palette).toBeVisible();
  await page.keyboard.press('Control+q');
  await expect(palette).toHaveCount(0);
  await page.keyboard.press('Control+q');
  await expect(palette).toBeVisible();
  await palette.getByRole('button', { name: 'Close quick add' }).click();
  await expect(palette).toHaveCount(0);
});

test('Ctrl+! opens keyboard shortcuts', async ({ page }) => {
  await openSeededBillWorkspace(page);
  await page.keyboard.press('Control+Shift+1');
  await expect(page.getByRole('dialog', { name: /keyboard shortcuts/i })).toBeVisible();
});

test('double-click edits row fields without a side inspector or row action dots', async ({ page }) => {
  await openSeededBillWorkspace(page);
  const row = page.locator('[data-bill-row-id="e2e-revision-item"]');
  await expect(row.getByRole('button', { name: /^Open actions for/ })).toHaveCount(0);
  await row.locator('[data-bill-description]').dblclick();
  const editor = page.getByRole('dialog', { name: 'Edit bill row fields' });
  await expect(editor).toBeVisible();
  await expect(page.getByText('Selected item', { exact: true })).toHaveCount(0);
  await editor.getByRole('textbox', { name: 'Row description' }).fill('Revised bill item');
  await editor.getByRole('spinbutton', { name: 'Row quantity' }).fill('3');
  await editor.getByRole('spinbutton', { name: 'Row rate' }).fill('10');
  await expect(editor).toContainText('30.00');
  await editor.getByRole('button', { name: 'Save fields' }).click();
  await expect(row).toContainText('Revised bill item');
});

test('bill-level priced item opens detailed specification tools', async ({ page }) => {
  const project = { ...seededProject, bills: seededProject.bills.map((bill) => ({ ...bill, items: bill.sections[0].items, sections: [] })) };
  await openSeededBillWorkspace(page, { project });
  await page.locator('[data-bill-row-id="e2e-revision-item"] [data-bill-description]').dblclick();
  await page.getByRole('dialog', { name: 'Edit bill row fields' }).getByRole('button', { name: 'Open detailed item page' }).click();
  const editor = page.locator('[data-smoke="item-editor-modal"]');
  await expect(editor.getByRole('button', { name: 'Specification finder' })).toBeVisible();
  await expect(editor.getByRole('button', { name: 'Rate/tools' })).toBeVisible();
});

test('row and priced-item arrows navigate in the compact and detailed editors', async ({ page }) => {
  await openSeededBillWorkspace(page);
  await page.locator('[data-bill-row-id="e2e-revision-heading"] [data-bill-description]').dblclick();
  const fields = page.getByRole('dialog', { name: 'Edit bill row fields' });
  await expect(fields.getByRole('textbox', { name: 'Row description' })).toHaveValue('Groundworks');
  await fields.getByRole('button', { name: 'Next priced item' }).click();
  await expect(fields.getByRole('textbox', { name: 'Row description' })).toHaveValue('Excavate reduced levels');
  await fields.getByRole('button', { name: 'Next bill row' }).click();
  await expect(fields.getByRole('textbox', { name: 'Row description' })).toHaveValue('Testing and attendance allowance');
  await fields.getByRole('button', { name: 'Previous priced item' }).click();
  await expect(fields.getByRole('textbox', { name: 'Row description' })).toHaveValue('Excavate reduced levels');
  await fields.getByRole('button', { name: 'Open detailed item page' }).click();
  const detailed = page.locator('[data-smoke="item-editor-modal"]');
  await expect(detailed.locator('textarea').first()).toHaveValue('Excavate reduced levels');
  await expect(detailed.getByText('AI input and review')).toBeVisible();
  await detailed.getByRole('button', { name: 'Next priced item' }).click();
  await expect(detailed.locator('textarea').first()).toHaveValue('Testing and attendance allowance');
  await detailed.getByRole('button', { name: 'Previous bill row' }).click();
  await expect(detailed.locator('textarea').first()).toHaveValue('Excavate reduced levels');
});

test('Ctrl+Up and Ctrl+Down reorder a selected bill row without affecting field input', async ({ page }) => {
  await openSeededBillWorkspace(page);
  const rows = page.locator('[data-bill-row-id]');
  const order = () => rows.evaluateAll((elements) => elements.map((element) => element.getAttribute('data-bill-row-id')));
  await page.locator('[data-bill-row-id="e2e-revision-item"] [data-bill-description]').click();
  await page.keyboard.press('Control+ArrowDown');
  await expect.poll(order).toEqual(['e2e-revision-heading', 'e2e-revision-ps', 'e2e-revision-item']);
  await page.keyboard.press('Control+ArrowUp');
  await expect.poll(order).toEqual(['e2e-revision-heading', 'e2e-revision-item', 'e2e-revision-ps']);
  await page.locator('[data-bill-row-id="e2e-revision-item"] [data-bill-description]').dblclick();
  const description = page.getByRole('dialog', { name: 'Edit bill row fields' }).getByRole('textbox', { name: 'Row description' });
  await description.press('Control+ArrowDown');
  await expect.poll(order).toEqual(['e2e-revision-heading', 'e2e-revision-item', 'e2e-revision-ps']);
});

test('plain Up and Down move the selection without reordering rows', async ({ page }) => {
  await openSeededBillWorkspace(page);
  const rows = page.locator('[data-bill-row-id]');
  const order = () => rows.evaluateAll((elements) => elements.map((element) => element.getAttribute('data-bill-row-id')));
  await page.locator('[data-bill-row-id="e2e-revision-item"] [data-bill-description]').click();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-bill-insert-anchor="true"]')).toHaveAttribute('data-bill-row-id', 'e2e-revision-ps');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('[data-bill-insert-anchor="true"]')).toHaveAttribute('data-bill-row-id', 'e2e-revision-item');
  await expect.poll(order).toEqual(['e2e-revision-heading', 'e2e-revision-item', 'e2e-revision-ps']);
});

test('bill header wraps and section navigation remains available on a narrow screen', async ({ page }) => {
  const secondSection = { id: 'e2e-second-section', name: 'Finishes', items: [
    { id: 'e2e-finishes-item', type: 'PRICED', reference: 'B.1', description: 'Paint walls', unit: 'm2', quantity: 10, rate: 5, total: 50 },
  ] };
  const project = { ...seededProject, bills: seededProject.bills.map((bill) => ({ ...bill, sections: [...bill.sections, secondSection] })) };
  await page.setViewportSize({ width: 760, height: 820 });
  await openSeededBillWorkspace(page, { project });
  const sectionPicker = page.getByRole('combobox', { name: 'Jump to bill section' });
  await expect(sectionPicker).toBeVisible();
  await sectionPicker.selectOption('e2e-second-section');
  await expect(sectionPicker).toHaveValue('e2e-second-section');
  const structure = page.getByRole('button', { name: /Structure/i }).first();
  await expect(structure).toBeVisible();
  const box = await structure.boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(760);
});

test('bill and section both expose clear rates and quantities', async ({ page }) => {
  await openSeededBillWorkspace(page);
  const billClear = page.getByRole('button', { name: 'Clear values' }).first();
  const sectionClear = page.getByRole('button', { name: 'Clear values' }).nth(1);
  await expect(billClear).toBeVisible();
  await expect(sectionClear).toBeVisible();
  await sectionClear.click();
  await page.getByRole('menuitem', { name: /Clear rates only/ }).click();
  await page.getByRole('dialog', { name: /Clear rates in section/i }).getByRole('button', { name: 'Clear values' }).click();
  const row = page.locator('[data-bill-row-id="e2e-revision-item"]');
  await expect(row.getByRole('button', { name: /rate/i })).toContainText('0.00');
  await billClear.click();
  await expect(page.getByRole('menuitem', { name: /Clear quantities only/ })).toBeVisible();
});

test('Standards panel docks on either side of the bill and remembers its side', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await openSeededBillWorkspace(page);
  await page.getByRole('button', { name: 'Standards', exact: true }).click();
  const panel = page.locator('[data-standards-insert-panel]');
  const bill = page.locator('[data-smoke="bill-workspace"]');
  await page.getByRole('button', { name: 'Dock Standards left' }).click();
  await expect(panel).toHaveAttribute('data-panel-mode', 'docked-left');
  expect((await panel.boundingBox())!.x + (await panel.boundingBox())!.width).toBeLessThanOrEqual((await bill.boundingBox())!.x);
  const leftWidth = (await panel.boundingBox())!.width;
  const leftHandle = await page.getByRole('button', { name: 'Resize mini library panel' }).boundingBox();
  await page.mouse.move(leftHandle!.x + 4, leftHandle!.y + leftHandle!.height / 2);
  await page.mouse.down();
  await page.mouse.move(leftHandle!.x + 74, leftHandle!.y + leftHandle!.height / 2, { steps: 4 });
  await page.mouse.up();
  await expect.poll(async () => (await panel.boundingBox())!.width).toBeGreaterThan(leftWidth + 40);
  await page.getByRole('button', { name: 'Dock Standards right' }).click();
  await expect(panel).toHaveAttribute('data-panel-mode', 'docked-right');
  expect((await panel.boundingBox())!.x).toBeGreaterThanOrEqual((await bill.boundingBox())!.x + (await bill.boundingBox())!.width);
  const rightWidth = (await panel.boundingBox())!.width;
  const rightHandle = await page.getByRole('button', { name: 'Resize mini library panel' }).boundingBox();
  await page.mouse.move(rightHandle!.x + 4, rightHandle!.y + rightHandle!.height / 2);
  await page.mouse.down();
  await page.mouse.move(rightHandle!.x - 66, rightHandle!.y + rightHandle!.height / 2, { steps: 4 });
  await page.mouse.up();
  await expect.poll(async () => (await panel.boundingBox())!.width).toBeGreaterThan(rightWidth + 40);
  await page.getByRole('button', { name: 'Close standards insert' }).click();
  await page.getByRole('button', { name: 'Standards', exact: true }).click();
  await expect(panel).toHaveAttribute('data-panel-mode', 'docked-right');
  await page.getByRole('button', { name: 'Float Standards panel' }).click();
  await expect(panel).toHaveAttribute('data-panel-mode', 'floating');
});

test('selected-row actions stay collapsed and centre within the bill beside docked Standards', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await openSeededBillWorkspace(page);
  await page.locator('[data-bill-row-id="e2e-revision-item"] button[aria-pressed="false"]').first().click();
  const trigger = page.getByRole('button', { name: /selected bill rows/i });
  const actions = page.getByRole('toolbar', { name: 'Selected bill row actions' });
  const bill = page.locator('[data-smoke="bill-workspace"]');
  await expect(trigger).toBeVisible();
  await expect(actions).toHaveCount(0);
  await page.getByRole('button', { name: 'Standards', exact: true }).click();
  await page.getByRole('button', { name: 'Dock Standards left' }).click();
  await trigger.hover();
  await expect(actions).toBeVisible();
  await expect.poll(async () => {
    const billBox = await bill.boundingBox();
    const actionsBox = await actions.boundingBox();
    return Boolean(billBox && actionsBox && actionsBox.x >= billBox.x - 2 && actionsBox.x + actionsBox.width <= billBox.x + billBox.width + 2);
  }).toBe(true);
  await page.mouse.move(800, 150);
  await expect(actions).toHaveCount(0);
  await trigger.click();
  await page.mouse.move(800, 150);
  await expect(actions).toBeVisible();
  await page.getByRole('button', { name: 'Dock Standards right' }).click();
  await expect.poll(async () => {
    const billBox = await bill.boundingBox();
    const actionsBox = await actions.boundingBox();
    return Boolean(billBox && actionsBox && actionsBox.x >= billBox.x - 2 && actionsBox.x + actionsBox.width <= billBox.x + billBox.width + 2);
  }).toBe(true);
});

test('selected-row actions contain the totals toggle and clear quantities', async ({ page }) => {
  await openSeededBillWorkspace(page);
  await expect(page.getByTestId('restore-sticky-bill-totals')).toBeVisible();
  await page.locator('[data-bill-row-id="e2e-revision-item"] button[aria-pressed="false"]').first().click();
  await expect(page.getByTestId('restore-sticky-bill-totals')).toHaveCount(0);
  await page.getByRole('button', { name: /selected bill rows/i }).click();
  const actions = page.getByRole('toolbar', { name: 'Selected bill row actions' });
  await expect(actions.getByRole('button', { name: 'Add row' })).toHaveCount(0);
  await expect(actions.getByRole('button', { name: 'Standards' })).toHaveCount(0);
  await expect(actions.getByRole('button', { name: 'Revision point' })).toHaveCount(0);
  await actions.getByRole('button', { name: 'Show totals' }).click();
  await expect(page.getByTestId('sticky-bill-totals')).toBeVisible();
  await actions.getByRole('button', { name: 'Hide totals' }).click();
  await expect(page.getByTestId('sticky-bill-totals')).toHaveCount(0);
  await actions.getByRole('button', { name: 'Clear quantities' }).click();
  await page.getByRole('dialog', { name: /Clear quantities on selected rows/i }).getByRole('button', { name: 'Clear values' }).click();
  await expect(page.locator('[data-bill-row-id="e2e-revision-item"] button[data-bill-inline-field="quantity"]')).toContainText('0');
});

test('Duplicate and Ctrl+C copy rows, then Paste and Ctrl+V insert after one selected row', async ({ page }) => {
  await openSeededBillWorkspace(page);
  const heading = page.locator('[data-bill-row-id="e2e-revision-heading"]');
  const priced = page.locator('[data-bill-row-id="e2e-revision-item"]');
  const target = page.locator('[data-bill-row-id="e2e-revision-ps"]');
  await heading.locator('button[aria-pressed="false"]').first().click();
  await priced.locator('button[aria-pressed="false"]').first().click();
  await page.getByRole('button', { name: /selected bill rows/i }).click();
  const actions = page.getByRole('toolbar', { name: 'Selected bill row actions' });
  await actions.getByRole('button', { name: 'Duplicate' }).click();
  await expect(page.locator('[data-bill-row-id]')).toHaveCount(3);
  await expect(actions).toHaveCount(0);
  await page.keyboard.press('Control+v');
  await expect(page.locator('[data-bill-row-id]')).toHaveCount(3);
  await target.locator('button[aria-pressed="false"]').first().click();
  await page.keyboard.press('Control+v');
  await expect(page.locator('[data-bill-row-id]')).toHaveCount(5);
  const descriptions = await page.locator('[data-bill-row-id] [data-bill-description]').allTextContents();
  expect(descriptions.map((value) => value.trim())).toEqual([
    'Groundworks', 'Excavate reduced levels', 'Testing and attendance allowance',
    'Groundworks', 'Excavate reduced levels',
  ]);
  await page.locator('[data-bill-row-id="e2e-revision-heading"] button[aria-pressed="false"]').first().click();
  await page.keyboard.press('Control+c');
  await page.locator('[data-bill-row-id="e2e-revision-ps"] button[aria-pressed="false"]').first().click();
  await page.getByRole('button', { name: /selected bill rows/i }).click();
  await actions.getByRole('button', { name: /Paste 1/ }).click();
  await expect(page.locator('[data-bill-row-id]')).toHaveCount(6);
});

test('Delete removes selected rows after confirmation but leaves focused inputs alone', async ({ page }) => {
  await openSeededBillWorkspace(page);
  const row = page.locator('[data-bill-row-id="e2e-revision-item"]');
  await row.locator('button[aria-pressed="false"]').first().click();
  await row.locator('button[data-bill-inline-field="unit"]').click();
  const unit = row.locator('input[data-bill-inline-field="unit"]');
  await unit.fill('m3x');
  await unit.press('Delete');
  await expect(page.getByRole('dialog', { name: 'Delete selected rows' })).toHaveCount(0);
  await unit.press('Escape');
  await page.locator('[data-smoke="bill-workspace"]').focus();
  await page.keyboard.press('Delete');
  const confirm = page.getByRole('dialog', { name: 'Delete selected rows' });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Delete rows' }).click();
  await expect(row).toHaveCount(0);
});

test('Delete removes selected headings and priced rows together', async ({ page }) => {
  await openSeededBillWorkspace(page);
  await page.locator('[data-bill-row-id="e2e-revision-heading"] button[aria-pressed="false"]').first().click();
  await page.locator('[data-bill-row-id="e2e-revision-item"] button[aria-pressed="false"]').first().click();
  await page.keyboard.press('Delete');
  await page.getByRole('dialog', { name: 'Delete selected rows' }).getByRole('button', { name: 'Delete rows' }).click();
  await expect(page.locator('[data-bill-row-id="e2e-revision-heading"]')).toHaveCount(0);
  await expect(page.locator('[data-bill-row-id="e2e-revision-item"]')).toHaveCount(0);
  await expect(page.locator('[data-bill-row-id="e2e-revision-ps"]')).toBeVisible();
});

for (const scope of ['bill-level', 'paged'] as const) {
  test(`copied rows paste after a destination in a ${scope} bill`, async ({ page }) => {
    const sourceBill = seededProject.bills[0];
    const sourceSection = sourceBill.sections[0];
    const project = {
      ...seededProject,
      bills: [{
        ...sourceBill,
        items: scope === 'bill-level' ? sourceSection.items : [],
        sections: scope === 'paged' ? [{
          ...sourceSection,
          items: [],
          pages: [{ id: 'e2e-copy-page', name: 'Page 1', items: sourceSection.items }],
        }] : [],
      }],
    };
    await openSeededBillWorkspace(page, { project });
    await page.locator('[data-bill-row-id="e2e-revision-item"] button[aria-pressed="false"]').first().click();
    await page.keyboard.press('Control+c');
    await page.locator('[data-bill-row-id="e2e-revision-ps"] button[aria-pressed="false"]').first().click();
    await page.keyboard.press('Control+v');
    await expect(page.locator('[data-bill-row-id]')).toHaveCount(4);
    const descriptions = await page.locator('[data-bill-row-id] [data-bill-description]').allTextContents();
    expect(descriptions.map((value) => value.trim())).toEqual([
      'Groundworks', 'Excavate reduced levels', 'Testing and attendance allowance', 'Excavate reduced levels',
    ]);
  });
}

test('Standards folders are visually distinct from their sections', async ({ page }) => {
  await openSeededBillWorkspace(page);
  await page.getByRole('button', { name: 'Standards', exact: true }).click();
  const panel = page.locator('[data-standards-insert-panel]');
  const folder = panel.getByRole('button', { name: 'Open folder A Groundworks' });
  await expect(folder).toHaveCSS('text-transform', 'uppercase');
  await folder.click();
  const section = panel.getByRole('button', { name: 'Open section A10 Excavation' });
  await expect(section).toHaveCSS('text-transform', 'none');
});

test('collapsing an unsectioned bill hides its rows until expanded', async ({ page }) => {
  const project = {
    ...seededProject,
    bills: seededProject.bills.map((bill) => ({
      ...bill,
      items: bill.sections[0].items,
      sections: [],
    })),
  };
  await openSeededBillWorkspace(page, { project });
  const row = page.locator('[data-bill-row-id="e2e-revision-heading"]');
  await expect(row).toBeVisible();
  await page.getByRole('button', { name: 'Collapse bill' }).click();
  await expect(row).toHaveCount(0);
  await page.getByRole('button', { name: 'Expand bill' }).click();
  await expect(row).toBeVisible();
});

test('collapsing a heading or section hides the rows beneath it', async ({ page }) => {
  await openSeededBillWorkspace(page);
  const heading = page.locator('[data-bill-row-id="e2e-revision-heading"]');
  const priced = page.locator('[data-bill-row-id="e2e-revision-ps"]');
  await expect(priced).toBeVisible();
  await heading.getByRole('button', { name: 'Collapse heading' }).click();
  await expect(priced).toHaveCount(0);
  await heading.getByRole('button', { name: 'Expand heading' }).click();
  await expect(priced).toBeVisible();
  await page.getByRole('button', { name: 'Collapse section' }).click();
  await expect(heading).toHaveCount(0);
  await page.getByRole('button', { name: 'Expand section' }).click();
  await expect(heading).toBeVisible();
});

test('bill rows use the available width and select an insertion anchor without a floating control', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await openSeededBillWorkspace(page);
  const workspace = page.locator('[data-smoke="bill-workspace"]');
  const heading = page.locator('[data-bill-row-id="e2e-revision-heading"]');
  const priced = page.locator('[data-bill-row-id="e2e-revision-ps"]');
  await priced.locator('[data-bill-description]').click();
  await expect(priced).toHaveAttribute('data-bill-insert-anchor', 'true');
  await expect(page.getByRole('button', { name: 'Add below this row' })).toHaveCount(0);

  const headingIndent = await heading.locator('.font-bill-aptos-narrow').evaluate((element) => parseFloat(getComputedStyle(element).paddingLeft));
  const pricedIndent = await priced.locator('.font-bill-aptos-narrow').evaluate((element) => parseFloat(getComputedStyle(element).paddingLeft));
  expect(pricedIndent).toBeGreaterThan(headingIndent);

  const wideWidth = (await workspace.boundingBox())!.width;
  await page.setViewportSize({ width: 1250, height: 900 });
  await expect.poll(async () => (await workspace.boundingBox())!.width).toBeLessThan(wideWidth - 200);
  const descriptionCell = priced.locator('td').nth(2);
  const description = descriptionCell.locator('.font-bill-aptos-narrow');
  const cellBox = await descriptionCell.boundingBox();
  const descriptionBox = await description.boundingBox();
  expect(descriptionBox!.width).toBeGreaterThan(cellBox!.width - 140);
});

test('compact bill quick-add and structure menu save to the active project', async ({ page }) => {
  await openSeededBillWorkspace(page);
  const bill = page.locator('[data-smoke="bill-workspace"]');
  await expect(bill).toHaveAttribute('data-bill-density', 'compact');
  const defaultHeading = page.locator('[data-bill-row-id="e2e-revision-heading"]');
  await expect(defaultHeading).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(defaultHeading.locator('.font-bill-aptos-narrow')).toHaveCSS('color', 'rgb(0, 0, 0)');
  await expect(defaultHeading.locator('.font-bill-aptos-narrow')).toHaveCSS('text-transform', 'uppercase');
  await page.getByRole('button', { name: 'Switch to comfortable bill rows' }).click();
  await expect(bill).toHaveAttribute('data-bill-density', 'comfortable');
  await page.getByRole('button', { name: 'Switch to compact bill rows' }).click();
  await expect(bill).toHaveAttribute('data-bill-density', 'compact');

  await bill.click({ button: 'right', position: { x: 320, y: 36 } });
  await page.getByRole('menuitem', { name: 'Add and name…' }).click();
  await page.getByRole('combobox', { name: 'New bill line type' }).selectOption('SUB_SECTION');
  await page.getByRole('textbox', { name: 'New bill line description' }).fill('Cancelled heading');
  await page.keyboard.press('Escape');
  await expect(page.getByText('Cancelled heading')).toHaveCount(0);

  await page.locator('[data-bill-row-id="e2e-revision-ps"] [data-bill-description]').click();
  await page.getByRole('button', { name: 'Open quick add' }).click();
  await page.getByRole('button', { name: 'Name H3' }).click();
  await page.getByRole('textbox', { name: 'New bill line description' }).fill('Quick heading below item');
  await page.getByRole('button', { name: 'Add', exact: true }).last().click();
  await expect(page.locator('[data-bill-row-id]').filter({ hasText: 'Quick heading below item' })).toBeVisible();

  const inserted = page.locator('[data-bill-row-id]').filter({ hasText: 'Quick heading below item' });
  await inserted.locator('[data-bill-description]').dblclick();
  const fieldEditor = page.getByRole('dialog', { name: 'Edit bill row fields' });
  await expect(fieldEditor).toBeVisible();
  await fieldEditor.getByRole('button', { name: 'Open detailed item page' }).click();
  const editor = page.locator('[data-smoke="item-editor-modal"]');
  await expect(editor).toBeVisible();
  await expect(editor.getByRole('button', { name: 'AI refine draft' })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Structure' }).click();
  await page.getByRole('button', { name: 'Page', exact: true }).click();
  await expect(page.locator('[data-bill-row-id]').filter({ hasText: 'Quick heading below item' })).toBeVisible();
});

test('trade allocation keeps the bill visible and offers a visible filter reset', async ({ page }) => {
  await openSeededBillWorkspace(page);
  const filter = page.getByRole('combobox', { name: 'Filter bill rows by trade' });
  await expect(filter).toHaveValue('ALL');
  await filter.selectOption('UNASSIGNED');
  const row = page.locator('[data-bill-row-id="e2e-revision-ps"]');
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Unassigned' }).click();
  await page.getByRole('menuitem', { name: 'Assign unassigned to Groundworks' }).click();
  await expect(page.getByText('No rows match this trade filter.')).toBeVisible();
  await page.getByRole('button', { name: 'Show all rows' }).click();
  await expect(filter).toHaveValue('ALL');
  await expect(row).toBeVisible();
});

for (const layout of ['bill-level', 'paged'] as const) {
  test(`last trade allocation preserves ${layout} bill structure`, async ({ page }) => {
    const project = {
      ...seededProject,
      bills: seededProject.bills.map((bill) => layout === 'bill-level'
        ? { ...bill, items: bill.sections[0].items, sections: [] }
        : { ...bill, sections: bill.sections.map((section) => ({ ...section, items: [], pages: [{ id: 'e2e-page', name: 'Page 1', items: section.items }] })) }),
    };
    await openSeededBillWorkspace(page, { project });
    const filter = page.getByRole('combobox', { name: 'Filter bill rows by trade' });
    await filter.selectOption('UNASSIGNED');
    const row = page.locator('[data-bill-row-id="e2e-revision-ps"]');
    await row.getByRole('button', { name: 'Unassigned' }).click();
    await page.getByRole('menuitem', { name: 'Assign unassigned to Groundworks' }).click();
    await expect(page.getByText('No rows match this trade filter.')).toBeVisible();
    await page.getByRole('button', { name: 'Show all rows' }).click();
    await expect(row).toBeVisible();
    await expect(filter).toHaveValue('ALL');
  });
}

test('Ctrl+number adds blank rows and typing names a blank row; detailed editing remains available', async ({ page }) => {
  await openSeededBillWorkspace(page);
  const rows = page.locator('[data-bill-row-id]');
  const priced = page.locator('[data-bill-row-id="e2e-revision-item"]');
  await priced.locator('[data-bill-description]').click();
  await expect(priced).toHaveAttribute('data-bill-insert-anchor', 'true');
  const initialCount = await rows.count();
  await page.keyboard.press('Control+1');
  await expect(rows).toHaveCount(initialCount + 1);
  await expect(page.locator('[data-bill-insert-anchor="true"]')).toHaveCount(1);
  await expect(page.locator('[data-bill-insert-anchor="true"]')).toContainText('Heading H1');
  await page.keyboard.type('New heading');
  await expect(page.getByRole('textbox', { name: 'New bill line text' })).toHaveValue('New heading');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-bill-insert-anchor="true"]')).toContainText('New heading');
  await page.keyboard.press('Control+7');
  await expect(rows).toHaveCount(initialCount + 2);
  await priced.locator('button[data-bill-inline-field="quantity"]').click();
  const quantity = priced.locator('input[data-bill-inline-field="quantity"]');
  await quantity.fill('');
  await quantity.press('1');
  await expect(quantity).toHaveValue('1');
  await expect(rows).toHaveCount(initialCount + 2);
  await quantity.press('Escape');
  await priced.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Add Comment (5)' }).click();
  await expect(rows).toHaveCount(initialCount + 3);
  await priced.locator('[data-bill-description]').dblclick();
  const fieldEditor = page.getByRole('dialog', { name: 'Edit bill row fields' });
  await expect(fieldEditor.getByRole('textbox', { name: 'Row description' })).toBeVisible();
  await fieldEditor.getByRole('button', { name: 'Open detailed item page' }).click();
  const editor = page.locator('[data-smoke="item-editor-modal"]');
  await expect(editor).toBeVisible();
  await expect(editor.getByRole('button', { name: 'Rate/tools' })).toBeVisible();
  await editor.getByRole('button', { name: 'Specification finder' }).click();
  await expect(editor.getByText('Product recommendations')).toBeVisible();
  await expect(editor.getByRole('button', { name: 'Refresh research' })).toBeVisible();
});

test('bill pricing moves across cells and down to the next priced row', async ({ page }) => {
  const project = {
    ...seededProject,
    bills: seededProject.bills.map((bill) => ({ ...bill, sections: bill.sections.map((section) => ({
      ...section,
      items: section.items.map((item) => item.id === 'e2e-revision-item' ? { ...item, tradePackageId: undefined } : item),
    })) })),
  };
  await openSeededBillWorkspace(page, { project });
  const first = page.locator('[data-bill-row-id="e2e-revision-item"]');
  await first.locator('button[data-bill-inline-field="quantity"]').click();
  await first.locator('input[data-bill-inline-field="quantity"]').fill('12');
  await page.keyboard.press('Tab');
  await expect(first.locator('input[data-bill-inline-field="unit"]')).toBeFocused();
  await first.locator('input[data-bill-inline-field="unit"]').fill('m2');
  await page.keyboard.press('Tab');
  await expect(first.locator('input[data-bill-inline-field="rate"]')).toBeFocused();
  await first.locator('input[data-bill-inline-field="rate"]').fill('30');
  await page.keyboard.press('Enter');
  const second = page.locator('[data-bill-row-id="e2e-revision-ps"]');
  await expect(second.locator('input[data-bill-inline-field="rate"]')).toBeFocused();
  await expect(first).toContainText('360.00');
  await second.locator('input[data-bill-inline-field="rate"]').fill('999');
  await page.keyboard.press('Escape');
  await expect(second).toContainText('350.00');
});

test('clicking a Standards heading row opens and closes its cascade', async ({ page }) => {
  const baseSection = seededLibrary.folders[0].sections[0];
  const library = { ...seededLibrary, folders: [{ ...seededLibrary.folders[0], sections: [{
    ...baseSection, items: [
      { id: 'heading-earthworks', type: 'GENERAL_HEADING', description: 'Earthworks', unit: '', quantity: 0, rate: 0, total: 0 },
      { id: 'heading-excavation', type: 'MAJOR_HEADING', description: 'Excavation', unit: '', quantity: 0, rate: 0, total: 0 },
    ],
  }] }] };
  await openSeededBillWorkspace(page, { library });
  await page.getByRole('button', { name: 'Standards', exact: true }).click();
  const panel = page.locator('[data-standards-insert-panel]');
  await expect(panel).toHaveClass(/fixed/);
  expect((await panel.boundingBox())?.width).toBeLessThanOrEqual(500);
  await expect(page.getByRole('button', { name: 'Show headings and items' })).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.getByRole('button', { name: 'Open folder A Groundworks' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Open section A10 Excavation' })).toHaveCount(0);
  await openSeededLibrarySection(panel);
  const open = panel.getByRole('button', { name: /^Open Earthworks$/ });
  await expect(open).toBeVisible();
  await expect(open).not.toContainText('H1 heading');
  expect((await open.boundingBox())?.height).toBeLessThan(40);
  await open.click();
  const close = panel.getByRole('button', { name: /^Close Earthworks$/ });
  await expect(close).toHaveAttribute('aria-expanded', 'true');
  await close.focus();
  await page.keyboard.press('Space');
  await expect(open).toHaveAttribute('aria-expanded', 'false');
});

test('Standards browser starts at folders and reveals each heading level in the full docked height', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1200 });
  const section = seededLibrary.folders[0].sections[0];
  const library = {
    ...seededLibrary,
    folders: [{ ...seededLibrary.folders[0], sections: [{
      ...section,
      items: [
        { id: 'h1-a', type: 'GENERAL_HEADING', description: 'Groundworks', unit: '', quantity: 0, rate: 0, total: 0 },
        { id: 'h2-a', type: 'MAJOR_HEADING', description: 'Excavation', unit: '', quantity: 0, rate: 0, total: 0 },
        { id: 'h3-a', type: 'SUB_SECTION', description: 'Strip foundations', unit: '', quantity: 0, rate: 0, total: 0 },
        { id: 'h4-a', type: 'MINOR_HEADING', description: 'Clay excavation', unit: '', quantity: 0, rate: 0, total: 0 },
        { id: 'item-a', type: 'PRICED', description: 'Excavate clay trenches', unit: 'm3', quantity: 1, rate: 20, total: 20 },
        { id: 'h1-b', type: 'GENERAL_HEADING', description: 'Concrete work', unit: '', quantity: 0, rate: 0, total: 0 },
      ],
    }] }],
  };
  await openSeededBillWorkspace(page, { library });
  await page.getByRole('button', { name: 'Standards', exact: true }).click();
  const panel = page.locator('[data-standards-insert-panel]');
  await page.getByRole('button', { name: 'Dock Standards left' }).click();
  const browser = panel.locator('[data-standards-browser-list]');
  await expect.poll(async () => (await browser.boundingBox())!.height).toBeGreaterThan(600);
  await expect(panel.getByRole('button', { name: 'Open folder A Groundworks' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Open Groundworks' })).toHaveCount(0);
  await openSeededLibrarySection(panel);
  await expect(panel.getByRole('button', { name: 'Open Groundworks' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Open Concrete work' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Open Excavation' })).toHaveCount(0);
  await panel.getByRole('button', { name: 'Open Groundworks' }).click();
  await expect(panel.getByRole('button', { name: 'Open Excavation' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Open Strip foundations' })).toHaveCount(0);
  await panel.getByRole('button', { name: 'Open Excavation' }).click();
  await expect(panel.getByRole('button', { name: 'Open Strip foundations' })).toBeVisible();
  await panel.getByRole('button', { name: 'Open Strip foundations' }).click();
  await expect(panel.getByRole('button', { name: 'Open Clay excavation' })).toBeVisible();
  await panel.getByRole('button', { name: 'Open Clay excavation' }).click();
  await expect(panel.getByText('Excavate clay trenches')).toBeVisible();
  await panel.getByRole('button', { name: 'Close Excavation' }).click();
  await expect(panel.getByRole('button', { name: 'Open Strip foundations' })).toHaveCount(0);
  await expect(panel.getByText('Excavate clay trenches')).toHaveCount(0);
  await panel.getByRole('button', { name: 'Open Excavation' }).click();
  await expect(panel.getByRole('button', { name: 'Open Strip foundations' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Open Clay excavation' })).toHaveCount(0);
});

test('Standards cascades from folders through sections to their H1 headings', async ({ page }) => {
  const baseFolder = seededLibrary.folders[0];
  const baseSection = baseFolder.sections[0];
  const library = {
    ...seededLibrary,
    folders: [
      { ...baseFolder, sections: [
        { ...baseSection, id: 'section-a10', orderRef: 'A10', items: [
          { id: 'h1-a10', type: 'GENERAL_HEADING', description: 'Site preparation', unit: '', quantity: 0, rate: 0, total: 0 },
          { id: 'h2-a10', type: 'MAJOR_HEADING', description: 'Clear vegetation', unit: '', quantity: 0, rate: 0, total: 0 },
        ] },
        { ...baseSection, id: 'section-a20', orderRef: 'A20', items: [
          { id: 'h1-a20', type: 'GENERAL_HEADING', description: 'Excavation', unit: '', quantity: 0, rate: 0, total: 0 },
          { id: 'h2-a20', type: 'MAJOR_HEADING', description: 'Strip foundations', unit: '', quantity: 0, rate: 0, total: 0 },
        ] },
      ] },
      { ...baseFolder, id: 'folder-b', orderRef: 'B', name: 'Concrete', sections: [
        { ...baseSection, id: 'section-b10', orderRef: 'B10', items: [
          { id: 'h1-b10', type: 'GENERAL_HEADING', description: 'In situ concrete', unit: '', quantity: 0, rate: 0, total: 0 },
        ] },
      ] },
    ],
  };
  await openSeededBillWorkspace(page, { library });
  await page.getByRole('button', { name: 'Standards', exact: true }).click();
  const panel = page.locator('[data-standards-insert-panel]');
  await expect(panel.getByText('2 folders · open a folder', { exact: false })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Open folder A Groundworks' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Open folder B Concrete' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Open section A10 Excavation' })).toHaveCount(0);
  await panel.getByRole('button', { name: 'Open folder A Groundworks' }).click();
  await expect(panel.getByRole('button', { name: 'Open section A10 Excavation' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Open section A20 Excavation' })).toBeVisible();
  await panel.getByRole('button', { name: 'Open section A20 Excavation' }).click();
  await expect(panel.getByRole('button', { name: 'Open Site preparation' })).toHaveCount(0);
  await expect(panel.getByRole('button', { name: 'Open Excavation' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Open Strip foundations' })).toHaveCount(0);
  await panel.getByRole('button', { name: 'Open Excavation' }).click();
  await expect(panel.getByRole('button', { name: 'Open Strip foundations' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Open folder B Concrete' })).toBeVisible();
  await panel.getByRole('button', { name: 'Close folder A Groundworks' }).click();
  await expect(panel.getByRole('button', { name: 'Open Strip foundations' })).toHaveCount(0);
  await panel.getByRole('button', { name: 'Open folder B Concrete' }).click();
  await panel.getByRole('button', { name: 'Open section B10 Excavation' }).click();
  await expect(panel.getByRole('button', { name: 'Open In situ concrete' })).toBeVisible();
});

test('Standards includes pages and nested sections beneath their parent section', async ({ page }) => {
  const baseSection = seededLibrary.folders[0].sections[0];
  const library = { ...seededLibrary, folders: [{ ...seededLibrary.folders[0], sections: [{
    ...baseSection, items: [],
    pages: [{ id: 'page-one', orderRef: '1', name: 'First page', items: [
      { id: 'page-h1', type: 'GENERAL_HEADING', description: 'Page work', unit: '', quantity: 0, rate: 0, total: 0 },
    ] }],
    subSections: [{ ...baseSection, id: 'section-a10a', orderRef: 'A10a', name: 'Details', items: [
      { id: 'nested-h1', type: 'GENERAL_HEADING', description: 'Nested work', unit: '', quantity: 0, rate: 0, total: 0 },
    ] }],
  }] }] };
  await openSeededBillWorkspace(page, { library });
  await page.getByRole('button', { name: 'Standards', exact: true }).click();
  const panel = page.locator('[data-standards-insert-panel]');
  await openSeededLibrarySection(panel);
  await expect(panel.getByRole('button', { name: 'Open page 1 First page' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Open section A10a Details' })).toBeVisible();
  await panel.getByRole('button', { name: 'Open page 1 First page' }).click();
  await expect(panel.getByRole('button', { name: 'Open Page work' })).toBeVisible();
  await panel.getByRole('button', { name: 'Open section A10a Details' }).click();
  await expect(panel.getByRole('button', { name: 'Open Nested work' })).toBeVisible();
});

test('Standards avoids repeating SMM7 folder and section headings', async ({ page }) => {
  const baseFolder = seededLibrary.folders[0];
  const baseSection = baseFolder.sections[0];
  const library = { ...seededLibrary, folders: [{ ...baseFolder, orderRef: 'D', name: 'Groundwork', sections: [
    { ...baseSection, id: 'd30', orderRef: 'D30', name: 'Piling', items: [
      { id: 'd30-h1', type: 'GENERAL_HEADING', description: 'Groundwork', unit: '', quantity: 0, rate: 0, total: 0 },
      { id: 'd30-h2', type: 'MAJOR_HEADING', description: 'D30 Cast in place concrete piling', unit: '', quantity: 0, rate: 0, total: 0 },
      { id: 'd30-h3', type: 'SUB_SECTION', description: 'General requirements', unit: '', quantity: 0, rate: 0, total: 0 },
    ] },
    { ...baseSection, id: 'd10', orderRef: 'D10', name: 'Site preparation', items: [
      { id: 'd10-h1', type: 'GENERAL_HEADING', description: 'Groundwork', unit: '', quantity: 0, rate: 0, total: 0 },
      { id: 'd10-h2', type: 'MAJOR_HEADING', description: 'D10 Site preparation', unit: '', quantity: 0, rate: 0, total: 0 },
      { id: 'd10-h3', type: 'SUB_SECTION', description: 'Clearing', unit: '', quantity: 0, rate: 0, total: 0 },
    ] },
  ] }] };
  await openSeededBillWorkspace(page, { library });
  await page.getByRole('button', { name: 'Standards', exact: true }).click();
  const panel = page.locator('[data-standards-insert-panel]');
  await panel.getByRole('button', { name: 'Open folder D Groundwork' }).click();
  await panel.getByRole('button', { name: 'Open section D30 Piling' }).click();
  await expect(panel.getByRole('button', { name: 'Open Groundwork' })).toHaveCount(0);
  await expect(panel.getByRole('button', { name: 'Open Cast in place concrete piling' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Open General requirements' })).toHaveCount(0);
  await panel.getByRole('button', { name: 'Open Cast in place concrete piling' }).click();
  await expect(panel.getByRole('button', { name: 'Open General requirements' })).toBeVisible();
  await panel.getByRole('button', { name: 'Open section D10 Site preparation' }).click();
  await expect(panel.getByRole('button', { name: 'Open Clearing' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Open Cast in place concrete piling' })).toHaveCount(0);
});

test('Standards insertion options stay compact and selectable in the docked panel', async ({ page }) => {
  const baseSection = seededLibrary.folders[0].sections[0];
  const library = { ...seededLibrary, folders: [{ ...seededLibrary.folders[0], sections: [{
    ...baseSection, items: [
      { id: 'options-h1', type: 'GENERAL_HEADING', description: 'Groundworks', unit: '', quantity: 0, rate: 0, total: 0 },
      { id: 'options-priced', type: 'PRICED', description: 'Excavate trenches', unit: 'm', quantity: 1, rate: 22, total: 22 },
    ],
  }] }] };
  await openSeededBillWorkspace(page, { library });
  await page.getByRole('button', { name: 'Standards', exact: true }).click();
  const panel = page.locator('[data-standards-insert-panel]');
  await page.getByRole('button', { name: 'Dock Standards left' }).click();
  await openSeededLibrarySection(panel);
  await panel.getByRole('button', { name: 'Excavate trenches' }).click();
  await panel.getByRole('button', { name: 'Insertion options' }).click();
  const modes = panel.getByRole('group', { name: 'Insertion mode' });
  await expect(modes.getByRole('button')).toHaveCount(5);
  expect((await modes.boundingBox())!.height).toBeLessThan(190);
  await modes.getByRole('button', { name: 'Selected row only' }).click();
  await expect(modes.getByRole('button', { name: 'Selected row only' })).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.getByText('Preview 1 row', { exact: false })).toBeVisible();
  await expect(panel.getByRole('combobox')).toHaveCount(2);
  await expect(panel.getByRole('combobox').first()).toBeVisible();
  await expect(panel.getByRole('combobox').last()).toBeVisible();
});

test('Standards section selector follows numeric order references', async ({ page }) => {
  const sections = [
    ['D10', 'Site preparation'], ['D20', 'Excavating and filling'],
    ['D30', 'Piling'], ['D40', 'Groundwork ancillary works'],
    ['D50', 'Underpinning'], ['D31', 'Preformed concrete piling'],
    ['D32', 'Steel piling'], ['D60', 'Ground remediation'],
  ].map(([orderRef, name]) => ({ id: `section-${orderRef}`, orderRef, name, items: [], itemCount: 0, pricedCount: 0 }));
  const library = {
    ...seededLibrary,
    folders: [{ ...seededLibrary.folders[0], sections }],
  };
  await openSeededBillWorkspace(page, { library });
  await page.getByRole('button', { name: 'Standards', exact: true }).click();
  await page.getByRole('button', { name: 'Browse folders and sections' }).click();
  const options = await page.locator('[data-standards-insert-panel] select').nth(1).locator('option').allTextContents();
  expect(options).toEqual([
    'D10 Site preparation', 'D20 Excavating and filling', 'D30 Piling',
    'D31 Preformed concrete piling', 'D32 Steel piling',
    'D40 Groundwork ancillary works', 'D50 Underpinning', 'D60 Ground remediation',
  ]);
});

for (const scenario of [
  { label: 'suggested heading rows', pressCtrl: false, releaseCtrl: false, itemOnly: false },
  { label: 'Item only with Ctrl', pressCtrl: true, releaseCtrl: false, itemOnly: true },
  { label: 'suggested rows when Ctrl is released', pressCtrl: true, releaseCtrl: true, itemOnly: false },
  { label: 'suggested rows when docked left', pressCtrl: false, releaseCtrl: false, itemOnly: false, dockSide: 'left' },
  { label: 'suggested rows when docked right', pressCtrl: false, releaseCtrl: false, itemOnly: false, dockSide: 'right' },
]) {
  test(`Standards drag inserts ${scenario.label}`, async ({ page }) => {
    if ('dockSide' in scenario) await page.setViewportSize({ width: 1600, height: 900 });
    const sourceSection = seededLibrary.folders[0].sections[0];
    const library = {
      ...seededLibrary,
      folders: [{ ...seededLibrary.folders[0], sections: [{
        ...sourceSection,
        items: [
          { id: 'library-unique-heading', type: 'GENERAL_HEADING', reference: '', description: 'Unique library heading', unit: '', quantity: 0, rate: 0, total: 0 },
          { id: 'library-unique-item', type: 'PRICED', reference: 'L.1', description: 'Unique library child', unit: 'nr', quantity: 1, rate: 20, total: 20 },
        ],
      }] }],
    };
    await openSeededBillWorkspace(page, { library });
    await page.getByRole('button', { name: 'Standards', exact: true }).click();
    if ('dockSide' in scenario) await page.getByRole('button', { name: `Dock Standards ${scenario.dockSide}` }).click();
    const panel = page.locator('[data-standards-insert-panel]');
    await openSeededLibrarySection(panel);
    const source = panel.locator('button.cursor-grab').filter({ hasText: 'Unique library heading' });
    await expect(source).toBeVisible();
    const target = page.locator('[data-bill-row-id="e2e-revision-ps"]');
    await target.scrollIntoViewIfNeeded();
    const sourceBox = await source.boundingBox();
    const targetBox = await target.boundingBox();
    expect(sourceBox).not.toBeNull();
    expect(targetBox).not.toBeNull();
    await page.evaluate(() => { (window as any).__standardsDrops = []; window.addEventListener('hzl-library-insert-pointer-drop', (event) => (window as any).__standardsDrops.push((event as CustomEvent).detail)); });
    await page.mouse.move(sourceBox!.x + 40, sourceBox!.y + sourceBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(sourceBox!.x - 30, sourceBox!.y + sourceBox!.height / 2, { steps: 4 });
    if (scenario.pressCtrl) await page.keyboard.down('Control');
    const dropBox = await target.boundingBox();
    expect(dropBox).not.toBeNull();
    await page.mouse.move(dropBox!.x + 75, dropBox!.y + dropBox!.height * 0.75, { steps: 8 });
    if (scenario.releaseCtrl) await page.keyboard.up('Control');
    await page.mouse.up();
    if (scenario.pressCtrl && !scenario.releaseCtrl) await page.keyboard.up('Control');
    await expect.poll(() => page.evaluate(() => (window as any).__standardsDrops.length)).toBe(1);
    await expect(page.getByRole('heading', { name: 'Choose what to insert' })).toBeVisible();
    await expect(page.getByText(/After .*Testing and attendance allowance/)).toBeVisible();
    await page.getByRole('button', { name: scenario.itemOnly ? 'Insert 1 row' : 'Insert 2 rows', exact: true }).click();
    await expect(page.locator('[data-smoke="bill-workspace"]').getByText('Unique library heading')).toBeVisible();
    if (scenario.itemOnly) await expect(page.locator('[data-smoke="bill-workspace"]').getByText('Unique library child')).toHaveCount(0);
    else await expect(page.locator('[data-smoke="bill-workspace"]').getByText('Unique library child')).toBeVisible();
    const order = await page.locator('[data-smoke="bill-workspace"] [data-bill-row-id]').evaluateAll((rows) => rows.flatMap((row) => {
      if (row.getAttribute('data-bill-row-id') === 'e2e-revision-ps') return ['anchor'];
      if (row.textContent?.includes('Unique library heading')) return ['heading'];
      if (row.textContent?.includes('Unique library child')) return ['child'];
      return [];
    }));
    expect(order).toEqual(scenario.itemOnly ? ['anchor', 'heading'] : ['anchor', 'heading', 'child']);
  });
}

test('native Standards drop reads Ctrl from the drop event', async ({ page }) => {
  await openSeededBillWorkspace(page);
  const target = page.locator('[data-bill-row-id="e2e-revision-ps"]');
  await target.scrollIntoViewIfNeeded();
  await target.evaluate((row) => {
    const payload = {
      kind: 'HZL_LIBRARY_INSERT', selectedItemId: 'native-heading', selectedItemType: 'GENERAL_HEADING', defaultMode: 'FROM_HEADING',
      sourceItems: [
        { id: 'native-heading', type: 'GENERAL_HEADING', reference: '', description: 'Native drop heading', unit: '', quantity: 0, rate: 0, total: 0 },
        { id: 'native-child', type: 'PRICED', reference: 'N.1', description: 'Native drop child', unit: 'nr', quantity: 1, rate: 5, total: 5 },
      ],
    };
    const transfer = new DataTransfer();
    transfer.setData('application/x-hzl-library-insert', `HZL_LIBRARY_INSERT:${JSON.stringify(payload)}`);
    const rect = row.getBoundingClientRect();
    row.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, ctrlKey: true, dataTransfer: transfer, clientX: rect.left + 70, clientY: rect.bottom - 2 }));
  });
  await expect(page.getByRole('heading', { name: 'Choose what to insert' })).toBeVisible();
  await expect(page.getByText(/After .*Testing and attendance allowance/)).toBeVisible();
  await page.getByRole('button', { name: 'Insert 1 row', exact: true }).click();
  const bill = page.locator('[data-smoke="bill-workspace"]');
  await expect(bill.getByText('Native drop heading')).toBeVisible();
  await expect(bill.getByText('Native drop child')).toHaveCount(0);
});
