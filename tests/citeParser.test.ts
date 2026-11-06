import { describe, expect, it } from 'vitest';
import type { Project } from '../types';
import { parseLegacyNumericCite42, parseStructuredLegacyCsv, parseStructuredLegacyCsvWithSummary } from '../utils/citeParser';
import { getSectionItems } from '../utils/calculations';

function makeProject(name: string): Project {
  return {
    id: `project-${name}`,
    name,
    client: '',
    location: '',
    reference: 'IMP',
    updatedAt: new Date().toISOString(),
    measurementStandard: 'SMM7',
    ohpPercentage: 0,
    bills: [],
  };
}

describe('citeParser legacy import support', () => {
  it('parses the structured legacy CSV export into bills and pages', () => {
    const csv = [
      '"Bill","Page","Item","Section","Description","Quantity","Units","Net Rate","Net Value"',
      '"101","1","","","SERVICES","","","",""',
      '"101","1","","","G10: MULTI-UTILITY SERVICES","","","",""',
      '"101","1","A","[None]-[None]","multi utility supply","1.00","Sum","280,311.29","280,311.29"',
      '"101","2","","","TREE REMOVAL","","","",""',
      '"101","2","B","[None]-[None]","tree and vegetation management as per site map.","1.00","Sum","98,538.42","98,538.42"',
    ].join('\n');

    const project = parseStructuredLegacyCsv(csv, makeProject('csv'));

    expect(project.bills).toHaveLength(1);
    expect(project.bills[0].name).toBe('101 - SERVICES');
    expect(project.bills[0].sections).toHaveLength(1);
    expect(project.bills[0].sections[0].pages).toHaveLength(2);

    const pageOneItems = project.bills[0].sections[0].pages?.[0].items || [];
    const pageTwoItems = project.bills[0].sections[0].pages?.[1].items || [];

    expect(pageOneItems.some((item) => item.description === 'multi utility supply')).toBe(true);
    expect(pageTwoItems.some((item) => item.reference === '101/2/B')).toBe(true);
    expect(pageTwoItems.find((item) => item.reference === '101/2/B')?.total).toBe(98538.42);
  });

  it('splits structured CSV imports into bill sections when explicit section hints are present', () => {
    const csv = [
      '"Bill","Page","Item","Section","Description","Quantity","Units","Net Rate","Net Value"',
      '"401","101","","","STRUCTURAL TIMBER KIT SUPPLY","","","",""',
      '"401","101","A","000-000","complete ground floor construction","1.00","Plot","",""',
      '"401","6","A","003-1","1290 x 1360mm high","1.00","Nr","",""',
    ].join('\n');

    const project = parseStructuredLegacyCsv(csv, makeProject('csv-sections'));

    expect(project.bills).toHaveLength(1);
    expect(project.bills[0].sections).toHaveLength(2);
    expect(project.bills[0].sections.map((section) => section.name)).toEqual(['Imported schedule', '003-1']);
    expect(getSectionItems(project.bills[0].sections[0]).some((item) => item.reference === '401/101/A')).toBe(true);
    expect(getSectionItems(project.bills[0].sections[1]).some((item) => item.reference === '401/6/A')).toBe(true);
  });

  it('reports QA summary counts for structured CSV imports', async () => {
    const csv = [
      '"Bill","Page","Item","Section","Description","Quantity","Units","Net Rate","Net Value"',
      '"401","101","","","STRUCTURAL TIMBER KIT SUPPLY","","","",""',
      '"401","101","","003-1","Upper floor framing","","","",""',
      '"401","101","A","003-1","timber joists","1.00","nr","",""',
      '"","101","B","003-1","orphan row without bill code","1.00","nr","",""',
    ].join('\n');

    const result = parseStructuredLegacyCsvWithSummary(csv, makeProject('csv-summary'));

    expect(result.summary.billsImported).toBe(1);
    expect(result.summary.sectionsInferred).toBe(1);
    expect(result.summary.headingsPromoted).toBe(1);
    expect(result.summary.rowsSkipped).toBe(1);
  });

  it('parses the numeric CITE42 EBQ format into pages and priced items', () => {
    const ebq = [
      'VER=CITE42',
      '1            Enabling - Services',
      '',
      '2            SERVICES',
      '',
      '3            G10: MULTI-UTILITY SERVICES',
      '',
      '4            Provide all on-site works required to complete',
      '             the service connection to each plot.',
      '',
      '9 101/1/A    multi utility supply                                     1.000 Sum  280311.29     280311.29',
      '',
      '9 101/2/B    extra over cost for barrier pipe                         1.000 Sum   98538.42      98538.42',
    ].join('\n');

    const project = parseLegacyNumericCite42(ebq, makeProject('ebq'));

    expect(project.bills).toHaveLength(1);
    expect(project.bills[0].name).toBe('Enabling - Services');
    expect(project.bills[0].sections).toHaveLength(1);
    expect(project.bills[0].sections[0].pages).toHaveLength(2);

    const importedItems = getSectionItems(project.bills[0].sections[0]);

    expect(importedItems.some((item) => item.reference === '101/1/A')).toBe(true);
    expect(importedItems.some((item) => item.reference === '101/2/B')).toBe(true);
    expect(importedItems.find((item) => item.reference === '101/1/A')?.rate).toBe(280311.29);
    expect(importedItems.find((item) => item.reference === '101/2/B')?.description).toBe('extra over cost for barrier pipe');
  });
});
