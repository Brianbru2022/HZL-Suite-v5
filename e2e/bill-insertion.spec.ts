import { expect, test, type Page } from '@playwright/test';
import LZString from 'lz-string';
import { openSeededBillWorkspace, seedWorkspace, seededProject, storageKeys } from './support/workspaceSeed';

type Scope = 'bill' | 'section' | 'page' | 'virtual';
const item = (id: string) => ({ id, type: 'PRICED', reference: id, description: `Placement row ${id}`, unit: 'nr', quantity: 2, rate: 7, total: 14 });
function project(scope: Scope) {
  const items = ['A', 'B', 'C', 'X'].map(item);
  if (scope === 'virtual') items.push(...Array.from({ length: 60 }, (_, index) => item(`extra-${index}`)));
  const section = { id: 'placement-section', name: 'Placement section', items: scope === 'page' ? [] : items,
    ...(scope === 'page' ? { pages: [{ id: 'placement-page', name: 'Placement page', items }] } : {}) };
  return { ...seededProject, showStickyBillTotals: false, id: 'placement-project', name: 'Row Placement Check', bills: [
    { id: 'placement-bill', name: 'Placement bill', sections: scope === 'bill' ? [] : [section], ...(scope === 'bill' ? { items } : {}) },
  ] };
}
async function savedRows(page: Page) {
  const raw = await page.evaluate((key) => localStorage.getItem(key), storageKeys.projects);
  const projects = JSON.parse(raw?.trimStart().startsWith('[') ? raw : LZString.decompressFromUTF16(raw || '') || '[]');
  const bill = projects[0].bills[0];
  return bill.sections.length ? bill.sections[0].pages?.[0].items || bill.sections[0].items : bill.items;
}
async function order(page: Page) { return (await savedRows(page)).map((row: { id: string }) => row.id); }
async function openInspector(page: Page, itemId: string) {
  await page.locator(`[data-bill-row-id="${itemId}"]`).click({ button: 'right' });
  await page.getByRole('menuitem', { name: /^Edit line/ }).click();
  await expect(page.locator('[data-smoke="item-editor-modal"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-smoke="item-editor-modal"]')).toBeHidden();
}
const libraryPayload = { kind: 'HZL_LIBRARY_INSERT', selectedItemId: 'library-X', selectedItemType: 'PRICED',
  sourceItems: [{ ...item('library-X'), description: 'Imported placement item' }], defaultMode: 'ITEM_ONLY', label: 'Imported placement item' };

async function nativeDrop(page: Page, kind: 'library' | 'move', ctrlKey: boolean, half: number, targetId = 'B') {
  await page.locator(`[data-bill-row-id="${targetId}"]`).evaluate((row, args) => {
    const transfer = new DataTransfer();
    if (args.kind === 'library') transfer.setData('application/x-hzl-library-insert', JSON.stringify(args.payload));
    else transfer.setData('application/x-qs-bill-item', JSON.stringify({ itemId: 'X', sectionId: row.getAttribute('data-bill-section-id') || '', pageId: row.getAttribute('data-bill-page-id') || null }));
    const rect = row.getBoundingClientRect();
    const init = { bubbles: true, cancelable: true, dataTransfer: transfer, ctrlKey: args.ctrlKey, clientX: rect.x + 150, clientY: rect.y + rect.height * args.half };
    row.dispatchEvent(new DragEvent('dragover', init));
    row.dispatchEvent(new DragEvent('drop', init));
  }, { kind, ctrlKey, half, payload: libraryPayload });
}

