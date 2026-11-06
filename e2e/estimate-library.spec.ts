import { expect, test } from '@playwright/test';
import { seedWorkspace, seededProject } from './support/workspaceSeed';

function smoke(page: import('@playwright/test').Page, id: string) {
  return page.locator(`[data-smoke="${id}"]`);
}

test('home scrolls and Estimate opens the folder/year estimate library', async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 720 });
  await seedWorkspace(page, {
    project: [
      {
        ...seededProject,
        reference: 'REF',
      },
      {
        ...seededProject,
        id: 'e2e-hzl-2025',
        name: 'HZL 2025 Estimate',
        reference: 'HZL-2025',
        updatedAt: '2025-04-10T09:00:00.000Z',
      },
      {
        ...seededProject,
        id: 'e2e-acme-2026',
        name: 'Acme 2026 Estimate',
        client: 'Acme',
        reference: 'ACME-2026',
        updatedAt: '2026-03-10T09:00:00.000Z',
      },
    ],
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(smoke(page, 'home-workspace')).toBeVisible();
  await expect.poll(async () => (
    await smoke(page, 'home-workspace').evaluate((node) => {
      const element = node as HTMLElement;
      element.scrollTop = element.scrollHeight;
      return element.scrollTop > 0;
    })
  )).toBe(true);

  await smoke(page, 'rail-estimate').click();
  await expect(smoke(page, 'estimate-register-workspace')).toBeVisible();
  const estimateLibrary = smoke(page, 'estimate-library');
  await expect(estimateLibrary).toBeVisible();
  await expect(estimateLibrary).toContainText('HZL');
  await expect(estimateLibrary).toContainText('Acme');
  await expect(estimateLibrary).toContainText('2026');
  await expect(estimateLibrary).toContainText('2025');
  const placeholderRow = smoke(page, 'estimate-library-row').filter({ hasText: 'Revision E2E Project' });
  await expect(placeholderRow).toContainText('EST-2026-001');
  await expect(placeholderRow).not.toContainText('REF');

  await expect(smoke(page, 'estimate-register-window')).toBeVisible();
  const acmeRow = smoke(page, 'estimate-library-row').filter({ hasText: 'Acme 2026 Estimate' });
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Archive "Acme 2026 Estimate"');
    await dialog.accept();
  });
  await acmeRow.getByLabel('Archive Acme 2026 Estimate').click();
  await expect(acmeRow).toHaveCount(0);
  await page.getByRole('button', { name: /Archived \(1\)/ }).click();
  await expect(acmeRow).toBeVisible();
  await expect(acmeRow).toContainText('Archived');
  await acmeRow.getByLabel('Restore Acme 2026 Estimate').click();
  await expect(acmeRow).not.toContainText('Archived');
  await page.getByRole('button', { name: /Archived/ }).click();

  await smoke(page, 'estimate-add-folder').click();
  await expect(smoke(page, 'estimate-folder-dialog')).toBeVisible();
  await smoke(page, 'estimate-folder-name').fill('HZL Live');
  await smoke(page, 'estimate-folder-dialog').getByRole('button', { name: 'Create folder' }).click();
  await expect(smoke(page, 'estimate-folder-dialog')).toBeHidden();
  await smoke(page, 'estimate-folder-filter').selectOption({ label: 'All folders (3)' });
  const hzlRow = smoke(page, 'estimate-library-row').filter({ hasText: 'HZL 2025 Estimate' });
  await hzlRow.getByLabel('Estimate folder').selectOption({ label: 'HZL Live' });
  await smoke(page, 'estimate-folder-filter').selectOption({ label: 'HZL Live (1)' });
  await expect(smoke(page, 'estimate-year-filter')).toContainText('2025');
  await smoke(page, 'estimate-year-filter').selectOption('2025');
  await expect(smoke(page, 'estimate-library-results')).toContainText('HZL 2025 Estimate');
  await expect(smoke(page, 'estimate-library-row')).toHaveCount(1);

  page.once('dialog', async (dialog) => { await dialog.accept(); });
  await page.getByRole('button', { name: 'Folder actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete folder' }).click();
  await smoke(page, 'estimate-folder-filter').selectOption({ label: 'Unfiled estimates (3)' });
  await expect(smoke(page, 'estimate-library-results')).toContainText('HZL 2025 Estimate');

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Permanently delete "Acme 2026 Estimate"');
    await dialog.accept();
  });
  await acmeRow.getByLabel('Delete Acme 2026 Estimate').click();
  await expect(acmeRow).toHaveCount(0);
  await expect(smoke(page, 'estimate-library-row')).toHaveCount(2);

  await hzlRow.getByRole('button', { name: 'Open' }).click();
  await expect(smoke(page, 'bill-workspace')).toBeVisible();
});
