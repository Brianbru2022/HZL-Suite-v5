import { describe, expect, it } from 'vitest';
import { createDefaultAppraisalHouseType } from './appraisal';
import { buildHouseTypeElementalImportProposals, HOUSE_TYPE_ELEMENTAL_IMPORT_PRICE_INDEX } from './appraisalHouseTypeElementalImport';

describe('house type elemental import', () => {
  it('uses the 450mm substructure value and separates ASHP from GSH plumbing', async () => {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const summary = workbook.addWorksheet('Summary');
    summary.addRow([]);
    summary.addRow([]);
    summary.addRow(['House Name', 'House Type', 'Storey', 'Beds', 'GIF', 'Groundwork', '450mm Underbuild', '675 mm Underbuild', 'Brick Superstructure', 'Plumbing & Heating']);
    summary.addRow(['Arrochar', 'Semi Detached', 'Double', 3, 83, 10000, 2000, 3000, 4000, 15000]);
    const plumbing = workbook.addWorksheet('Plumbing & Heating');
    plumbing.addRow([]);
    plumbing.addRow([]);
    plumbing.addRow([]);
    plumbing.addRow([]);
    plumbing.addRow(['', 'Arrochar', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 9000, '', '', 15000]);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer]);
    const file = Object.assign(blob, { name: 'House Type Elemental Appraisal Value.xlsx' }) as File;
    const houseType = createDefaultAppraisalHouseType({ name: 'Arrochar', gifaM2: 83, buildCostPerM2: 1000 });

    const [proposal] = await buildHouseTypeElementalImportProposals(file, [houseType]);

    expect(proposal).toBeDefined();
    expect(proposal.houseTypeName).toBe('Arrochar');
    expect(proposal.gifaM2).toBe(83);
    expect(proposal.configuration).toBe('SEMI_DETACHED');
    expect(proposal.storeys).toBe(2);
    const underbuild = proposal.costBreakdown.find((component) => component.key === 'BRICK_MAT');
    const brickwork = proposal.costBreakdown.find((component) => component.key === 'BRICK_LAB');
    const plumbingBase = proposal.costBreakdown.find((component) => component.key === 'PLUMBING');
    const ashp = proposal.costBreakdown.find((component) => component.key === 'AIR_SOURCE_HEAT_PUMPS');
    expect(underbuild?.amount).toBeCloseTo(2000 * HOUSE_TYPE_ELEMENTAL_IMPORT_PRICE_INDEX / 227, 6);
    expect(underbuild?.notes).toContain('450mm Brickwork');
    expect(brickwork?.amount).toBeCloseTo(4000 * HOUSE_TYPE_ELEMENTAL_IMPORT_PRICE_INDEX / 227, 6);
    expect(plumbingBase?.amount).toBeCloseTo(9000 * HOUSE_TYPE_ELEMENTAL_IMPORT_PRICE_INDEX / 227, 6);
    expect(ashp?.amount).toBeCloseTo(6000 * HOUSE_TYPE_ELEMENTAL_IMPORT_PRICE_INDEX / 227, 6);
    expect(ashp?.priceIndex).toBe(HOUSE_TYPE_ELEMENTAL_IMPORT_PRICE_INDEX);
  });
});
