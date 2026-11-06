import { describe, expect, it } from 'vitest';
import type { DevelopmentAppraisal, DevelopmentAppraisalOption } from '../types';
import {
  APPRAISAL_MODE_LABELS,
  buildNextAppraisalReference,
  buildNextAppraisalRevisionReference,
  buildMonthlyCashflow,
  calculateAppraisalOption,
  calculateGdvIncentiveCost,
  calculateHouseBuildingOverheadCost,
  calculateHouseBuildingProgrammeSummary,
  calculateCostLines,
  calculateHouseTypeCostBreakdownTotal,
  calculateHouseTypeConstructionTotal,
  calculateIndexedHouseTypeConstructionTotal,
  calculateHouseTypeGdv,
  calculateHouseTypeLibraryBuildCostPerM2,
  calculateLandLbtt,
  calculateLandCostBenchmarks,
  calculateNetDevelopableArea,
  calculateOptionGdv,
  calculateRevenueLineValue,
  calculateSiteDimensionTotal,
  resolveSiteDimensionQuantity,
  compareAppraisalOptions,
  createCashflowProfile,
  createDefaultAppraisal,
  createDefaultAppraisalOption,
  createDefaultCostLine,
  createDefaultAppraisalHouseType,
  createDefaultAppraisalRate,
  createDefaultSiteDimensionRows,
  createDefaultHouseTypeCostBreakdown,
  createHouseTypeScheduleRowFromLibrary,
  createManualHouseTypeScheduleRow,
  createSiteDimensionRowFromRate,
  ensureBaseInfrastructureRates,
  getHouseTypeSalesRows,
  isOptionalHouseTypeCostComponent,
  normalizeAppraisalHouseTypeLibraryItems,
  normalizeAppraisalRateLibraryItems,
  normalizeDevelopmentAppraisalOption,
  normalizeDevelopmentAppraisals,
  spreadValueAcrossMonths,
  summariseHouseBuildingOption,
} from './appraisal';
import {
  AWD_INFRASTRUCTURE_RATE_DEFINITIONS,
  AWD_INFRASTRUCTURE_RATE_PACK_PRICE_INDEX,
  AWD_PLOT_WORKS_RATE_DEFINITIONS,
  AWD_PLOT_WORKS_RATE_PACK_PRICE_INDEX,
  AWD_PRELIMS_RATE_DEFINITIONS,
  AWD_PRELIMS_RATE_PACK_PRICE_INDEX,
  createAwdInfrastructureRatePack,
  createAwdPlotWorksRatePack,
  createAwdPrelimsRatePack,
  mergeAwdInfrastructureRatePack,
  mergeAwdPlotWorksRatePack,
  mergeAwdPrelimsRatePack,
} from './appraisalInfrastructureRatePacks';
import { APPRAISAL_HOUSE_TYPE_DETAILED_DEFAULTS, buildDetailedDefaultCostBreakdown } from './appraisalHouseTypeDefaults';

function makeKnownLandOption(overrides: Partial<DevelopmentAppraisalOption> = {}): DevelopmentAppraisalOption {
  return {
    ...createDefaultAppraisalOption('RESIDENTIAL_SALES'),
    calculationMode: 'KNOWN_LAND_PROFIT_ON_GDV',
    durationMonths: 12,
    targetProfitOnGdvPercent: 20,
    financeAnnualRatePercent: 0,
    knownLandValue: 200000,
    revenueLines: [
      {
        id: 'revenue-1',
        title: 'Sales',
        template: 'RESIDENTIAL_SALES',
        units: 4,
        saleValuePerUnit: 250000,
        cashflow: createCashflowProfile('END', 12),
      },
    ],
    costLines: [
      {
        id: 'cost-1',
        title: 'Construction',
        category: 'CONSTRUCTION',
        amount: 500000,
        percentageBasis: 'NONE',
        percentageValue: 0,
        cashflow: createCashflowProfile('EVEN', 12),
      },
    ],
    ...overrides,
  };
}

function makeGenericKnownLandOption(overrides: Partial<DevelopmentAppraisalOption> = {}): DevelopmentAppraisalOption {
  return makeKnownLandOption({
    houseTypeSchedule: undefined,
    siteDimensions: undefined,
    programme: undefined,
    ...overrides,
  });
}

describe('appraisal reference generation', () => {
  it('creates the first and second appraisal references for the same year', () => {
    const first = buildNextAppraisalReference([], '2026-06-30');
    const second = buildNextAppraisalReference([{ reference: first }], '2026-07-01');

    expect(first).toBe('2026.001.A');
    expect(second).toBe('2026.002.A');
  });

  it('keeps numbering independent by appraisal year', () => {
    const appraisals: Pick<DevelopmentAppraisal, 'reference'>[] = [
      { reference: '2026.001.A' },
      { reference: '2026.002.A' },
      { reference: '2027.001.A' },
    ];

    expect(buildNextAppraisalReference(appraisals, '2026-12-01')).toBe('2026.003.A');
    expect(buildNextAppraisalReference(appraisals, '2027-01-01')).toBe('2027.002.A');
  });

  it('creates the next revision letter for a duplicated appraisal', () => {
    const source = { reference: '2026.001.A', appraisalDate: '2026-06-30' };
    const appraisals: Pick<DevelopmentAppraisal, 'reference'>[] = [
      { reference: '2026.001.A' },
      { reference: '2026.001.B' },
      { reference: '2026.002.A' },
    ];

    expect(buildNextAppraisalRevisionReference(source, appraisals)).toBe('2026.001.C');
  });

  it('ignores legacy references that do not match the generated format', () => {
    const appraisals: Pick<DevelopmentAppraisal, 'reference'>[] = [
      { reference: 'Sauchie CTC' },
      { reference: '2026-001-A' },
      { reference: '2026.001.A' },
    ];

    expect(buildNextAppraisalReference(appraisals, '2026-06-30')).toBe('2026.002.A');
    expect(buildNextAppraisalRevisionReference({ reference: 'Legacy ref', appraisalDate: '2026-06-30' }, appraisals)).toBe('2026.002.A');
  });
});