for (const scope of ['bill', 'section', 'page', 'virtual'] as const) {
  for (const ctrlKey of [false, true]) {
    for (const half of [0.15, 0.85]) {
      test(`library ${scope}: ${ctrlKey ? 'Ctrl below' : 'below'} over row ${half < 0.5 ? 'top' : 'bottom'}`, async ({ page }) => {
        await openSeededBillWorkspace(page, { project: project(scope) });
        await nativeDrop(page, 'library', ctrlKey, half);
        await expect(page.getByRole('heading', { name: 'Choose what to insert' })).toBeVisible();
        await expect(page.getByText(new RegExp(`After B - Placement row B`))).toBeVisible();
        await page.getByRole('button', { name: 'Insert 1 row', exact: true }).click();
        await expect.poll(async () => (await savedRows(page)).slice(0, 5).map((entry: { description: string }) => entry.description)).toEqual(
          ['Placement row A', 'Placement row B', 'Imported placement item', 'Placement row C', 'Placement row X'],
        );
      });
    }
    test(`native move ${scope}: ${ctrlKey ? 'Ctrl below' : 'below'} preserves row values`, async ({ page }) => {
      await openSeededBillWorkspace(page, { project: project(scope) });
      await nativeDrop(page, 'move', ctrlKey, 0.1);
      await expect.poll(async () => (await order(page)).slice(0, 4)).toEqual(['A', 'B', 'X', 'C']);
      const moved = (await savedRows(page)).find((entry: { id: string }) => entry.id === 'X');
      expect(moved).toMatchObject({ id: 'X', description: 'Placement row X', quantity: 2, rate: 7, total: 14, type: 'PRICED', unit: 'nr' });
      expect((await order(page)).filter((id: string) => id === 'X')).toHaveLength(1);
    });
  }
}

test('real drag handle stays below the target when Ctrl is pressed and released', async ({ page }) => {
  await openSeededBillWorkspace(page, { project: project('section') });
  const handle = await page.locator('[data-bill-row-id="X"] [draggable="true"]').boundingBox();
  const target = page.locator('[data-bill-row-id="B"]');
  const rect = await target.boundingBox();
  if (!handle || !rect) throw new Error('Missing drag handle or target');
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(rect.x + 180, rect.y + 3, { steps: 12 });
  await expect(target).toHaveClass(/border-b-primary-500/);
  await page.keyboard.down('Control');
  await expect(target).toHaveClass(/border-b-primary-500/);
  await page.keyboard.up('Control');
  await expect(target).toHaveClass(/border-b-primary-500/);
  await page.keyboard.down('Control');
  await page.mouse.up();
  await page.keyboard.up('Control');
  await expect.poll(async () => (await order(page)).slice(0, 4)).toEqual(['A', 'B', 'X', 'C']);
});

test('delayed library context retains the row and Ctrl state captured at release', async ({ page }) => {
  await openSeededBillWorkspace(page, { project: project('page') });
  await page.locator('[data-bill-row-id="B"]').evaluate((row, payload) => {
    const rect = row.getBoundingClientRect();
    let resolvePayload!: (value: unknown) => void;
    const promise = new Promise((resolve) => { resolvePayload = resolve; });
    (window as any).__finishPlacementDrop = () => resolvePayload(payload);
    window.dispatchEvent(new CustomEvent('hzl-library-insert-pointer-drop', { detail: {
      payload, clientX: rect.x + 180, clientY: rect.y + 4, ctrlKey: true, payloadPromise: promise,
    } }));
  }, libraryPayload);
  await page.locator('[data-bill-row-id="C"] [data-bill-select-row]').click();
  await page.evaluate(() => (window as any).__finishPlacementDrop());
  await expect(page.getByText(/After B - Placement row B/)).toBeVisible();
  await page.getByRole('button', { name: 'Insert 1 row', exact: true }).click();
  await expect.poll(async () => (await savedRows(page)).slice(0, 3).map((entry: { description: string }) => entry.description)).toEqual(['Placement row A', 'Placement row B', 'Imported placement item']);
});

test('add line uses the active highlight and preserves an explicit before choice', async ({ page }) => {
  await openSeededBillWorkspace(page, { project: project('section') });
  await openInspector(page, 'B');
  await page.locator('[data-help-id="help-bill-add"]').getByRole('button', { name: 'Add', exact: true }).click();
  const placement = page.getByRole('combobox', { name: /Placement/ });
  await expect(placement).toHaveValue('AFTER_SELECTED');
  await placement.selectOption('BEFORE_SELECTED');
  await expect(placement).toHaveValue('BEFORE_SELECTED');
});

