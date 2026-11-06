import { describe, expect, it } from 'vitest';
import type { AppraisalHouseTypeLibraryItem, AppraisalRateLibraryItem } from '../types';
import { calculateAppraisalOption, createDefaultAppraisal, normalizeDevelopmentAppraisals } from './appraisal';
import { buildFinalReportData } from './appraisalFinalReport';
import { freezeAppraisalVersion, preserveFrozenAppraisals, refreshRevisionLibraryPrices, thawAppraisalOption } from './appraisalFreeze';
import { refreshLinkedAbnormalAppraisal } from './appraisalLinkedAbnormals';
import { calculateCommercialFinancialAssurance } from './commercialLifecycle';

describe('frozen appraisal revisions', () => {
  it('retains its source, calculated totals and report after normalisation or later edits', () => {
    const source = createDefaultAppraisal();
    source.options[0].calculationMode = 'KNOWN_LAND_PROFIT_ON_GDV';
    source.options[0].knownLandValue = 500_000;
    const frozen = freezeAppraisalVersion(source, '2026-10-14T10:00:00.000Z');
    const stored = JSON.parse(JSON.stringify(frozen));
    const loaded = normalizeDevelopmentAppraisals([stored])[0];

    expect(loaded).toEqual(stored);
    expect(loaded.frozenAt).toBe('2026-10-14T10:00:00.000Z');
    expect(calculateAppraisalOption(loaded.options[0])).toEqual(frozen.options[0].frozenMetrics);
    expect(buildFinalReportData(loaded.options[0])).toEqual(frozen.options[0].frozenReportData);
    expect(refreshLinkedAbnormalAppraisal(loaded, [])).toBe(loaded);

    const proposed = [{ ...loaded, name: 'Changed', options: [] }];
    expect(preserveFrozenAppraisals([loaded], proposed)[0]).toBe(loaded);
    expect(preserveFrozenAppraisals([loaded], [])).toContain(loaded);
  });

  it('clears frozen results and adopts current linked library prices in a new revision', () => {
    const source = createDefaultAppraisal();
    const option = source.options[0];
    option.houseTypeSchedule = [{
      id: 'house-row', libraryHouseTypeId: 'house-library', houseTypeName: 'House',
      quantity: 3, gifaM2: 100, buildCostPerM2: 1_000, priceIndex: 215,
    }];
    option.siteDimensions = [{
      id: 'rate-row', libraryRateId: 'rate-library', category: 'OTHER', label: 'Item',
      unit: 'm2', quantity: 10, rate: 5, priceIndex: 215,
    }];
    const frozen = freezeAppraisalVersion(source);
    frozen.options[0].finalReportExecutiveSummary = 'Historic approved narrative';
    const editable = thawAppraisalOption(frozen.options[0]);
    const houseLibrary = [{ id: 'house-library', buildCostPerM2: 1_400, priceIndex: 233 }] as AppraisalHouseTypeLibraryItem[];
    const rateLibrary = [{ id: 'rate-library', rate: 8, priceIndex: 233 }] as AppraisalRateLibraryItem[];
    const refreshed = refreshRevisionLibraryPrices(editable, houseLibrary, rateLibrary);

    expect(editable.frozenMetrics).toBeUndefined();
    expect(editable.frozenReportData).toBeUndefined();
    expect(editable.finalReportExecutiveSummary).toBeUndefined();
    expect(refreshed.houseTypeSchedule?.[0]).toMatchObject({ quantity: 3, buildCostPerM2: 1_400, priceIndex: 233 });
    expect(refreshed.siteDimensions?.[0]).toMatchObject({ quantity: 10, rate: 8, priceIndex: 233 });
    expect(frozen.options[0].houseTypeSchedule?.[0].buildCostPerM2).toBe(1_000);
    expect(frozen.options[0].siteDimensions?.[0].rate).toBe(5);
  });

  it('holds commercial lifecycle scenarios at their frozen values', () => {
    const source = createDefaultAppraisal(null, undefined, 'COMMERCIAL');
    const frozen = freezeAppraisalVersion(source);
    const frozenOption = frozen.options[0];
    expect(frozenOption.frozenCommercialAssurance).toBeDefined();
    expect(calculateCommercialFinancialAssurance(frozenOption)).toEqual(frozenOption.frozenCommercialAssurance);
    expect(thawAppraisalOption(frozenOption).frozenCommercialAssurance).toBeUndefined();
  });
});