describe('development appraisal calculations', () => {
  it('calculates residential GDV from units and sale value', () => {
    const option = makeKnownLandOption();

    expect(calculateOptionGdv(option)).toBe(1000000);
  });

  it('capitalises commercial income from rent and yield', () => {
    const line = {
      id: 'commercial-revenue',
      title: 'Office income',
      template: 'COMMERCIAL_INCOME' as const,
      area: 1000,
      rentRate: 25,
      yieldPercent: 5,
      voidPercent: 0,
      incentivePercent: 0,
      manualValue: 0,
      cashflow: createCashflowProfile('END', 18),
    };

    expect(calculateRevenueLineValue(line)).toBe(500000);
  });

  it('calculates known land profit on GDV', () => {
    const metrics = calculateAppraisalOption(makeGenericKnownLandOption());

    expect(metrics.gdv).toBe(1000000);
    expect(metrics.landValue).toBe(200000);
    expect(metrics.totalCost).toBe(700000);
    expect(metrics.profit).toBe(300000);
    expect(metrics.profitOnGdvPercent).toBe(30);
  });

  it('adds the GDV incentive percentage to non-land costs and profit metrics', () => {
    const option = makeGenericKnownLandOption({ gdvIncentivePercent: 2 });
    const metrics = calculateAppraisalOption(option);

    expect(calculateGdvIncentiveCost(option, metrics.gdv)).toBe(20000);
    expect(metrics.gdvIncentiveCost).toBe(20000);
    expect(metrics.nonLandCost).toBe(520000);
    expect(metrics.totalCost).toBe(720000);
    expect(metrics.profit).toBe(280000);
    expect(metrics.profitOnGdvPercent).toBeCloseTo(28, 2);
  });

  it('applies the sales incentive to private housing GDV only', () => {
    const option = makeKnownLandOption({
      revenueLines: [],
      costLines: [],
      gdvIncentivePercent: 2,
      houseTypeSchedule: [
        createManualHouseTypeScheduleRow({ houseTypeName: 'Private', tenure: 'PRIVATE', quantity: 2, gifaM2: 80, buildCostPerM2: 1000, saleValuePerUnit: 250000 }),
        createManualHouseTypeScheduleRow({ houseTypeName: 'Affordable', tenure: 'AFFORDABLE', quantity: 2, gifaM2: 80, buildCostPerM2: 1000, saleValuePerUnit: 150000 }),
      ],
    });

    expect(calculateGdvIncentiveCost(option, calculateOptionGdv(option))).toBe(10000);
    expect(calculateAppraisalOption(option).gdvIncentiveCost).toBe(10000);
  });

  it('includes custom cost provisions in non-land costs and profit metrics', () => {
    const option = makeGenericKnownLandOption({
      customCostProvisionAmount: 30000,
      customCostProvisionNote: 'Separate planning risk allowance',
    });
    const metrics = calculateAppraisalOption(option);

    expect(metrics.nonLandCost).toBe(530000);
    expect(metrics.totalCost).toBe(730000);
    expect(metrics.profit).toBe(270000);
    expect(metrics.profitOnGdvPercent).toBeCloseTo(27, 2);
  });

  it('includes multiple custom cost provisions in non-land costs and profit metrics', () => {
    const option = makeGenericKnownLandOption({
      customCostProvisions: [
        {
          id: 'custom-1',
          title: 'Bin store',
          amount: 18000,
          notes: 'External bin store provision',
          createdAt: '2026-07-13T00:00:00.000Z',
          updatedAt: '2026-07-13T00:00:00.000Z',
        },
        {
          id: 'custom-2',
          title: 'Legal provision',
          amount: 12000,
          notes: 'Separate legal provision',
          createdAt: '2026-07-13T00:00:00.000Z',
          updatedAt: '2026-07-13T00:00:00.000Z',
        },
      ],
    });
    const metrics = calculateAppraisalOption(option);

    expect(metrics.nonLandCost).toBe(530000);
    expect(metrics.totalCost).toBe(730000);
    expect(metrics.profit).toBe(270000);
  });

  it('calculates LBTT from land price bands', () => {
    expect(calculateLandLbtt(150000)).toBe(0);
    expect(calculateLandLbtt(200000)).toBe(500);
    expect(calculateLandLbtt(250000)).toBe(1000);
    expect(calculateLandLbtt(300000)).toBe(3250);
  });

  it('includes abnormal cost lines in non-land cost metrics', () => {
    const abnormal = createDefaultCostLine('ABNORMALS', 12, {
      title: 'Abnormal drainage',
      amount: 50000,
    });
    const metrics = calculateAppraisalOption(makeKnownLandOption({
      costLines: [
        ...makeKnownLandOption().costLines,
        abnormal,
      ],
    }));

    expect(metrics.nonLandCost).toBe(52000);
    expect(metrics.profit).toBe(748000);
  });

  it('solves residual land value after target profit and non-land costs', () => {
    const option = {
      ...makeGenericKnownLandOption(),
      calculationMode: 'RESIDUAL_LAND_VALUE' as const,
      knownLandValue: 0,
    };

    const metrics = calculateAppraisalOption(option);

    expect(metrics.landValue).toBeCloseTo(300000, 2);
    expect(metrics.profit).toBeCloseTo(200000, 2);
    expect(metrics.profitOnGdvPercent).toBeCloseTo(20, 4);
  });

  it('spreads upfront, even, end, and custom phasing across months', () => {
    expect(spreadValueAcrossMonths(100, 4, { type: 'UPFRONT', startMonth: 2, endMonth: 4 })).toEqual([0, 100, 0, 0]);
    expect(spreadValueAcrossMonths(100, 4, { type: 'EVEN', startMonth: 1, endMonth: 4 })).toEqual([25, 25, 25, 25]);
    expect(spreadValueAcrossMonths(100, 4, { type: 'END', startMonth: 1, endMonth: 3 })).toEqual([0, 0, 100, 0]);
    expect(spreadValueAcrossMonths(100, 4, { type: 'CUSTOM', startMonth: 1, endMonth: 4, customPercentages: [10, 0, 30, 60] })).toEqual([10, 0, 30, 60]);
  });

  it('calculates monthly finance from negative funding balance', () => {
    const option = makeGenericKnownLandOption({
      durationMonths: 2,
      financeAnnualRatePercent: 12,
      knownLandValue: 0,
      revenueLines: [
        {
          id: 'revenue-1',
          title: 'End sale',
          template: 'RESIDENTIAL_SALES',
          manualValue: 1300,
          cashflow: createCashflowProfile('END', 2),
        },
      ],
      costLines: [
        {
          id: 'cost-1',
          title: 'Upfront cost',
          category: 'CONSTRUCTION',
          amount: 1200,
          percentageBasis: 'NONE',
          percentageValue: 0,
          cashflow: createCashflowProfile('UPFRONT', 2),
        },
      ],
    });

    const cashflow = buildMonthlyCashflow(option, 0);

    expect(cashflow.rows[0].financeCost).toBeCloseTo(12, 5);
    expect(cashflow.financeCost).toBeCloseTo(12, 5);
    expect(cashflow.peakFunding).toBeCloseTo(1212, 5);
  });

  it('marks the strongest multi-option comparison as recommended when no explicit choice exists', () => {
    const strong = makeKnownLandOption({ id: 'strong', name: 'Strong', knownLandValue: 100000 });
    const weak = makeKnownLandOption({ id: 'weak', name: 'Weak', knownLandValue: 350000 });
    const appraisal: DevelopmentAppraisal = {
      id: 'appraisal-1',
      name: 'Test appraisal',
      status: 'DRAFT',
      selectedOptionId: strong.id,
      options: [weak, strong],
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    };

    const comparison = compareAppraisalOptions(appraisal);

    expect(comparison.find((entry) => entry.isRecommended)?.option.id).toBe('strong');
  });

  it('calculates house type construction cost from quantity, GIFA, and cost per m2', () => {
    const row = createHouseTypeScheduleRowFromLibrary(createDefaultAppraisalHouseType({
      id: 'ht-1',
      name: 'Type A',
      gifaM2: 82,
      buildCostPerM2: 1550,
    }), { quantity: 6 });

    expect(calculateHouseTypeConstructionTotal(row)).toBe(762600);
  });

  it('indexes each house cost component from its own base index without reducing newer trade rates', () => {
    const row = createHouseTypeScheduleRowFromLibrary(createDefaultAppraisalHouseType({
      id: 'indexed-components',
      name: 'Indexed components',
      gifaM2: 100,
      buildCostPerM2: 1000,
      priceIndex: 200,
      costBreakdown: [
        { id: 'groundwork', key: 'GROUNDWORK', label: 'Groundwork', amount: 100, priceIndex: 200, included: true },
        { id: 'kit', key: 'KIT', label: 'Kit', amount: 100, priceIndex: 350, included: true },
        { id: 'custom', key: 'CUSTOM_ALLOWANCE', label: 'Custom', amount: 0, priceIndex: 200, included: true },
      ],
    }), { quantity: 2 });

    expect(calculateHouseTypeConstructionTotal(row)).toBe(400);
    // Groundwork moves from index 200 to 300, while the kit at index 250 is retained unchanged.
    expect(calculateIndexedHouseTypeConstructionTotal(row, { appraisalPriceIndex: 300 })).toBe(500);
  });

  it('uplifts every E3-5 trade from library index 233 to a later appraisal index', () => {
    const e35 = APPRAISAL_HOUSE_TYPE_DETAILED_DEFAULTS.find((entry) => entry.name === 'E3-5 Mid Terrace');
    expect(e35).toBeDefined();
    const libraryHouseType = createDefaultAppraisalHouseType({
      id: 'e3-5-mid',
      name: e35!.name,
      gifaM2: e35!.gifaM2,
      buildCostPerM2: e35!.totalCost / e35!.gifaM2,
      costBreakdown: buildDetailedDefaultCostBreakdown(e35!),
      priceIndex: 0,
    });
    const row = createHouseTypeScheduleRowFromLibrary(libraryHouseType, { quantity: 1 });
    const baseConstructionCost = calculateHouseTypeConstructionTotal(row);

    expect(row.costBreakdown?.every((component) => component.priceIndex === 233)).toBe(true);
    expect(baseConstructionCost).toBeGreaterThan(0);
    expect(calculateIndexedHouseTypeConstructionTotal(row, { appraisalPriceIndex: 240 })).toBeCloseTo(baseConstructionCost * (240 / 233), 2);
  });

  it('shows the Arrochar-style uplift per house and for the scheduled quantity without re-indexing unincluded trades', () => {
    const row = createHouseTypeScheduleRowFromLibrary(createDefaultAppraisalHouseType({
      id: 'arrochar-index-check',
      name: 'Arrochar index check',
      gifaM2: 83,
      buildCostPerM2: 0,
      priceIndex: 0,
      costBreakdown: [
        { id: 'brick-labour', key: 'BRICK_LAB', label: 'Brick labour', amount: 5361, priceIndex: 215, included: true, aiGenerated: true },
        { id: 'brick-materials', key: 'BRICK_MAT', label: 'Brick materials', amount: 4359, priceIndex: 215, included: true, aiGenerated: true },
        { id: 'excluded', key: 'KIT', label: 'Excluded trade', amount: 100000, priceIndex: 215, included: false },
      ],
    }), { quantity: 2 });
    const basePerHouse = 5361 + 4359;
    const indexedPerHouse = basePerHouse * (232 / 215);

    expect(calculateHouseTypeConstructionTotal(row)).toBe(basePerHouse * 2);
    expect(indexedPerHouse - basePerHouse).toBeCloseTo(768.56, 2);
    expect(calculateIndexedHouseTypeConstructionTotal(row, { appraisalPriceIndex: 232 })).toBeCloseTo(indexedPerHouse * 2, 2);
    expect(calculateIndexedHouseTypeConstructionTotal(row, { appraisalPriceIndex: 232 }) - calculateHouseTypeConstructionTotal(row)).toBeCloseTo(1537.12, 2);
  });

  it('calculates start-date contingency per trade when trade base indices differ', () => {
    const row = createHouseTypeScheduleRowFromLibrary(createDefaultAppraisalHouseType({
      id: 'mixed-trade-index',
      name: 'Mixed trade index',
      gifaM2: 100,
      buildCostPerM2: 0,
      costBreakdown: [
        { id: 'older-trade', key: 'GROUNDWORK', label: 'Older trade', amount: 100, priceIndex: 215, included: true, aiGenerated: true },
        { id: 'newer-trade', key: 'BRICK_LAB', label: 'Newer trade', amount: 100, priceIndex: 240, included: true, aiGenerated: true },
      ],
    }), { quantity: 1 });
    const option = makeKnownLandOption({
      revenueLines: [],
      costLines: [],
      houseTypeSchedule: [row],
      siteDimensions: [],
      programme: { appraisalPriceIndex: 232, startPriceIndex: 242 },
    });

    const summary = summariseHouseBuildingOption(option);
    const olderTradeContingency = 100 * (242 / 215 - 1);
    const newerTradeContingency = 100 * (242 / 240 - 1);
    const blendedContingency = summary.houseConstructionCost * (242 / 232 - 1);

    expect(summary.houseConstructionCost).toBeCloseTo(232 / 215 * 100 + 100, 2);
    expect(summary.privateHouseConstructionContingency).toBeCloseTo(
      olderTradeContingency + newerTradeContingency,
      2,
    );
    expect(summary.constructionContingency).toBeCloseTo(
      olderTradeContingency + newerTradeContingency,
      2,
    );
    expect(summary.constructionContingency).not.toBeCloseTo(blendedContingency, 2);
  });

  it('applies house type indexation when legacy saved indices are numeric strings', () => {
    const row = createHouseTypeScheduleRowFromLibrary(createDefaultAppraisalHouseType({
      id: 'string-index-house',
      name: 'String index house',
      gifaM2: 100,
      buildCostPerM2: 1000,
      priceIndex: 215,
      costBreakdown: [{ id: 'kit', key: 'KIT', label: 'Kit', amount: 100000, priceIndex: 215, included: true }],
    }), { quantity: 1 });
    const legacyRow = {
      ...row,
      costBreakdown: row.costBreakdown?.map((component) => ({
        ...component,
        amount: String(component.amount),
        priceIndex: String(component.priceIndex),
      })),
    } as unknown as typeof row;
    const legacyProgramme = { appraisalPriceIndex: '232' } as unknown as Parameters<typeof calculateIndexedHouseTypeConstructionTotal>[1];
    const legacyBaseCost = calculateHouseTypeConstructionTotal(legacyRow);

    expect(calculateIndexedHouseTypeConstructionTotal(legacyRow, legacyProgramme)).toBeCloseTo(legacyBaseCost * (232 / 215), 2);
  });

  it('moves legacy house type indices to every component when normalising the library', () => {
    const [houseType] = normalizeAppraisalHouseTypeLibraryItems([{
      id: 'legacy-index',
      name: 'Legacy house type',
      gifaM2: 100,
      buildCostPerM2: 1500,
      priceIndex: 220,
      buildPeriodMonths: 6,
      status: 'ACTIVE',
      costBreakdown: [{ id: 'kit', key: 'KIT', label: 'Kit', amount: 150000, included: true }],
    }]);

    expect(houseType.priceIndex).toBe(0);
    expect(houseType.costBreakdown?.find((component) => component.key === 'KIT')?.priceIndex).toBe(220);
  });

  it('uses 233 when a house cost component has no base index', () => {
    const [houseType] = normalizeAppraisalHouseTypeLibraryItems([{
      id: 'default-index',
      name: 'Default index house',
      gifaM2: 100,
      buildCostPerM2: 1500,
      priceIndex: 0,
      buildPeriodMonths: 6,
      status: 'ACTIVE',
      costBreakdown: [{ id: 'kit', key: 'KIT', label: 'Kit', amount: 150000, priceIndex: 0, included: true }],
    }]);

    expect(houseType.costBreakdown?.find((component) => component.key === 'KIT')?.priceIndex).toBe(233);
  });

  it('separates construction quantity from sales quantity for flat blocks', () => {
    const row = createManualHouseTypeScheduleRow({
      houseTypeName: 'Apartment block',
      quantity: 1,
      separateSalesQuantity: true,
      salesQuantity: 12,
      constructionQuantityLabel: 'block',
      salesQuantityLabel: 'flat',
      quantitySeparationNotes: 'Construction cost is assessed as one block and sales are assessed as 12 flats.',
      gifaM2: 80,
      buildCostPerM2: 2000,
      saleValuePerUnit: 250000,
    });
    const option = {
      ...createDefaultAppraisalOption('RESIDENTIAL_SALES'),
      houseTypeSchedule: [row],
    };
    const summary = summariseHouseBuildingOption(option);

    expect(calculateHouseTypeConstructionTotal(row)).toBe(160000);
    expect(calculateHouseTypeGdv(row)).toBe(3000000);
    expect(summary.totalUnits).toBe(12);
    expect(summary.gdv).toBe(3000000);
    expect(summary.houseConstructionCost).toBe(160000);
    expect(summary.averageSaleValuePerUnit).toBe(250000);
  });

  it('separates private and affordable house construction in structured cost lines', () => {
    const privateRow = createManualHouseTypeScheduleRow({
      houseTypeName: 'Private house',
      quantity: 2,
      tenure: 'PRIVATE',
      gifaM2: 100,
      buildCostPerM2: 1500,
    });
    const affordableRow = createManualHouseTypeScheduleRow({
      houseTypeName: 'Affordable house',
      quantity: 3,
      tenure: 'AFFORDABLE',
      gifaM2: 80,
      buildCostPerM2: 1200,
    });
    const option = makeKnownLandOption({
      revenueLines: [],
      costLines: [],
      houseTypeSchedule: [privateRow, affordableRow],
    });

    const summary = summariseHouseBuildingOption(option);
    const lines = calculateCostLines(option).map(({ line, amount }) => ({ title: line.title, amount }));

    expect(summary.privateHouseConstructionCost).toBe(300000);
    expect(summary.affordableHouseConstructionCost).toBe(288000);
    expect(summary.houseConstructionCost).toBe(588000);
    expect(lines).toEqual(expect.arrayContaining([
      { title: 'Private house construction', amount: 300000 },
      { title: 'Affordable house construction', amount: 288000 },
    ]));
  });

  it('prices inferred flat block sales by flat type rather than by construction block', () => {
    const row = createManualHouseTypeScheduleRow({
      houseTypeName: 'Block of flats',
      quantity: 2,
      separateSalesQuantity: true,
      salesQuantity: 12,
      constructionQuantityLabel: 'block',
      salesQuantityLabel: 'flat',
      quantitySeparationNotes: 'Construction basis: 2 blocks. Sales basis: There are 12 flats of 78m2 comprising 4 GF flats, 4 mid floor flats and 4 top floor flats.',
      gifaM2: 546,
      buildCostPerM2: 1600,
      saleValuePerUnit: 270000,
    });
    const salesRows = getHouseTypeSalesRows(row);

    expect(calculateHouseTypeConstructionTotal(row)).toBe(1747200);
    expect(salesRows.map((salesRow) => [salesRow.label, salesRow.quantity, salesRow.gifaM2])).toEqual([
      ['Ground floor flat', 4, 78],
      ['Mid floor flat', 4, 78],
      ['Top floor flat', 4, 78],
    ]);
    expect(calculateHouseTypeGdv(row)).toBe(3240000);
  });

  it('infers floor-level flat sale rows from a three-storey block description', () => {
    const row = createManualHouseTypeScheduleRow({
      houseTypeName: 'Block of flats',
      quantity: 2,
      separateSalesQuantity: true,
      salesQuantity: 12,
      constructionQuantityLabel: 'block',
      salesQuantityLabel: 'flat',
      quantitySeparationNotes: 'Each block is evaluated as a single construction unit comprising 6 saleable flats and communal areas.',
      notes: 'Guided AI cost assessment: The construction unit is defined as a single 3-storey block containing 6 flats, with a total GIFA of 546m2 based on 182m2 per floor.',
      gifaM2: 546,
      buildCostPerM2: 1620,
      saleValuePerUnit: 270000,
    });
    const salesRows = getHouseTypeSalesRows(row);

    expect(salesRows.map((salesRow) => [salesRow.label, salesRow.quantity, salesRow.gifaM2])).toEqual([
      ['Ground floor flat', 4, 91],
      ['Mid floor flat', 4, 91],
      ['Top floor flat', 4, 91],
    ]);
    expect(calculateHouseTypeGdv(row)).toBe(3240000);
  });

  it('includes EV chargers and air source heat pumps in the standard house type cost build-up', () => {
    const breakdown = createDefaultHouseTypeCostBreakdown();
    const keys = breakdown.map((component) => component.key);
    const ev = breakdown.find((component) => component.key === 'EV_CHARGERS');
    const ashp = breakdown.find((component) => component.key === 'AIR_SOURCE_HEAT_PUMPS');

    expect(keys).toContain('EV_CHARGERS');
    expect(keys).toContain('AIR_SOURCE_HEAT_PUMPS');
    expect(isOptionalHouseTypeCostComponent('EV_CHARGERS')).toBe(false);
    expect(isOptionalHouseTypeCostComponent('AIR_SOURCE_HEAT_PUMPS')).toBe(false);
    expect(ev?.included).toBe(true);
    expect(ashp?.included).toBe(true);
  });

  it('includes EV chargers and ASHP costs as standard for the house type', () => {
    const houseType = normalizeAppraisalHouseTypeLibraryItems([{
      name: 'Type with standard low-carbon kit',
      gifaM2: 100,
      costBreakdown: [
        { key: 'GROUNDWORK', label: 'Groundwork', amount: 10000 },
        { key: 'EV_CHARGERS', label: 'EV chargers', amount: 1500, included: false },
        { key: 'AIR_SOURCE_HEAT_PUMPS', label: 'Air source heat pumps', amount: 7500, included: false },
      ],
    }])[0];

    expect(houseType.costBreakdown?.find((component) => component.key === 'EV_CHARGERS')?.included).toBe(true);
    expect(houseType.costBreakdown?.find((component) => component.key === 'AIR_SOURCE_HEAT_PUMPS')?.included).toBe(true);
    expect(calculateHouseTypeCostBreakdownTotal(houseType.costBreakdown)).toBe(19000);
  });

  it('keeps previously saved EV and ASHP costs included when old rows have no include flag', () => {
    const houseType = normalizeAppraisalHouseTypeLibraryItems([{
      name: 'Legacy type',
      gifaM2: 100,
      costBreakdown: [
        { key: 'EV_CHARGERS', label: 'EV chargers', amount: 1500 },
        { key: 'AIR_SOURCE_HEAT_PUMPS', label: 'Air source heat pumps', amount: 7500 },
      ],
    }])[0];

    const ev = houseType.costBreakdown?.find((component) => component.key === 'EV_CHARGERS');
    const ashp = houseType.costBreakdown?.find((component) => component.key === 'AIR_SOURCE_HEAT_PUMPS');

    expect(ev?.included).toBe(true);
    expect(ashp?.included).toBe(true);
    expect(calculateHouseTypeCostBreakdownTotal(houseType.costBreakdown)).toBe(9000);
  });

  it('preserves AI-generated custom cost rows with measured detail rows', () => {
    const houseType = normalizeAppraisalHouseTypeLibraryItems([{
      name: 'AI measured flat block',
      gifaM2: 546,
      buildCostPerM2: 1600,
      costBreakdown: [{
        key: 'CUSTOM_ALLOWANCE',
        label: 'Substructure measured build-up',
        amount: 79000,
        included: true,
        aiGenerated: true,
        detailRows: [
          { label: 'Foundations', quantity: 90, unit: 'm', rate: 378, total: 34020, basis: 'Foundation centre-line length.' },
          { label: 'Ground slab', quantity: 182, unit: 'm2', rate: 135, total: 24570, basis: 'Lowest-floor slab area.' },
        ],
      }],
    }])[0];

    expect(houseType.costBreakdown).toHaveLength(1);
    expect(houseType.costBreakdown?.[0].label).toBe('Substructure measured build-up');
    expect(houseType.costBreakdown?.[0].detailRows).toHaveLength(2);
    expect(houseType.costBreakdown?.[0].detailRows?.[0].unit).toBe('m');
    expect(calculateHouseTypeCostBreakdownTotal(houseType.costBreakdown)).toBe(79000);
  });

  it('normalizes standard house type style, configuration, storeys, bedrooms, garage, and drive metadata', () => {
    const [valid, invalid] = normalizeAppraisalHouseTypeLibraryItems([
      { name: 'Metadata type', style: 'TOWNHOUSE', configuration: 'END_TERRACE', storeys: 2.5, bedrooms: 4, garage: 'Yes', privateDrive: 'No', gifaM2: 120, buildCostPerM2: 1500 },
      { name: 'Bad metadata type', style: 'CASTLE', configuration: 'PALACE', storeys: -1, bedrooms: 'not-a-number', garage: 'maybe', privateDrive: 1, gifaM2: 80, buildCostPerM2: 1400 },
    ]);

    expect(valid.style).toBe('TOWNHOUSE');
    expect(valid.configuration).toBe('END_TERRACE');
    expect(valid.storeys).toBe(2.5);
    expect(valid.bedrooms).toBe(4);
    expect(valid.garage).toBe(true);
    expect(valid.privateDrive).toBe(false);
    expect(invalid.style).toBeUndefined();
    expect(invalid.configuration).toBeUndefined();
    expect(invalid.storeys).toBeUndefined();
    expect(invalid.bedrooms).toBeUndefined();
    expect(invalid.garage).toBeUndefined();
    expect(invalid.privateDrive).toBeUndefined();
  });

  it('derives house type build cost per m2 from the cost component breakdown', () => {
    const breakdown = createDefaultHouseTypeCostBreakdown().map((component) => {
      if (component.key === 'GROUNDWORK') return { ...component, amount: 13283 };
      if (component.key === 'BRICK_LAB') return { ...component, amount: 2107 };
      if (component.key === 'JOINER') return { ...component, amount: 7411 };
      return component;
    });
    const houseType = normalizeAppraisalHouseTypeLibraryItems([{
      name: 'Type C',
      gifaM2: 100,
      buildCostPerM2: 1600,
      costBreakdown: breakdown,
    }])[0];
    const row = createHouseTypeScheduleRowFromLibrary(houseType, { quantity: 2 });

    expect(calculateHouseTypeCostBreakdownTotal(houseType.costBreakdown)).toBe(27801);
    expect(calculateHouseTypeLibraryBuildCostPerM2(houseType)).toBeCloseTo(278.01, 2);
    expect(calculateHouseTypeCostBreakdownTotal(row.costBreakdown)).toBe(27801);
    expect(row.costBreakdown?.[0].id).not.toBe(houseType.costBreakdown?.[0].id);
    expect(row.buildCostPerM2).toBeCloseTo(278.01, 2);
    expect(calculateHouseTypeConstructionTotal(row)).toBeCloseTo(55602, 2);
  });

  it('keeps schedule overrides separate from house type library defaults', () => {
    const libraryItem = createDefaultAppraisalHouseType({
      id: 'ht-1',
      name: 'Type A',
      style: 'VILLA',
      configuration: 'END_TERRACE',
      storeys: 2,
      bedrooms: 3,
      garage: false,
      privateDrive: true,
      gifaM2: 80,
      buildCostPerM2: 1500,
      priceIndex: 210,
    });
    const row = createHouseTypeScheduleRowFromLibrary(libraryItem, { gifaM2: 90, buildCostPerM2: 1650, priceIndex: 225 });

    expect(row.style).toBe('VILLA');
    expect(row.configuration).toBe('END_TERRACE');
    expect(row.storeys).toBe(2);
    expect(row.bedrooms).toBe(3);
    expect(row.garage).toBe(false);
    expect(row.privateDrive).toBe(true);
    expect(row.gifaM2).toBe(90);
    expect(row.buildCostPerM2).toBe(1650);
    expect(row.priceIndex).toBe(225);
    expect(libraryItem.gifaM2).toBe(80);
    expect(libraryItem.buildCostPerM2).toBe(1500);
    expect(libraryItem.priceIndex).toBe(0);
    expect(libraryItem.costBreakdown?.[0].priceIndex).toBe(210);
  });

  it('rewrites standard appraisal house type library timing without requiring a defaults reload', () => {
    const [standard, legacy, custom] = normalizeAppraisalHouseTypeLibraryItems([
      { id: 'standard', name: 'Morven Mid', gifaM2: 69, buildCostPerM2: 1600, priceIndex: 100, buildPeriodMonths: 12 },
      { id: 'legacy', name: 'xF4-6', gifaM2: 70, buildCostPerM2: 1600, priceIndex: 180, buildPeriodMonths: 9 },
      { id: 'custom', name: 'Custom house', gifaM2: 80, buildCostPerM2: 1600, priceIndex: 190, buildPeriodMonths: 10 },
    ]);

    expect(standard.name).toBe('Morven Mid');
    expect(standard.priceIndex).toBe(0);
    expect(standard.costBreakdown?.[0].priceIndex).toBe(233);
    expect(standard.buildPeriodMonths).toBe(4);
    expect(legacy.name).toBe('F4-6 Mid Terrace');
    expect(legacy.priceIndex).toBe(0);
    expect(legacy.costBreakdown?.[0].priceIndex).toBe(233);
    expect(legacy.buildPeriodMonths).toBe(4);
    expect(custom.priceIndex).toBe(0);
    expect(custom.costBreakdown?.[0].priceIndex).toBe(190);
    expect(custom.buildPeriodMonths).toBe(10);
  });

  it('calculates custom house rows from appraisal-only component build-up', () => {
    const breakdown = createDefaultHouseTypeCostBreakdown().map((component) => {
      if (component.key === 'GROUNDWORK') return { ...component, amount: 12000 };
      if (component.key === 'EV_CHARGERS') return { ...component, amount: 1250, included: true };
      if (component.key === 'AIR_SOURCE_HEAT_PUMPS') return { ...component, amount: 7800, included: true };
      return component;
    });
    const row = createManualHouseTypeScheduleRow({
      houseTypeName: 'Custom terrace',
      quantity: 2,
      gifaM2: 95,
      buildCostPerM2: 1800,
      costBreakdown: breakdown,
    });

    expect(calculateHouseTypeCostBreakdownTotal(row.costBreakdown)).toBe(21050);
    expect(calculateHouseTypeConstructionTotal(row)).toBe(42100);
  });

  it('calculates house GDV from sale value per unit and falls back to sale rate per m2', () => {
    const directSale = createHouseTypeScheduleRowFromLibrary(
      createDefaultAppraisalHouseType({ gifaM2: 100, buildCostPerM2: 1600 }),
      { quantity: 3, saleValuePerUnit: 280000, saleRatePerM2: 2500 }
    );
    const rateSale = createHouseTypeScheduleRowFromLibrary(
      createDefaultAppraisalHouseType({ gifaM2: 80, buildCostPerM2: 1600 }),
      { quantity: 4, saleValuePerUnit: 0, saleRatePerM2: 3000 }
    );

    expect(calculateHouseTypeGdv(directSale)).toBe(840000);
    expect(calculateHouseTypeGdv(rateSale)).toBe(960000);
  });

  it('calculates site dimension totals for m2 and linear metre rows', () => {
    expect(calculateSiteDimensionTotal({
      id: 'roads',
      category: 'ROADS',
      label: 'Roads',
      unit: 'm2',
      quantity: 450,
      rate: 85,
    })).toBe(38250);
    expect(calculateSiteDimensionTotal({
      id: 'fencing',
      category: 'BOUNDARY_FENCING',
      label: 'Boundary fencing',
      unit: 'm',
      quantity: 120,
      rate: 48,
    })).toBe(5760);
  });

  it('creates appraisal site rows from reusable rate library items', () => {
    const rate = createDefaultAppraisalRate({
      id: 'rate-1',
      category: 'BOUNDARY_FENCING',
      label: 'Boundary fence',
      unit: 'm',
      rate: 48,
      priceIndex: 215,
    });
    const row = createSiteDimensionRowFromRate(rate, { quantity: 120 });

    expect(row.label).toBe('Boundary fence');
    expect(row.unit).toBe('m');
    expect(row.priceIndex).toBe(215);
    expect(calculateSiteDimensionTotal(row)).toBe(5760);
    expect(normalizeAppraisalRateLibraryItems([{ ...rate, unit: 'bad' }])[0].unit).toBe('m');
    expect(normalizeAppraisalRateLibraryItems([{ ...rate, priceIndex: 220 }])[0].priceIndex).toBe(220);
  });

  it('creates AWD infrastructure pack rates from Infrastructure column B base formulas', () => {
    const pack = createAwdInfrastructureRatePack();
    expect(pack).toHaveLength(AWD_INFRASTRUCTURE_RATE_DEFINITIONS.length);

    const roads = pack.find((rate) => rate.id === 'awd-infrastructure-roads');
    expect(roads).toMatchObject({
      label: 'Carriageways',
      category: 'ROADS',
      costDriver: 'ROADS_M2',
      unit: 'm2',
      rate: 25.27,
      priceIndex: AWD_INFRASTRUCTURE_RATE_PACK_PRICE_INDEX,
    });

    expect(pack.find((rate) => rate.id === 'awd-infrastructure-ev-charging-with-drives')).toMatchObject({
      costDriver: 'UNITS_WITH_DRIVES',
      unit: 'nr',
      rate: 0,
    });
    expect(pack.find((rate) => rate.id === 'awd-infrastructure-ev-charging-without-drives')).toBeUndefined();
    expect(pack.find((rate) => rate.id === 'awd-infrastructure-boundary-fencing')).toMatchObject({
      costDriver: 'BOUNDARY_FENCING_M',
      unit: 'm',
      rate: 58,
    });
    expect(pack.find((rate) => rate.id === 'awd-infrastructure-plot-fencing')).toMatchObject({
      costDriver: 'PLOT_FENCING_M',
      unit: 'm',
      rate: 28,
    });
    expect(pack.find((rate) => rate.id === 'awd-infrastructure-paths')).toMatchObject({
      costDriver: 'PATHS_M2',
      unit: 'm2',
      rate: 53.79,
    });
    expect(pack.find((rate) => rate.id === 'awd-infrastructure-garden-walls')).toBeUndefined();

    expect(pack.find(rate => rate.id === 'awd-infrastructure-garden-walls-groundwork')).toBeUndefined();

    const compound = pack.find((rate) => rate.id === 'awd-infrastructure-compound');
    expect(compound).toMatchObject({ costDriver: 'TOTAL_UNITS', unit: 'nr', rate: 500 });
    expect(calculateSiteDimensionTotal(createSiteDimensionRowFromRate(compound!), makeKnownLandOption({houseTypeSchedule:[createManualHouseTypeScheduleRow({quantity:3})]}))).toBe(1500);
  });

  it('calculates infrastructure rows from shared measures with user-specified earthworks rates', () => {
    const driverQuantities = {
      SITE_AREA_M2: 67790,
      ROADS_M2: 8387,
      PATHS_M2: 3434,
      COMMON_LANDSCAPING_M2: 10491,
      PLANTING_M2: 2175,
      FRONT_GARDENS_M2: 6488,
      REAR_GARDENS_M2: 15875,
      BOUNDARY_FENCING_M: 2984,
      PLOT_FENCING_M: 1526,
      GARDEN_WALLS_M: 155,
      UNITS_WITH_DRIVES: 155,
      UNITS_WITHOUT_DRIVES: 12,
    };
    const driverRows = createDefaultSiteDimensionRows().map((row) => ({
      ...row,
      quantity: row.costDriver ? driverQuantities[row.costDriver as keyof typeof driverQuantities] ?? 0 : 0,
    }));
    const packRows = createAwdInfrastructureRatePack().map((rate) => createSiteDimensionRowFromRate(rate));
    const option = makeKnownLandOption({
      houseTypeSchedule: [
        createManualHouseTypeScheduleRow({ quantity: 155 }),
      ],
      siteDimensions: [...driverRows, ...packRows],
    });
    const totalFor = (id: string) => {
      const row = option.siteDimensions?.find((entry) => entry.libraryRateId === id);
      expect(row).toBeTruthy();
      return calculateSiteDimensionTotal(row!, option);
    };

    expect(totalFor('awd-infrastructure-removal-existing-structures')).toBeCloseTo(964.1, 2);
    expect(totalFor('awd-infrastructure-removal-existing-surfaces')).toBeCloseTo(964.1, 2);
    expect(totalFor('awd-infrastructure-alterations')).toBeCloseTo(0, 2);
    expect(totalFor('awd-infrastructure-cut-and-fill')).toBeCloseTo(216250.1, 2);
    expect(option.siteDimensions?.some(row => row.libraryRateId === 'awd-infrastructure-surveys-reports')).toBe(false);
    expect(totalFor('awd-infrastructure-drainage-suds')).toBeCloseTo(469672, 2);
    expect(totalFor('awd-infrastructure-services-groundworks')).toBeCloseTo(138804.85, 2);
    expect(totalFor('awd-infrastructure-services')).toBeCloseTo(193750, 2);
    expect(totalFor('awd-infrastructure-common-grass-landscaping')).toBeCloseTo(26542.23, 2);
    expect(totalFor('awd-infrastructure-roads')).toBeCloseTo(211939.49, 2);
    expect(totalFor('awd-infrastructure-kerbs')).toBeCloseTo(200784.78, 2);
    expect(totalFor('awd-infrastructure-paths')).toBeCloseTo(184714.86, 2);
    expect(totalFor('awd-infrastructure-service-strips')).toBeCloseTo(6961.21, 2);

    expect(
      totalFor('awd-infrastructure-boundary-fencing') +
      totalFor('awd-infrastructure-plot-fencing')
    ).toBeCloseTo(215800, 2);
    expect(totalFor('awd-infrastructure-tar-surfacing')).toBeCloseTo(185688.18, 2);
    expect(totalFor('awd-infrastructure-street-lighting')).toBeCloseTo(24657.78, 2);
    expect(totalFor('awd-infrastructure-protection')).toBeCloseTo(7212.82, 2);
    expect(totalFor('awd-infrastructure-compound')).toBeCloseTo(77500, 2);
  });

  it('creates AWD plot works pack rates from Plot Works column B base formulas', () => {
    const pack = createAwdPlotWorksRatePack();
    expect(pack).toHaveLength(AWD_PLOT_WORKS_RATE_DEFINITIONS.length);

    expect(pack.find((rate) => rate.id === 'awd-plot-works-drives')).toMatchObject({
      label: 'Driveways',
      category: 'DRIVES',
      costDriver: 'PLOT_WORKS_DRIVES_M2',
      unit: 'm2',
      rate: 67.3,
      priceIndex: AWD_PLOT_WORKS_RATE_PACK_PRICE_INDEX,
    });
    expect(pack.find((rate) => rate.id === 'awd-plot-works-footpaths')).toMatchObject({
      label: 'Paths',
      category: 'FOOTPATHS',
      costDriver: 'PLOT_WORKS_FOOTPATHS_M2',
      unit: 'm2',
      rate: 47.29,
    });
    expect(pack.find((rate) => rate.id === 'awd-plot-works-front-gardens')).toMatchObject({
      costDriver: 'FRONT_GARDENS_M2',
      unit: 'm2',
      rate: 7.01,
    });
    expect(pack.find((rate) => rate.id === 'awd-plot-works-rear-gardens')).toMatchObject({
      costDriver: 'REAR_GARDENS_M2',
      unit: 'm2',
      rate: 1.58,
    });
    expect(pack.find((rate) => rate.id === 'awd-plot-works-plot-clearance')).toMatchObject({
      costDriver: 'TOTAL_UNITS',
      unit: 'nr',
      rate: 125,
    });
    expect(pack.find((rate) => rate.id === 'awd-plot-works-steps-borders')).toMatchObject({
      costDriver: 'TOTAL_UNITS',
      unit: 'nr',
      rate: 500,
    });
  });

  it('calculates AWD plot works rows from appraisal cost-driver measures to match workbook column B', () => {
    const driverQuantities = {
      PLOT_WORKS_DRIVES_M2: 6449,
      PLOT_WORKS_FOOTPATHS_M2: 3434,
      FRONT_GARDENS_M2: 6488,
      REAR_GARDENS_M2: 15875,
    };
    const driverRows = createDefaultSiteDimensionRows().map((row) => ({
      ...row,
      quantity: row.costDriver ? driverQuantities[row.costDriver as keyof typeof driverQuantities] ?? 0 : 0,
    }));
    const packRows = createAwdPlotWorksRatePack().map((rate) => createSiteDimensionRowFromRate(rate));
    const option = makeKnownLandOption({
      houseTypeSchedule: [
        createManualHouseTypeScheduleRow({ quantity: 155 }),
      ],
      siteDimensions: [...driverRows, ...packRows],
    });
    const totalFor = (id: string) => {
      const row = option.siteDimensions?.find((entry) => entry.libraryRateId === id);
      expect(row).toBeTruthy();
      return calculateSiteDimensionTotal(row!, option);
    };

    expect(totalFor('awd-plot-works-drives')).toBeCloseTo(434017.7, 2);
    expect(totalFor('awd-plot-works-footpaths')).toBeCloseTo(162393.86, 2);
    expect(totalFor('awd-plot-works-front-gardens')).toBeCloseTo(45480.88, 2);
    expect(totalFor('awd-plot-works-rear-gardens')).toBeCloseTo(25082.5, 2);
    expect(totalFor('awd-plot-works-plot-clearance')).toBeCloseTo(19375, 2);
    expect(totalFor('awd-plot-works-steps-borders')).toBeCloseTo(77500, 2);
  });

  it('creates AWD prelims pack rates with current Scottish statutory fee references', () => {
    const pack = createAwdPrelimsRatePack();
    expect(pack).toHaveLength(AWD_PRELIMS_RATE_DEFINITIONS.length);

    expect(pack.find((rate) => rate.id === 'awd-prelims-architects-fees')).toMatchObject({
      label: 'Architects Fees',
      costDriver: 'TOTAL_GDV',
      unit: 'sum',
      rate: 0.006,
      priceIndex: AWD_PRELIMS_RATE_PACK_PRICE_INDEX,
    });
    expect(pack.find((rate) => rate.id === 'awd-prelims-engineers-fees')).toMatchObject({
      label: 'Engineers Fees',
      costDriver: 'ENGINEERS_FEES_FORMULA',
      unit: 'sum',
      rate: 1,
    });
    const engineersFees = pack.find((rate) => rate.id === 'awd-prelims-engineers-fees');
    expect(engineersFees?.formulaComponents).toBeUndefined();
    expect(engineersFees?.sourceFormula).toContain('£0 pending confirmation');
    expect(pack.find((rate) => rate.id === 'awd-prelims-planning')).toMatchObject({
      costDriver: 'PLANNING_FEES_FORMULA',
      unit: 'sum',
      rate: 1,
    });
    expect(pack.find((rate) => rate.id === 'awd-prelims-building-warrant')).toMatchObject({
      costDriver: 'BUILDING_WARRANT_FORMULA',
      unit: 'sum',
      rate: 1,
      priceIndex: 0,
      sourceRow: 'Scottish Building Standards Procedural Handbook v1.9, 3.15',
    });
    expect(pack.find((rate) => rate.id === 'awd-prelims-assistant-site-manager')).toMatchObject({
      costDriver: 'ASSISTANT_SITE_MANAGER_FORMULA',
      unit: 'month',
      rate: 3750,
      sourceFormula: "Prelims!B23 = IF('Project Data'!E20 > 2, 'Project Data'!E21 * 3750, 0)",
    });
    expect(pack.find((rate) => rate.id === 'awd-prelims-forklift-driver')).toMatchObject({
      costDriver: 'FORKLIFT_DRIVER_FORMULA',
      unit: 'month',
      rate: 3400,
      sourceFormula: 'Prelims!B24 adapted = MAX(0, programme months - lead-in months) * 3400 * selected forklift-driver count (automatic default: 1 or 2 by build rate)',
    });
    expect(pack.find((rate) => rate.id === 'awd-prelims-labourers')).toMatchObject({
      costDriver: 'LABOURERS_FORMULA',
      unit: 'month',
      rate: 3060,
    });
    expect(pack.find((rate) => rate.id === 'awd-prelims-forklifts')).toMatchObject({
      costDriver: 'FORKLIFTS_FORMULA',
      unit: 'month',
      rate: 1716,
      sourceFormula: 'Prelims!B39 adapted = MAX(0, programme months - lead-in months) * 1716 * IF(build rate > 2 units/month, 2, 1)',
    });
    expect(pack.find((rate) => rate.id === 'awd-prelims-forklift-repairs')).toMatchObject({
      costDriver: 'FORKLIFTS_FORMULA', unit: 'month', rate: 212.5,
    });
    expect(pack.find((rate) => rate.id === 'awd-prelims-scottish-water-rebates')).toMatchObject({
      costDriver: 'SCOTTISH_WATER_REBATE_FORMULA',
      unit: 'sum',
      rate: 1,
    });
    expect(pack.filter(rate => AWD_PRELIMS_RATE_DEFINITIONS.find(spec => spec.id === rate.id)?.section === 'STATUTORY_FEES')
      .map(rate => rate.id).slice(3, 6)).toEqual([
        'awd-prelims-scottish-water-charges',
        'awd-prelims-scottish-water-rebates',
        'awd-prelims-scottish-water-connections',
      ]);
  });

  it('upgrades saved Scottish Water prelim lines, prices the house mix and excludes fresh-water infrastructure and connections', () => {
    const option = createDefaultAppraisalOption('RESIDENTIAL_SALES');
    option.houseTypeSchedule = [createManualHouseTypeScheduleRow({ houseTypeName: 'Villa', style: 'SEMI_DETACHED', quantity: 2 })];
    option.siteDimensions = createAwdPrelimsRatePack()
      .filter(rate => rate.id.startsWith('awd-prelims-scottish-water-'))
      .map(rate => ({ ...createSiteDimensionRowFromRate(rate), rate: rate.id.endsWith('-charges') ? 750 : 300, priceIndex: 233, sourceFormula: 'OLD WORKBOOK' }));
    option.siteDimensions.push({ id: 'saved-fresh-water-fee', libraryRateId: 'awd-infrastructure-scottish-water-charges', category: 'OTHER', label: 'Retired fresh-water tariff', unit: 'sum', quantity: 1, rate: 999, priceIndex: 0 });
    option.scottishWaterFees = { contributionBasis: 'BUDGET', eligibleWaterWorksCost: 2500,
      waterContribution: 3000, wastewaterContribution: 0, standardWaterConnections: 1,
      applicationCount: 1, waterInspections: 1, wastewaterInspections: 1 };
    const restored = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(option)));
    const rows = restored.siteDimensions!.filter(row => row.libraryRateId?.startsWith('awd-prelims-scottish-water-'));
    expect(rows).toHaveLength(3);
    expect(rows.every(row => row.rate === 1 && row.priceIndex === 0 && row.unit === 'sum')).toBe(true);
    const byId = (suffix: string) => rows.find(row => row.libraryRateId?.endsWith(suffix))!;
    expect(calculateSiteDimensionTotal(byId('-charges'), restored)).toBeCloseTo(2 * (549.4 + 231));
    expect(calculateSiteDimensionTotal(byId('-rebates'), restored)).toBe(0);
    expect(calculateSiteDimensionTotal(byId('-connections'), restored)).toBeCloseTo(113.7 + 2 * 155.8);
    const freshRows = restored.siteDimensions!.filter(row => row.libraryRateId?.startsWith('awd-infrastructure-scottish-water-'));
    expect(freshRows).toHaveLength(0);
    expect(restored.scottishWaterFees?.waterContribution).toBe(3000);
    expect(rows.reduce((total, row) => total + calculateSiteDimensionTotal(row, restored), 0))
      .toBeCloseTo(2 * (549.4 + 231) + 113.7 + 2 * 155.8);
    const reopened = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(restored)));
    expect(reopened.siteDimensions!.filter(row => row.libraryRateId?.startsWith('awd-infrastructure-scottish-water-'))).toHaveLength(0);
    expect(reopened.siteDimensions!.map(row => row.id)).toEqual(restored.siteDimensions!.map(row => row.id));
  });

  it('recalculates Scottish Water bill rows when the House Types mix changes', () => {
    const option = createDefaultAppraisalOption('RESIDENTIAL_SALES');
    option.houseTypeSchedule = [
      createManualHouseTypeScheduleRow({ style: 'FLAT', quantity: 24 }),
      createManualHouseTypeScheduleRow({ style: 'SEMI_DETACHED', quantity: 50 }),
      createManualHouseTypeScheduleRow({ style: 'DETACHED', quantity: 61 }),
    ];
    option.scottishWaterFees = {
      buildingWaterFlatHomes: 0, buildingWaterSemiTerracedHomes: 0, buildingWaterDetachedHomes: 135,
      applicationCount: 2, waterInspections: 133, wastewaterInspections: 2,
    };
    option.siteDimensions = createAwdPrelimsRatePack()
      .filter(rate => rate.id.startsWith('awd-prelims-scottish-water-'))
      .map(rate => createSiteDimensionRowFromRate(rate));
    const row = (suffix: string) => option.siteDimensions!.find(entry => entry.libraryRateId?.endsWith(suffix))!;
    expect(calculateSiteDimensionTotal(row('-charges'), option)).toBeCloseTo(24 * 187 + 50 * 231 + 61 * 296 + 135 * 549.4);
    expect(calculateSiteDimensionTotal(row('-rebates'), option)).toBeCloseTo(-135 * 549.4 * 0.5);
    expect(calculateSiteDimensionTotal(row('-connections'), option)).toBeCloseTo(2 * 113.7 + 135 * 155.8);
    option.houseTypeSchedule[0].quantity = 25;
    expect(calculateSiteDimensionTotal(row('-charges'), option)).toBeCloseTo(25 * 187 + 50 * 231 + 61 * 296 + 136 * 549.4);
  });

  it('starts Engineers Fees at zero until the scope is confirmed', () => {
    const programmeDriver = createSiteDimensionRowFromRate(createDefaultAppraisalRate({
      id: 'programme-driver',
      costDriver: 'PROGRAMME_MONTHS',
      category: 'OTHER',
      label: 'Programme months',
      unit: 'nr',
      rate: 0,
    }), { isCostDriverInput: true, quantity: 12 });
    const nonStandardDriver = createSiteDimensionRowFromRate(createDefaultAppraisalRate({
      id: 'non-standard-driver',
      costDriver: 'NON_STANDARD_HOUSE_TYPE_COUNT',
      category: 'OTHER',
      label: 'Non-standard house types',
      unit: 'nr',
      rate: 0,
    }), { isCostDriverInput: true, quantity: 3 });
    const engineersRate = createAwdPrelimsRatePack().find((rate) => rate.id === 'awd-prelims-engineers-fees');
    const engineersRow = createSiteDimensionRowFromRate(engineersRate!);
    const option = makeKnownLandOption({
      houseTypeSchedule: [
        createManualHouseTypeScheduleRow({ houseTypeName: 'A', quantity: 8 }),
        createManualHouseTypeScheduleRow({ houseTypeName: 'B', quantity: 2 }),
      ],
      siteDimensions: [programmeDriver, nonStandardDriver, engineersRow],
    });

    expect(calculateSiteDimensionTotal(engineersRow, option)).toBe(0);
  });

  it('calculates staffing formulas from build rate threshold', () => {
    const programmeDriver = createSiteDimensionRowFromRate(createDefaultAppraisalRate({
      id: 'programme-driver',
      costDriver: 'PROGRAMME_MONTHS',
      category: 'OTHER',
      label: 'Programme months',
      unit: 'nr',
      rate: 0,
    }), { isCostDriverInput: true, quantity: 12 });
    const buildRateDriver = createSiteDimensionRowFromRate(createDefaultAppraisalRate({
      id: 'build-rate-driver',
      costDriver: 'BUILD_RATE_UNITS_PER_MONTH',
      category: 'OTHER',
      label: 'Build rate',
      unit: 'nr',
      rate: 0,
    }), { isCostDriverInput: true, quantity: 2 });
    const pack = createAwdPrelimsRatePack();
    const assistantRow = createSiteDimensionRowFromRate(pack.find((rate) => rate.id === 'awd-prelims-assistant-site-manager')!);
    const forkliftDriverRow = createSiteDimensionRowFromRate(pack.find((rate) => rate.id === 'awd-prelims-forklift-driver')!);
    const labourersRow = createSiteDimensionRowFromRate(pack.find((rate) => rate.id === 'awd-prelims-labourers')!);
    const forkliftsRow = createSiteDimensionRowFromRate(pack.find((rate) => rate.id === 'awd-prelims-forklifts')!);
    const optionAtTwo = makeKnownLandOption({
      siteDimensions: [programmeDriver, buildRateDriver, assistantRow, forkliftDriverRow, labourersRow, forkliftsRow],
    });
    expect([assistantRow, forkliftDriverRow, labourersRow, forkliftsRow].every(row => row.unit === 'month')).toBe(true);
    expect(resolveSiteDimensionQuantity(forkliftDriverRow, optionAtTwo)).toBe(12);
    expect(resolveSiteDimensionQuantity(labourersRow, optionAtTwo)).toBe(12);
    expect(calculateSiteDimensionTotal(assistantRow, optionAtTwo)).toBe(0);
    expect(calculateSiteDimensionTotal(forkliftDriverRow, optionAtTwo)).toBe(40800);
    expect(calculateSiteDimensionTotal(labourersRow, optionAtTwo)).toBe(36720);
    expect(calculateSiteDimensionTotal(forkliftsRow, optionAtTwo)).toBe(20592);

    const optionAboveTwo = makeKnownLandOption({
      siteDimensions: [
        programmeDriver,
        { ...buildRateDriver, quantity: 2.1 },
        assistantRow,
        forkliftDriverRow,
        labourersRow,
        forkliftsRow,
      ],
    });
    expect(calculateSiteDimensionTotal(assistantRow, optionAboveTwo)).toBe(45000);
    expect(calculateSiteDimensionTotal(forkliftDriverRow, optionAboveTwo)).toBe(81600);
    expect(resolveSiteDimensionQuantity(forkliftDriverRow, optionAboveTwo)).toBe(24);
    expect(calculateSiteDimensionTotal(labourersRow, optionAboveTwo)).toBe(73440);
    expect(calculateSiteDimensionTotal(forkliftsRow, optionAboveTwo)).toBe(41184);
    const optionWithLeadIn = makeKnownLandOption({
      programme: { leadInMonths: 2 },
      siteDimensions: [programmeDriver, buildRateDriver, forkliftDriverRow, forkliftsRow],
    });
    expect(calculateSiteDimensionTotal(forkliftDriverRow, optionWithLeadIn)).toBe(34000);
    expect(calculateSiteDimensionTotal(forkliftsRow, optionWithLeadIn)).toBe(17160);
    expect(resolveSiteDimensionQuantity(forkliftDriverRow, optionWithLeadIn)).toBe(10);
    expect(resolveSiteDimensionQuantity(forkliftsRow, optionWithLeadIn)).toBe(10);
    const optionWithLongLeadIn = makeKnownLandOption({
      programme: { leadInMonths: 14 },
      siteDimensions: [programmeDriver, buildRateDriver, forkliftDriverRow, forkliftsRow],
    });
    expect(calculateSiteDimensionTotal(forkliftDriverRow, optionWithLongLeadIn)).toBe(0);
    expect(calculateSiteDimensionTotal(forkliftsRow, optionWithLongLeadIn)).toBe(0);
    const twoDrivers = { ...optionWithLeadIn, prelimsResourceCounts: { forkliftDrivers: 2 } };
    expect(calculateSiteDimensionTotal(forkliftDriverRow, twoDrivers)).toBe(68000);
    const siteManagerRow = createSiteDimensionRowFromRate(pack.find((rate) => rate.id === 'awd-prelims-site-manager')!);
    const selectedResources = {
      ...optionWithLeadIn,
      prelimsResourceCounts: { siteManagers: 2, assistantSiteManagers: 1, forkliftDrivers: 0, labourers: 3, forklifts: 2 },
      siteDimensions: [programmeDriver, buildRateDriver, siteManagerRow, assistantRow, forkliftDriverRow, labourersRow, forkliftsRow],
    };
    expect(normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(selectedResources))).prelimsResourceCounts).toEqual({ siteManagers: 2, assistantSiteManagers: 1, forkliftDrivers: 0, labourers: 3, forklifts: 2 });
    expect(calculateSiteDimensionTotal(siteManagerRow, selectedResources)).toBe(144000);
    expect(calculateSiteDimensionTotal(assistantRow, selectedResources)).toBe(45000);
    expect(calculateSiteDimensionTotal(forkliftDriverRow, selectedResources)).toBe(0);
    expect(calculateSiteDimensionTotal(labourersRow, selectedResources)).toBe(110160);
    expect(calculateSiteDimensionTotal(forkliftsRow, selectedResources)).toBe(34320);
    expect(resolveSiteDimensionQuantity(siteManagerRow, selectedResources)).toBe(24);
    expect(resolveSiteDimensionQuantity(labourersRow, selectedResources)).toBe(36);
    expect(normalizeDevelopmentAppraisalOption({ ...optionWithLeadIn, prelimsResourceCounts: { forklifts: -1, labourers: 1.8 } }).prelimsResourceCounts).toEqual({ labourers: 1 });
    const reopened = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify({
      ...optionWithLeadIn,
      houseTypeSchedule: [createManualHouseTypeScheduleRow({ buildPeriodMonths: 10 })],
      siteDimensions: [buildRateDriver, {
        ...forkliftsRow,
        sourceFormula: "Prelims!B39 = IF('Project Data'!E20 > 2, 'Project Data'!E21 * 2125 * 2, 'Project Data'!E21 * 2125)",
        notes: "AWD Prelims Pack. one forklift when build rate is 2 units/month or less. Base formula: Prelims!B39 = IF('Project Data'!E20 > 2, 'Project Data'!E21 * 2125 * 2, 'Project Data'!E21 * 2125). Revised costs ignored.",
      }],
    })));
    const reopenedForklifts = reopened.siteDimensions!.find(row => row.libraryRateId === 'awd-prelims-forklifts')!;
    expect(reopenedForklifts.sourceFormula).toContain('programme months - lead-in months');
    expect(reopenedForklifts.notes).toContain('£1,716 per forklift per active programme month, excluding initial lead-in');
    expect(calculateSiteDimensionTotal(reopenedForklifts, reopened)).toBe(17160);
    const reopenedDriver = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify({
      ...optionWithLeadIn,
      siteDimensions: [programmeDriver, buildRateDriver, {
        ...forkliftDriverRow,
        sourceFormula: "Prelims!B24 = IF('Project Data'!E20 > 2, 'Project Data'!E21 * 3400 * 2, 'Project Data'!E21 * 3400)",
        notes: "AWD Prelims Pack. one driver when build rate is 2 units/month or less. Base formula: Prelims!B24 = IF('Project Data'!E20 > 2, 'Project Data'!E21 * 3400 * 2, 'Project Data'!E21 * 3400).",
      }],
    })));
    const driverRow = reopenedDriver.siteDimensions!.find(row => row.libraryRateId === 'awd-prelims-forklift-driver')!;
    expect(driverRow.sourceFormula).toContain('programme months - lead-in months');
    expect(driverRow.notes).toContain('excluding initial lead-in');
    const legacy = normalizeDevelopmentAppraisalOption({ ...optionWithLeadIn,
      houseTypeSchedule: [createManualHouseTypeScheduleRow({ buildPeriodMonths: 10 })],
      siteDimensions: [
      { ...forkliftDriverRow, unit: 'sum', rate: 1 },
      { ...labourersRow, unit: 'sum', rate: 1 },
      { ...programmeDriver, unit: 'nr' },
    ] });
    const migratedDriver = legacy.siteDimensions!.find(row => row.libraryRateId === 'awd-prelims-forklift-driver')!;
    const migratedLabourers = legacy.siteDimensions!.find(row => row.libraryRateId === 'awd-prelims-labourers')!;
    expect(migratedDriver).toMatchObject({ unit: 'month', rate: 3400 });
    expect(migratedLabourers).toMatchObject({ unit: 'month', rate: 3060 });
    expect(calculateSiteDimensionTotal(migratedDriver, legacy)).toBe(34000);
    expect(calculateSiteDimensionTotal(migratedLabourers, legacy)).toBe(36720);
  });

  it('charges forklift repairs for the same active machine-months as forklift hire', () => {
    const pack = createAwdPrelimsRatePack();
    const forklift = createSiteDimensionRowFromRate(pack.find(rate => rate.id === 'awd-prelims-forklifts')!);
    const repairs = createSiteDimensionRowFromRate(pack.find(rate => rate.id === 'awd-prelims-forklift-repairs')!);
    const programme = createSiteDimensionRowFromRate(createDefaultAppraisalRate({
      id: 'programme-driver-repairs', costDriver: 'PROGRAMME_MONTHS', category: 'OTHER',
      label: 'Programme months', unit: 'nr', rate: 0,
    }), { isCostDriverInput: true, quantity: 63 });
    const option = makeKnownLandOption({
      programme: { leadInMonths: 6 }, siteDimensions: [programme, forklift, repairs],
      prelimsResourceCounts: { forklifts: 1 },
    });
    expect(resolveSiteDimensionQuantity(forklift, option)).toBe(57);
    expect(resolveSiteDimensionQuantity(repairs, option)).toBe(57);
    expect(calculateSiteDimensionTotal(repairs, option)).toBe(57 * 212.5);
    const twoForklifts = { ...option, prelimsResourceCounts: { forklifts: 2 } };
    expect(resolveSiteDimensionQuantity(repairs, twoForklifts)).toBe(114);
    expect(calculateSiteDimensionTotal(repairs, twoForklifts)).toBe(114 * 212.5);
    expect(calculateSiteDimensionTotal(repairs, { ...option, prelimsResourceCounts: { forklifts: 0 } })).toBe(0);
    const legacy = normalizeDevelopmentAppraisalOption({
      ...option, siteDimensions: [programme, forklift, {
        ...repairs, costDriver: 'PROGRAMME_MONTHS',
        sourceFormula: "Prelims!B40 = 'Project Data'!E21 * 4.25 * 50",
        notes: 'AWD Prelims Pack. per programme month. Base formula: Prelims!B40.',
      }],
    });
    expect(legacy.siteDimensions!.find(row => row.libraryRateId === 'awd-prelims-forklift-repairs')).toMatchObject({
      costDriver: 'FORKLIFTS_FORMULA', unit: 'month', rate: 212.5,
      sourceFormula: 'Prelims!B40 adapted = active forklift months * selected forklift count * 212.5',
    });
  });

  it('only applies sales prelims where private houses are for sale', () => {
    const programmeDriver = createSiteDimensionRowFromRate(createDefaultAppraisalRate({
      id: 'programme-driver',
      costDriver: 'PROGRAMME_MONTHS',
      category: 'OTHER',
      label: 'Programme months',
      unit: 'nr',
      rate: 0,
    }), { isCostDriverInput: true, quantity: 12 });
    const pack = createAwdPrelimsRatePack();
    const salesRows = [
      'awd-prelims-sales-cabins',
      'awd-prelims-sales-assistants',
      'awd-prelims-sales-sundries',
      'awd-prelims-show-home-fitout',
      'awd-prelims-advertising',
    ].map((id) => createSiteDimensionRowFromRate(pack.find((rate) => rate.id === id)!));
    const affordableOption = makeKnownLandOption({
      houseTypeSchedule: [
        createManualHouseTypeScheduleRow({ quantity: 4, tenure: 'AFFORDABLE' }),
      ],
      siteDimensions: [programmeDriver, ...salesRows],
    });
    salesRows.forEach((row) => {
      expect(calculateSiteDimensionTotal(row, affordableOption)).toBe(0);
    });

    const privateOption = makeKnownLandOption({
      houseTypeSchedule: [
        createManualHouseTypeScheduleRow({ quantity: 4, tenure: 'PRIVATE' }),
      ],
      siteDimensions: [programmeDriver, ...salesRows],
    });
    expect(resolveSiteDimensionQuantity(salesRows[0], privateOption)).toBe(8);
    expect(calculateSiteDimensionTotal(salesRows[0], privateOption)).toBe(23800);
    expect(calculateSiteDimensionTotal(salesRows[1], privateOption)).toBe(26800);
    expect(calculateSiteDimensionTotal(salesRows[2], privateOption)).toBe(2000);
    expect(calculateSiteDimensionTotal(salesRows[3], privateOption)).toBe(32000);
    expect(resolveSiteDimensionQuantity(salesRows[4], privateOption)).toBe(8);
    expect(calculateSiteDimensionTotal(salesRows[4], privateOption)).toBe(24000);

    const withLeadIn = { ...privateOption, programme: { leadInMonths: 3 } };
    expect(resolveSiteDimensionQuantity(salesRows[0], withLeadIn)).toBe(5);
    expect(calculateSiteDimensionTotal(salesRows[0], withLeadIn)).toBe(14875);
    expect(calculateSiteDimensionTotal(salesRows[1], withLeadIn)).toBe(16750);
    expect(calculateSiteDimensionTotal(salesRows[2], withLeadIn)).toBe(1250);
    expect(calculateSiteDimensionTotal(salesRows[4], withLeadIn)).toBe(15000);

    const adjusted = {
      ...withLeadIn,
      salesMarketingAssumptions: {
        monthlyMarketingRate: 3000,
        includeShowhomeFloorCoverings: false,
        campaignStartMonth: 2,
        campaignEndMonth: 10,
      },
    };
    expect(calculateSiteDimensionTotal(salesRows[3], adjusted)).toBe(26000);
    expect(resolveSiteDimensionQuantity(salesRows[4], adjusted)).toBe(3);
    expect(calculateSiteDimensionTotal(salesRows[4], adjusted)).toBe(9000);
    const reopened = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(adjusted)));
    expect(reopened.salesMarketingAssumptions).toEqual(adjusted.salesMarketingAssumptions);

    const existing = ensureBaseInfrastructureRates({
      ...withLeadIn,
      siteDimensions: withLeadIn.siteDimensions!.map(row => row.libraryRateId === 'awd-prelims-sales-sundries'
        ? { ...row, rate: 212.5 } : row),
    });
    const updatedSundries = existing.siteDimensions!.find(row => row.libraryRateId === 'awd-prelims-sales-sundries')!;
    expect(updatedSundries.rate).toBe(250);
    expect(calculateSiteDimensionTotal(updatedSundries, existing)).toBe(1250);
    const legacyLaunch = { ...salesRows[3], id: 'legacy-marketing-launch', libraryRateId: 'awd-prelims-marketing-launch', rate: 10000 };
    expect(calculateSiteDimensionTotal(legacyLaunch, withLeadIn)).toBe(0);
    expect(normalizeAppraisalRateLibraryItems([createDefaultAppraisalRate({ id: 'awd-prelims-marketing-launch' })])).toHaveLength(0);
    const legacySales = ensureBaseInfrastructureRates({
      ...withLeadIn,
      siteDimensions: [...withLeadIn.siteDimensions!, legacyLaunch]
        .map(row => row.libraryRateId === 'awd-prelims-show-home-fitout' ? { ...row, rate: 35000 }
          : row.libraryRateId === 'awd-prelims-advertising' ? { ...row, rate: 2125 } : row),
    });
    expect(legacySales.siteDimensions!.find(row => row.libraryRateId === 'awd-prelims-show-home-fitout')?.rate).toBe(32000);
    expect(legacySales.siteDimensions!.find(row => row.libraryRateId === 'awd-prelims-advertising')?.rate).toBe(3000);
    expect(legacySales.siteDimensions!.filter(row => row.libraryRateId === 'awd-prelims-marketing-launch')).toHaveLength(0);
    expect(normalizeDevelopmentAppraisalOption({ ...withLeadIn, siteDimensions: [...withLeadIn.siteDimensions!, legacyLaunch] }).siteDimensions!.filter(row => row.libraryRateId === 'awd-prelims-marketing-launch')).toHaveLength(0);
    expect(normalizeDevelopmentAppraisalOption({ ...withLeadIn, salesMarketingAssumptions: { ...adjusted.salesMarketingAssumptions, monthlyMarketingRate: 3500 } }).salesMarketingAssumptions?.monthlyMarketingRate).toBe(3000);

    const beforeShowhouse = { ...privateOption, programme: { leadInMonths: 9 } };
    salesRows.slice(0, 3).forEach((row) => {
      expect(resolveSiteDimensionQuantity(row, beforeShowhouse)).toBe(0);
      expect(calculateSiteDimensionTotal(row, beforeShowhouse)).toBe(0);
    });
    expect(resolveSiteDimensionQuantity(salesRows[4], beforeShowhouse)).toBe(0);
  });

  it('calculates AWD prelims rows from appraisal cost-driver measures to match workbook column B examples', () => {
    const driverRows = createDefaultSiteDimensionRows().map((row) => ({
      ...row,
      quantity: row.costDriver === 'SITE_AREA_M2'
        ? 67790
        : row.costDriver === 'ROADS_M2'
          ? 8387
          : 0,
    }));
    const formulaDriverRows = [
      createDefaultAppraisalRate({
        id: 'driver-programme',
        costDriver: 'PROGRAMME_MONTHS',
        category: 'OTHER',
        label: 'Programme months',
        unit: 'nr',
        rate: 0,
      }),
      createDefaultAppraisalRate({
        id: 'driver-build-rate',
        costDriver: 'BUILD_RATE_UNITS_PER_MONTH',
        category: 'OTHER',
        label: 'Build rate',
        unit: 'nr',
        rate: 0,
      }),
      createDefaultAppraisalRate({
        id: 'driver-summary-build-cost',
        costDriver: 'SUMMARY_BUILD_COST',
        category: 'OTHER',
        label: 'Summary build cost',
        unit: 'sum',
        rate: 0,
      }),
      createDefaultAppraisalRate({
        id: 'driver-building-warrant-basis',
        costDriver: 'BUILDING_WARRANT_COST_BASIS',
        category: 'OTHER',
        label: 'Building warrant basis',
        unit: 'sum',
        rate: 0,
      }),
    ].map((rate) => createSiteDimensionRowFromRate(rate));
    formulaDriverRows[0].isCostDriverInput = true;
    formulaDriverRows[0].quantity = 87.5;
    formulaDriverRows[1].isCostDriverInput = true;
    formulaDriverRows[1].quantity = 2;
    formulaDriverRows[2].isCostDriverInput = true;
    formulaDriverRows[2].quantity = 42365481.25874029;
    formulaDriverRows[3].isCostDriverInput = true;
    formulaDriverRows[3].quantity = 22722111.127360247;

    const targetGdv = 42365481.25874029;
    const totalUnits = 155;
    const houseTypeSchedule = Array.from({ length: 12 }, (_, index) => createManualHouseTypeScheduleRow({
      houseTypeName: `Type ${index + 1}`,
      quantity: index === 0 ? 144 : 1,
      saleValuePerUnit: targetGdv / totalUnits,
    }));
    const packRows = createAwdPrelimsRatePack().map((rate) => createSiteDimensionRowFromRate(rate));
    const option = makeKnownLandOption({
      houseTypeSchedule,
      siteDimensions: [...driverRows, ...formulaDriverRows, ...packRows],
    });
    // Historical workbook RCC formula survives only as a provisional pre-selection allowance.
    option.rccFees = { authority: 'UNCONFIRMED', legacyAllowance: 35548 };
    const totalFor = (id: string) => {
      const row = option.siteDimensions?.find((entry) => entry.libraryRateId === id);
      expect(row).toBeTruthy();
      return calculateSiteDimensionTotal(row!, option);
    };

    expect(totalFor('awd-prelims-architects-fees')).toBeCloseTo(targetGdv * 0.006, 2);
    expect(totalFor('awd-prelims-engineers-fees')).toBe(0);
    expect(totalFor('awd-prelims-landscape-fees')).toBeCloseTo(20337, 2);
    expect(totalFor('awd-prelims-planning')).toBeCloseTo(62003, 2);
    expect(totalFor('awd-prelims-building-warrant')).toBeCloseTo(80427, 2);
    expect(totalFor('awd-prelims-rcc')).toBeCloseTo(35548, 2);
    expect(totalFor('awd-prelims-scottish-water-charges')).toBeCloseTo(85157 + 155 * 238, 2);
    expect(totalFor('awd-prelims-scottish-water-rebates')).toBeCloseTo(-42578.5, 2);
    expect(totalFor('awd-prelims-scottish-water-connections')).toBeCloseTo(425.3 + 155 * 155.8, 2);
    expect(totalFor('awd-prelims-assistant-site-manager')).toBeCloseTo(0, 2);
    expect(totalFor('awd-prelims-forklift-driver')).toBeCloseTo(297500, 2);
    expect(totalFor('awd-prelims-labourers')).toBeCloseTo(267750, 2);
    expect(totalFor('awd-prelims-cabins')).toBeCloseTo(185937.5, 2);
    expect(totalFor('awd-prelims-cctv-cameras')).toBeCloseTo(184078.125, 2);
    expect(totalFor('awd-prelims-forklifts')).toBeCloseTo(150150, 2);
    expect(totalFor('awd-prelims-sales-cabins')).toBeCloseTo(248412.5, 2);
  });

  it('does not rewrite an already-current site allowance on each appraisal open', () => {
    const option = createDefaultAppraisalOption('RESIDENTIAL_SALES');
    const prepared = ensureBaseInfrastructureRates(option);
    expect(ensureBaseInfrastructureRates(prepared)).toBe(prepared);
  });

  it('refreshes AWD infrastructure pack rows without duplicating existing rates', () => {
    const custom = createDefaultAppraisalRate({ id: 'custom-rate', label: 'Custom rate', rate: 12 });
    const staleAwd = createDefaultAppraisalRate({
      id: 'awd-infrastructure-roads',
      label: 'Old roads',
      category: 'ROADS',
      unit: 'm2',
      rate: 1,
    });

    const result = mergeAwdInfrastructureRatePack([custom, staleAwd]);

    expect(result.inserted).toBe(AWD_INFRASTRUCTURE_RATE_DEFINITIONS.length - 1);
    expect(result.updated).toBe(1);
    expect(result.rates.filter((rate) => rate.id === 'awd-infrastructure-roads')).toHaveLength(1);
    expect(result.rates.find((rate) => rate.id === 'awd-infrastructure-roads')?.rate).toBe(25.27);
    expect(result.rates.find((rate) => rate.id === 'custom-rate')?.rate).toBe(12);
  });

  it('refreshes AWD plot works pack rows without duplicating existing rates', () => {
    const custom = createDefaultAppraisalRate({ id: 'custom-rate', label: 'Custom rate', rate: 12 });
    const staleAwd = createDefaultAppraisalRate({
      id: 'awd-plot-works-drives',
      label: 'Old drives',
      category: 'DRIVES',
      unit: 'm2',
      rate: 1,
    });

    const result = mergeAwdPlotWorksRatePack([custom, staleAwd]);

    expect(result.inserted).toBe(AWD_PLOT_WORKS_RATE_DEFINITIONS.length - 1);
    expect(result.updated).toBe(1);
    expect(result.rates.filter((rate) => rate.id === 'awd-plot-works-drives')).toHaveLength(1);
    expect(result.rates.find((rate) => rate.id === 'awd-plot-works-drives')?.rate).toBe(67.3);
    expect(result.rates.find((rate) => rate.id === 'custom-rate')?.rate).toBe(12);
  });

  it('refreshes AWD prelims pack rows without duplicating existing rates', () => {
    const custom = createDefaultAppraisalRate({ id: 'custom-rate', label: 'Custom rate', rate: 12 });
    const staleAwd = createDefaultAppraisalRate({
      id: 'awd-prelims-architects-fees',
      label: 'Old architects',
      category: 'OTHER',
      unit: 'sum',
      rate: 1,
    });

    const result = mergeAwdPrelimsRatePack([custom, staleAwd]);

    expect(result.inserted).toBe(AWD_PRELIMS_RATE_DEFINITIONS.length - 1);
    expect(result.updated).toBe(1);
    expect(result.rates.filter((rate) => rate.id === 'awd-prelims-architects-fees')).toHaveLength(1);
    expect(result.rates.find((rate) => rate.id === 'awd-prelims-architects-fees')?.rate).toBe(0.006);
    expect(result.rates.find((rate) => rate.id === 'custom-rate')?.rate).toBe(12);
  });

  it('normalizes legacy infrastructure categories into cost drivers', () => {
    expect(normalizeAppraisalRateLibraryItems([
      { id: 'legacy-boundary', category: 'BOUNDARY_FENCING', label: 'Boundary', unit: 'bad', rate: 43 },
    ])[0]).toMatchObject({
      costDriver: 'BOUNDARY_FENCING_M',
      unit: 'm',
      rate: 43,
    });

    const appraisal = createDefaultAppraisal();
    const option = createDefaultAppraisalOption('RESIDENTIAL_SALES');
    const normalized = normalizeDevelopmentAppraisals([{
      ...appraisal,
      options: [{
        ...option,
        siteDimensions: [
          { id: 'legacy-roads', category: 'ROADS', label: 'Roads allowance', unit: 'm2', quantity: 100, rate: 50 },
        ],
      }],
    }]);

    const legacyRoads = normalized[0].options[0].siteDimensions?.find((row) => row.id === 'legacy-roads');
    expect(legacyRoads).toMatchObject({
      costDriver: 'ROADS_M2',
      isCostDriverInput: false,
      quantity: 100,
      rate: 50,
    });
  });

  it('normalizes and carries house type price indices into indexed structured costs', () => {
    const normalizedHouseType = normalizeAppraisalHouseTypeLibraryItems([
      { name: 'Type B', gifaM2: 100, buildCostPerM2: 1000, priceIndex: 200 },
    ])[0];
    const option = makeKnownLandOption({
      revenueLines: [],
      costLines: [],
      houseTypeSchedule: [
        createHouseTypeScheduleRowFromLibrary(normalizedHouseType, { quantity: 2 }),
      ],
      siteDimensions: [
        { id: 'roads', category: 'ROADS', label: 'Roads', unit: 'm2', quantity: 100, rate: 50, priceIndex: 200 },
      ],
      programme: {
        appraisalPriceIndex: 220,
        startPriceIndex: 242,
      },
    });

    const summary = summariseHouseBuildingOption(option);

    expect(option.houseTypeSchedule?.[0].priceIndex).toBe(0);
    expect(option.houseTypeSchedule?.[0].costBreakdown?.[0].priceIndex).toBe(200);
    expect(summary.baseHouseConstructionCost).toBe(200000);
    expect(summary.houseConstructionCost).toBeCloseTo(220000, 2);
    expect(summary.siteWorksCost).toBeCloseTo(5500, 2);
    expect(summary.privateHouseConstructionContingency).toBeCloseTo(42000, 2);
    expect(summary.affordableHouseConstructionContingency).toBe(0);
    expect(summary.siteWorksContingency).toBeCloseTo(1050, 2);
    expect(summary.constructionContingency).toBeCloseTo(43050, 2);
    expect(summary.totalStructuredCost).toBeCloseTo(248050, 2);

    const costRows = calculateCostLines(option);
    const contingencyRows = costRows.filter(
      ({ line }) => line.id === 'structured-house-building-contingency',
    );
    expect(contingencyRows).toHaveLength(1);
    expect(contingencyRows[0].amount).toBeCloseTo(43050, 2);
    expect(costRows
      .filter(({ line }) => line.category !== 'OTHER')
      .reduce((total, row) => total + row.amount, 0)).toBeCloseTo(248050, 2);
  });

  it('feeds structured house and site costs into known land appraisal metrics', () => {
    const option = makeKnownLandOption({
      revenueLines: [],
      costLines: [],
      knownLandValue: 100000,
      houseTypeSchedule: [
        createHouseTypeScheduleRowFromLibrary(
          createDefaultAppraisalHouseType({ gifaM2: 100, buildCostPerM2: 1500 }),
          { quantity: 2, saleValuePerUnit: 300000 }
        ),
      ],
      siteDimensions: [
        { id: 'roads', category: 'ROADS', label: 'Roads', unit: 'm2', quantity: 100, rate: 50 },
      ],
    });

    const summary = summariseHouseBuildingOption(option);
    const metrics = calculateAppraisalOption(option);

    expect(summary.totalStructuredCost).toBe(305000);
    expect(metrics.gdv).toBe(600000);
    expect(metrics.nonLandCost).toBe(317200);
    expect(metrics.profit).toBe(182800);

    const overrideMetrics = calculateAppraisalOption({ ...option, overheadPercent: 6 });
    expect(calculateHouseBuildingOverheadCost({ ...option, overheadPercent: 6 })).toBe(18300);
    expect(overrideMetrics.nonLandCost).toBe(323300);
    expect(overrideMetrics.profit).toBe(176700);
  });

  it('calculates indicative net developable area from current site metric inputs', () => {
    const option = makeKnownLandOption({
      revenueLines: [],
      costLines: [],
      houseTypeSchedule: [
        createHouseTypeScheduleRowFromLibrary(
          createDefaultAppraisalHouseType({ gifaM2: 100, buildCostPerM2: 1500 }),
          { quantity: 20, saleValuePerUnit: 300000 }
        ),
      ],
      siteDimensions: [
        { id: 'site', category: 'SITE_AREA', costDriver: 'SITE_AREA_M2', isCostDriverInput: true, label: 'Site area', unit: 'm2', quantity: 10000, rate: 0 },
        { id: 'roads', category: 'ROADS', costDriver: 'ROADS_M2', isCostDriverInput: true, label: 'Roads', unit: 'm2', quantity: 1200, rate: 0 },
        { id: 'paths', category: 'FOOTPATHS', costDriver: 'PATHS_M2', isCostDriverInput: true, label: 'Paths', unit: 'm2', quantity: 300, rate: 0 },
        { id: 'common-landscaping', category: 'COMMON_LANDSCAPING', costDriver: 'COMMON_LANDSCAPING_M2', isCostDriverInput: true, label: 'Common landscaping', unit: 'm2', quantity: 1500, rate: 0 },
        { id: 'planting', category: 'PLANTING', costDriver: 'PLANTING_M2', isCostDriverInput: true, label: 'Planting', unit: 'm2', quantity: 500, rate: 0 },
      ],
    });

    const netArea = calculateNetDevelopableArea(option);

    expect(netArea.grossSiteAreaM2).toBe(10000);
    expect(netArea.totalDeductionsM2).toBe(3500);
    expect(netArea.netDevelopableAreaM2).toBe(6500);
    expect(netArea.netDevelopablePercent).toBe(65);
    expect(netArea.unitsPerNetAcre).toBeCloseTo(12.45, 2);
    expect(netArea.unitsPerNetHectare).toBeCloseTo(30.77, 2);
  });

  it('shows land cost against gross site area and private versus total dwelling GIFA', () => {
    const privateRow = createHouseTypeScheduleRowFromLibrary(
      createDefaultAppraisalHouseType({ gifaM2: 100 }),
      { quantity: 6, tenure: 'PRIVATE' }
    );
    const affordableRow = createHouseTypeScheduleRowFromLibrary(
      createDefaultAppraisalHouseType({ gifaM2: 80 }),
      { quantity: 4, tenure: 'AFFORDABLE' }
    );
    const benchmarks = calculateLandCostBenchmarks(1_000_000, 10_000, [privateRow, affordableRow]);
    expect(benchmarks.grossHectares).toBe(1);
    expect(benchmarks.perGrossHectare).toBe(1_000_000);
    expect(benchmarks.perGrossAcre).toBeCloseTo(404_685.64224, 5);
    expect(benchmarks.privateUnits).toBe(6);
    expect(benchmarks.allUnits).toBe(10);
    expect(benchmarks.perPrivateUnit).toBeCloseTo(1_000_000 / 6, 5);
    expect(benchmarks.perAllUnit).toBe(100_000);
    expect(benchmarks.perPrivateGrossFt2).toBeCloseTo(1_000_000 / (600 * 10.76391041671), 5);
    expect(benchmarks.perAllGrossFt2).toBeCloseTo(1_000_000 / (920 * 10.76391041671), 5);

    const missing = calculateLandCostBenchmarks(1_000_000, 0, []);
    expect(missing.perGrossAcre).toBeNull();
    expect(missing.perPrivateUnit).toBeNull();
    expect(missing.perAllGrossFt2).toBeNull();
  });

  it('calculates house-building programme from tenure split, build period, lead-in, and sales speed', () => {
    const option = makeKnownLandOption({
      revenueLines: [],
      costLines: [],
      houseTypeSchedule: [
        createHouseTypeScheduleRowFromLibrary(
          createDefaultAppraisalHouseType({ gifaM2: 100, buildCostPerM2: 1000, buildPeriodMonths: 8 }),
          { quantity: 6, tenure: 'PRIVATE' }
        ),
        createHouseTypeScheduleRowFromLibrary(
          createDefaultAppraisalHouseType({ gifaM2: 80, buildCostPerM2: 1200, buildPeriodMonths: 6 }),
          { quantity: 4, tenure: 'AFFORDABLE' }
        ),
      ],
      programme: {
        expectedStartDate: '2027-01-01',
        leadInMonths: 2,
        saleRateUnitsPerMonth: 3,
        appraisalPriceIndex: 100,
        startPriceIndex: 110,
      },
    });

    const programme = calculateHouseBuildingProgrammeSummary(option, '2026-06-24');
    const summary = summariseHouseBuildingOption(option);

    expect(programme.totalUnits).toBe(10);
    expect(programme.privateUnits).toBe(6);
    expect(programme.affordableUnits).toBe(4);
    expect(programme.buildPeriodMonths).toBe(8);
    expect(programme.salePeriodMonths).toBe(4);
    expect(programme.programmeMonths).toBe(14);
    expect(programme.expectedEndDate).toBe('2028-03-01');
    expect(summary.baseHouseConstructionCost).toBe(984000);
    expect(summary.houseConstructionCost).toBeCloseTo(984000, 2);
    // The selected house trades are already based at index 215, so a programme
    // moving from 100 to 110 creates no further allowance for those trades.
    expect(summary.constructionContingency).toBe(0);
    expect(summary.constructionIndexUplift).toBe(0);
  });

  it('normalizes legacy residential records as house building and commercial income as commercial', () => {
    const normalized = normalizeDevelopmentAppraisals([
      {
        id: 'residential',
        name: 'Legacy residential',
        status: 'DRAFT',
        options: [{ ...makeKnownLandOption(), id: 'res-opt', template: 'RESIDENTIAL_SALES' }],
      },
      {
        id: 'commercial',
        name: 'Legacy commercial',
        status: 'DRAFT',
        options: [{ ...createDefaultAppraisalOption('COMMERCIAL_INCOME'), id: 'com-opt', template: 'COMMERCIAL_INCOME' }],
      },
    ]);

    expect(normalized.find((entry) => entry.id === 'residential')?.kind).toBe('HOUSE_BUILDING');
    expect(normalized.find((entry) => entry.id === 'commercial')?.kind).toBe('COMMERCIAL');
    expect(normalized.find((entry) => entry.id === 'residential')?.options[0].siteDimensions?.length).toBeGreaterThan(0);
  });

  it('normalizes appraisal cost pack metadata and calculation labels', () => {
    const normalized = normalizeDevelopmentAppraisals([
      { id: 'awd', name: 'AWD appraisal', status: 'DRAFT', costPackId: 'AWD', options: [makeKnownLandOption()] },
      { id: 'legacy', name: 'Legacy appraisal', status: 'DRAFT', costPackId: 'OLD', options: [makeKnownLandOption()] },
    ]);

    expect(normalized.find((entry) => entry.id === 'awd')?.costPackId).toBe('AWD');
    expect(normalized.find((entry) => entry.id === 'legacy')?.costPackId).toBeUndefined();
    expect(APPRAISAL_MODE_LABELS.KNOWN_LAND_PROFIT_ON_GDV).toBe('Known land / project profit');
  });

  it('migrates missing agreed rows across editable legacy appraisals without changing site staffing choices', () => {
    const source = makeKnownLandOption();
    source.houseTypeSchedule = [createManualHouseTypeScheduleRow({ houseTypeName: 'Site house', quantity: 1 })];
    source.siteDimensions = (source.siteDimensions || []).filter(row => row.libraryRateId !== 'awd-prelims-consumables');
    source.prelimsResourceCounts = { siteManagers: 0, assistantSiteManagers: 1, labourers: 0 };
    source.rccFees = { authority: 'NOT_REQUIRED', note: 'No RCC payment for this site.' };
    const [first] = normalizeDevelopmentAppraisals([{
      id: 'legacy-pricing', name: 'Legacy pricing', status: 'DRAFT', kind: 'HOUSE_BUILDING', options: [source],
    }]);
    const option = first.options[0];
    expect(option.agreedRateBasisVersion).toBe(2);
    expect(option.prelimsResourceCounts).toEqual(source.prelimsResourceCounts);
    expect(option.rccFees?.authority).toBe('NOT_REQUIRED');
    expect(option.siteDimensions?.some(row => row.libraryRateId === 'awd-prelims-consumables')).toBe(true);
    expect(option.siteDimensions?.some(row => row.libraryRateId === 'awd-infrastructure-service-strips')).toBe(true);
    expect(option.siteDimensions?.some(row => row.libraryRateId === 'awd-plot-works-drives')).toBe(true);
    const again = normalizeDevelopmentAppraisals([first])[0].options[0];
    expect(again.siteDimensions?.length).toBe(option.siteDimensions?.length);
    expect(new Set(again.siteDimensions?.map(row => row.libraryRateId).filter(Boolean)).size)
      .toBe(again.siteDimensions?.filter(row => row.libraryRateId).length);
  });

  it('leaves a fixed Prelims schedule unpriced in an empty land outline', () => {
    const source = createDefaultAppraisalOption('RESIDENTIAL_SALES');
    const [outline] = normalizeDevelopmentAppraisals([{
      id: 'empty-outline', name: 'Empty outline', status: 'DRAFT', kind: 'HOUSE_BUILDING', options: [source],
    }]);
    const option = outline.options[0];
    const fee = option.siteDimensions!.find(row => row.libraryRateId === 'awd-prelims-principal-designer-fees')!;
    expect(option.unpricedOutlineUntilSiteInputs).toBe(true);
    expect(calculateSiteDimensionTotal(fee, option)).toBe(0);
    option.houseTypeSchedule = [createManualHouseTypeScheduleRow({ quantity: 2 })];
    expect(calculateSiteDimensionTotal(fee, option)).toBe(3500);
  });

  it('refreshes only generated workbook Prelims defaults in editable appraisals', () => {
    const source = normalizeDevelopmentAppraisalOption(makeKnownLandOption());
    const generated = (id: string, rate: number) => ({
      ...source.siteDimensions!.find(row => row.libraryRateId === id)!,
      rate,
      notes: 'AWD Prelims Pack. per programme month. Base formula: old workbook formula.',
    });
    source.agreedRateBasisVersion = 1;
    source.siteDimensions = [
      ...source.siteDimensions!.filter(row => ![
        'awd-prelims-furniture', 'awd-prelims-rates', 'awd-prelims-sales-assistants',
      ].includes(row.libraryRateId || '')),
      generated('awd-prelims-furniture', 1250),
      { ...generated('awd-prelims-rates', 390), manualAdjustment: -25 },
      generated('awd-prelims-sales-assistants', 1500),
    ];
    source.prelimsResourceCounts = { siteManagers: 0, assistantSiteManagers: 1, labourers: 0 };
    source.rccFees = { authority: 'NOT_REQUIRED' };
    const option = normalizeDevelopmentAppraisalOption(source);
    expect(option.agreedRateBasisVersion).toBe(2);
    expect(option.siteDimensions!.find(row => row.libraryRateId === 'awd-prelims-furniture')?.rate).toBe(0);
    expect(option.siteDimensions!.find(row => row.libraryRateId === 'awd-prelims-rates')).toMatchObject({ rate: 150, manualAdjustment: -25 });
    expect(option.siteDimensions!.find(row => row.libraryRateId === 'awd-prelims-sales-assistants')?.rate).toBe(1500);
    expect(option.prelimsResourceCounts).toEqual(source.prelimsResourceCounts);
    expect(option.rccFees?.authority).toBe('NOT_REQUIRED');
  });

});