async function openStandardsPanel(page: Page) {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await seedWorkspace(page, { project: project('section') });
  await page.addInitScript(({ key, source }) => {
    localStorage.setItem(key, JSON.stringify([{ id: 'placement-library', name: 'Placement Library', folders: [{ id: 'placement-folder', name: 'Placement folder', sections: [{
      id: 'placement-library-section', name: 'Placement standards', items: [
        { ...source, id: 'library-heading', type: 'GENERAL_HEADING', description: 'Placement source heading', rate: 0, quantity: 0, total: 0 },
        { ...source, id: 'library-comment', type: 'COMMENT', description: 'Placement source comment', rate: 0, quantity: 0, total: 0 },
        source,
      ],
    }] }] }]));
  }, { key: storageKeys.libraries, source: libraryPayload.sourceItems[0] });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-smoke="open-active-project"]').click();
  await openInspector(page, 'B');
  await page.getByRole('button', { name: 'Standards', exact: true }).first().click();
  const panel = page.locator('aside').filter({ has: page.getByRole('button', { name: 'Close standards insert', exact: true }) });
  await panel.getByRole('button', { name: 'Open folder Placement folder', exact: true }).click();
  await panel.getByRole('button', { name: 'Open section Placement standards', exact: true }).click();
  await panel.getByRole('button', { name: /^Open Placement source heading/ }).click();
  await panel.getByRole('button', { name: 'Insertion options', exact: true }).click();
  const source = panel.getByRole('button', { name: 'Imported placement item', exact: true });
  await expect(source).toBeVisible();
  return { panel, source };
}

for (const ctrlKey of [false, true]) {
  test(`standards panel drag handle ${ctrlKey ? 'Ctrl below' : 'below'} with live modifier indicator`, async ({ page }) => {
    const { panel, source } = await openStandardsPanel(page);
    await source.scrollIntoViewIfNeeded();
    const from = await source.boundingBox();
    const target = page.locator('[data-bill-row-id="B"]');
    if (!from) throw new Error('Missing source');
    await page.mouse.move(from.x + 15, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + 23, from.y + from.height / 2);
    await expect(page.getByText('Drop below · Hold Ctrl to insert one library line.', { exact: true }).first()).toBeVisible();
    const to = await target.boundingBox();
    if (!to) throw new Error('Missing target');
    await page.mouse.move(to.x + 180, to.y + 3, { steps: 15 });
    await expect(target).toHaveClass(/border-b-emerald-500/);
    await page.keyboard.down('Control');
    await expect(target).toHaveClass(/border-b-emerald-500/);
    await expect(page.getByText(/One library line \| 1 row to insert/)).toBeVisible();
    if (!ctrlKey) {
      await page.keyboard.up('Control');
      await expect(target).toHaveClass(/border-b-emerald-500/);
      await expect(page.getByText(/3 rows to insert/)).toBeVisible();
    }
    await page.mouse.up();
    await page.keyboard.up('Control');
    await expect(page.getByRole('heading', { name: 'Choose what to insert' })).toBeVisible();
    await page.getByRole('button', { name: /^Insert \d+ rows?$/, exact: true }).click();
    await expect.poll(async () => (await savedRows(page)).slice(0, 7).map((entry: { description: string }) => entry.description)).toEqual(
      ctrlKey ? ['Placement row A', 'Placement row B', 'Imported placement item', 'Placement row C', 'Placement row X']
        : ['Placement row A', 'Placement row B', 'Placement source heading', 'Placement source comment', 'Imported placement item', 'Placement row C', 'Placement row X'],
    );
  });
}

