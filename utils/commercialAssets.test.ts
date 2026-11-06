import { describe, expect, it } from 'vitest';
import type { DevelopmentAppraisalOption } from '../types';
import { applyCommercialAssetAssessment, getCommercialAssets } from './commercialAssets';
import { createCashflowProfile } from './appraisal';
import { normalizeDevelopmentAppraisalOption } from './appraisal';

function option(): DevelopmentAppraisalOption {
  return {
    id: 'commercial-option',
    name: 'Commercial option',
    template: 'COMMERCIAL_INCOME',
    calculationMode: 'KNOWN_LAND_PROFIT_ON_GDV',
    durationMonths: 12,
    targetProfitOnGdvPercent: 0,
    financeAnnualRatePercent: 0,
    revenueLines: [{
      id: 'commercial-template-revenue-old', title: 'Template income', template: 'COMMERCIAL_INCOME', annualRent: 100000,
      cashflow: createCashflowProfile('END', 12),
    }],
    costLines: [{
      id: 'commercial-template-cost-old', title: 'Template cost', category: 'CONSTRUCTION', amount: 300000,
      cashflow: createCashflowProfile('EVEN', 12),
    }],
    commercialAssets: [{
      id: 'template', title: 'Template asset', source: 'TEMPLATE', included: true, revenueModel: 'LEASE',
      revenueLineIds: ['commercial-template-revenue-old'], costLineIds: ['commercial-template-cost-old'], createdAt: '', updatedAt: '',
    }],
    recommended: false, assumptions: '', decisionNote: '', finalReportExecutiveSummary: '', finalReportSourceSignature: '', createdAt: '', updatedAt: '',
  };
}

describe('commercial asset assessment', () => {
  it('replaces the starting template rows with separately assessed assets', () => {
    const assessed = applyCommercialAssetAssessment(option(), [{
      title: 'Primary income asset', included: true, revenueModel: 'LEASE', siteAllocationM2: 600,
      annualIncome: 120000, operatingCostPercent: 10, revenueGrowthPercent: 2, lifecycleCapexPercent: 1,
      exitYieldPercent: 5.5, sellingCostsPercent: 2, developmentCost: 450000, costTitle: 'Primary works', rationale: 'Assessment basis', excludedReason: '',
    }, {
      title: 'Secondary income asset', included: true, revenueModel: 'CONCESSION', siteAllocationM2: 200,
      annualIncome: 25000, operatingCostPercent: 20, revenueGrowthPercent: 2, lifecycleCapexPercent: 2,
      exitYieldPercent: 7, sellingCostsPercent: 2, developmentCost: 80000, costTitle: 'Secondary works', rationale: 'Assessment basis', excludedReason: '',
    }]);

    expect(assessed.revenueLines).toHaveLength(2);
    expect(assessed.costLines).toHaveLength(2);
    expect(assessed.revenueLines.some((line) => line.id.includes('old'))).toBe(false);
    expect(getCommercialAssets(assessed)).toHaveLength(2);
    expect(getCommercialAssets(assessed).map((asset) => asset.title)).toEqual(['Primary income asset', 'Secondary income asset']);
  });

  it('retains asset metadata and initial assessment briefs through workspace normalisation', () => {
    const source = {
      ...option(),
      commercialAssets: [{ ...option().commercialAssets![0], rationale: 'Commercial basis' }],
      commercialInitialAssessmentBriefs: [{ id: 'brief', fileName: 'brief.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 10, uploadedAt: '2026-07-01T00:00:00.000Z', dataUrl: 'data:text/plain;base64,dGVzdA==', notes: 'Context', extractedText: 'Brief text', extractionStatus: 'EXTRACTED' }],
    };
    const normalised = normalizeDevelopmentAppraisalOption(source, undefined, 'COMMERCIAL');

    expect(normalised.commercialAssets?.[0]?.rationale).toBe('Commercial basis');
    expect(normalised.commercialInitialAssessmentBriefs?.[0]?.fileName).toBe('brief.docx');
  });

  it('carries separate shared site costs alongside asset-specific costs', () => {
    const assessed = applyCommercialAssetAssessment(option(), [{
      title: 'Mobility hub', included: true, revenueModel: 'LEASE', siteAllocationM2: 500,
      annualIncome: 150000, operatingCostPercent: 10, revenueGrowthPercent: 2, lifecycleCapexPercent: 1,
      exitYieldPercent: 5.5, sellingCostsPercent: 2, developmentCost: 600000, costTitle: 'Mobility hub works', rationale: 'Assessment basis', excludedReason: '',
    }], [{
      title: 'Grid reinforcement allowance', category: 'ABNORMALS', amount: 180000, notes: 'Shared utility allowance from the initial commercial assessment.',
    }]);

    expect(assessed.costLines).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Mobility hub works', amount: 600000 }),
      expect.objectContaining({ title: 'Grid reinforcement allowance', category: 'ABNORMALS', amount: 180000 }),
    ]));
  });
});
