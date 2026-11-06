import { describe, expect, it } from 'vitest';
import { calculateScottishStatutoryFees2026, calculateSiteDimensionBaseTotal, calculateSiteDimensionStartPriceIndexContingency, createDefaultAppraisalOption, normalizeDevelopmentAppraisalOption } from './appraisal';
import { scottishBuildingWarrantFee2026, scottishResidentialPlanningFee2026, scottishResidentialPppFee2026 } from './scottishStatutoryFees2026';
import type { AppraisalSiteDimensionRow } from '../types';

const feeRow = (id: string, costDriver: AppraisalSiteDimensionRow['costDriver']): AppraisalSiteDimensionRow => ({
  id, libraryRateId:`awd-prelims-${id}`, category:'OTHER', label:id, costDriver,
  unit:'sum', quantity:1, rate:1, priceIndex:233, isCostDriverInput:false,
});

describe('Scottish statutory application fees effective 1 April 2026', () => {
  it('charges full new-dwellings planning applications at the 2026 category 1 bands and cap', () => {
    expect([0,1,10,11,49,50,60].map(scottishResidentialPlanningFee2026))
      .toEqual([0,742,7420,7977,29143,29453,32553]);
    expect(scottishResidentialPlanningFee2026(1000)).toBe(185524);
  });
  it('uses rounded-up site area for residential permission in principle', () => {
    expect(scottishResidentialPppFee2026(1,0)).toBe(742);
    expect(scottishResidentialPppFee2026(2,0)).toBe(0);
    expect(scottishResidentialPppFee2026(2,1001)).toBe(1484);
    expect(scottishResidentialPppFee2026(2,25000)).toBe(18550);
    expect(scottishResidentialPppFee2026(2,25001)).toBe(18921);
    expect(scottishResidentialPppFee2026(2,1000000)).toBe(92762);
  });
  it('uses each 2026 warrant value-of-works step, including partial steps over £1m', () => {
    const values=[5000,5001,10000,10001,20000,20001,50000,50001,100000,100001,500000,500001,1000000,1000001,1100000,1100001];
    expect(values.map(value => scottishBuildingWarrantFee2026(value).grossFee))
      .toEqual([215,237,435,461,695,780,950,1035,1375,1513,4135,4374,6525,6864,6864,7203]);
  });
  it('applies only selected approved-certifier discounts', () => {
    expect(scottishBuildingWarrantFee2026(50000,{structure:true,electrical:true}))
      .toMatchObject({grossFee:950,discount:145,payable:805});
    expect(scottishBuildingWarrantFee2026(150000,{structure:true,drainage:true}))
      .toMatchObject({grossFee:1789,discount:232.57,payable:1556.43});
  });
  it('feeds the two Prelims lines from different statutory bases without construction-index uplift', () => {
    const option=createDefaultAppraisalOption('RESIDENTIAL_SALES',undefined,'HOUSE_BUILDING');
    option.houseTypeSchedule=[{id:'a',houseTypeName:'One house',quantity:1,gifaM2:100,buildCostPerM2:1000,saleValuePerUnit:200000,priceIndex:233}];
    option.programme={appraisalPriceIndex:300,startPriceIndex:320};
    option.siteDimensions=[feeRow('planning','PLANNING_FEES_FORMULA'),feeRow('building-warrant','BUILDING_WARRANT_FORMULA')];
    option.scottishStatutoryFees={warrantValueOfWorks:100000};
    const planning=option.siteDimensions[0], warrant=option.siteDimensions[1];
    expect(calculateSiteDimensionBaseTotal(planning,option)).toBe(742);
    expect(calculateSiteDimensionBaseTotal(warrant,option)).toBe(1375);
    expect(calculateSiteDimensionStartPriceIndexContingency(planning,option)).toBe(0);
    expect(calculateSiteDimensionStartPriceIndexContingency(warrant,option)).toBe(0);
    option.scottishStatutoryFees.warrantValueOfWorks=100001;
    expect(calculateSiteDimensionBaseTotal(warrant,option)).toBe(1513);
    const saved=normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(option)),undefined,'HOUSE_BUILDING');
    expect(saved.scottishStatutoryFees?.warrantValueOfWorks).toBe(100001);
    expect(saved.siteDimensions?.find(row=>row.id==='planning')?.priceIndex).toBe(0);
    expect(saved.siteDimensions?.find(row=>row.id==='building-warrant')?.priceIndex).toBe(0);
    expect(calculateScottishStatutoryFees2026(saved).warrant.payable).toBe(1513);
  });
});