test('standards button inserts below the active row and keeps explicit placement until the anchor changes', async ({ page }) => {
  const { panel, source } = await openStandardsPanel(page);
  await source.click();
  const placement = panel.getByRole('combobox', { name: /^Placement/ });
  await expect(placement).toHaveValue('AFTER_SELECTED');
  await placement.selectOption('BEFORE_SELECTED');
  await source.click();
  await expect(placement).toHaveValue('BEFORE_SELECTED');
  await panel.getByRole('button', { name: 'Insert into bill', exact: true }).click();
  await expect.poll(async () => (await savedRows(page)).slice(0, 5).map((entry: { description: string }) => entry.description)).toEqual(['Placement row A', 'Placement source heading', 'Placement source comment', 'Imported placement item', 'Placement row B']);
  // Insertion selects its block. Clear that explicit selection before testing
  // the active-highlight fallback on another row.
  await page.getByRole('button', { name: 'Select all visible rows in Placement section', exact: true }).click();
  await page.getByRole('button', { name: 'Deselect all visible rows in Placement section', exact: true }).click();
  await openInspector(page, 'C');
  await expect(placement).toHaveValue('AFTER_SELECTED');
  await placement.selectOption('TOP');
  await expect(placement).toHaveValue('TOP');
});

test('moves to first and last rows, ignores self drops, and never changes values', async ({ page }) => {
  await openSeededBillWorkspace(page, { project: project('section') });
  await nativeDrop(page, 'move', true, 0.8, 'A');
  await expect.poll(() => order(page)).toEqual(['A', 'X', 'B', 'C']);
  await nativeDrop(page, 'move', false, 0.1, 'X');
  await expect.poll(() => order(page)).toEqual(['A', 'X', 'B', 'C']);
  await nativeDrop(page, 'move', false, 0.1, 'C');
  await expect.poll(() => order(page)).toEqual(['A', 'B', 'C', 'X']);
  for (const entry of await savedRows(page)) expect(entry).toMatchObject({ quantity: 2, rate: 7, total: 14 });
});

test('standards button defaults below a highlighted row and saves the ordered context block', async ({ page }) => {
  const { panel, source } = await openStandardsPanel(page);
  await source.click();
  await expect(panel.getByRole('combobox', { name: /^Placement/ })).toHaveValue('AFTER_SELECTED');
  await panel.getByRole('button', { name: 'Insert into bill', exact: true }).click();
  await expect.poll(async () => (await savedRows(page)).map((entry: { description: string }) => entry.description)).toEqual([
    'Placement row A', 'Placement row B', 'Placement source heading', 'Placement source comment', 'Imported placement item', 'Placement row C', 'Placement row X',
  ]);
});

test('a deleted destination aborts a pending library context load instead of appending elsewhere', async ({ page }) => {
  await openSeededBillWorkspace(page, { project: project('section') });
  await page.locator('[data-bill-row-id="B"]').evaluate((row, payload) => {
    const rect = row.getBoundingClientRect();
    let finish!: () => void;
    const payloadPromise = new Promise((resolve) => { finish = () => resolve(payload); });
    (window as any).__finishPlacementDrop = finish;
    window.dispatchEvent(new CustomEvent('hzl-library-insert-pointer-drop', { detail: {
      payload, clientX: rect.x + 180, clientY: rect.y + 4, ctrlKey: false, payloadPromise,
    } }));
  }, libraryPayload);
  await page.locator('[data-bill-row-id="B"]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: /Delete line/ }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.locator('[data-bill-row-id="B"]')).toHaveCount(0);
  await page.evaluate(() => (window as any).__finishPlacementDrop());
  await expect(page.getByText('The insertion destination changed. Select a destination row and try again.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Choose what to insert' })).toHaveCount(0);
  await expect.poll(() => order(page)).toEqual(['A', 'C', 'X']);
});

test('library drops append to an empty section without an anchor', async ({ page }) => {
  const empty = project('section');
  empty.bills[0].sections[0].items = [];
  await openSeededBillWorkspace(page, { project: empty });
  await page.locator('td[data-standards-drop-destination="true"][data-bill-section-id="placement-section"]').evaluate((surface, payload) => {
    const transfer = new DataTransfer();
    transfer.setData('application/x-hzl-library-insert', JSON.stringify(payload));
    surface.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  }, libraryPayload);
  await expect(page.getByText(/Bottom of Placement bill \/ Placement section/)).toBeVisible();
  await page.getByRole('button', { name: 'Insert 1 row', exact: true }).click();
  await expect.poll(async () => (await savedRows(page)).map((entry: { description: string }) => entry.description)).toEqual(['Imported placement item']);
});
