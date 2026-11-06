import {it,expect} from 'vitest';
import type {AppraisalSiteDimensionRow} from '../types';
import {createDefaultAppraisalOption,normalizeDevelopmentAppraisalOption,calculateSiteDimensionBaseTotal,calculateSiteDimensionManualAdjustment,calculateSiteDimensionTotal,calculateSiteDimensionStartPriceIndexContingency,calculateAppraisalOption,buildMonthlyCashflow} from './appraisal';
import {buildAppraisalTradePackageBudget} from './appraisalTradePackageBudget';
const allowance=(adjustment?:number):AppraisalSiteDimensionRow=>({id:'saved-prelim',libraryRateId:'awd-prelims-review-allowance',label:'Review preliminaries',category:'OTHER',unit:'sum',costDriver:'FIXED_SUM',quantity:1,rate:10000,priceIndex:233,manualAdjustment:adjustment,notes:'Existing evidence'});
const option=(adjustment?:number)=>normalizeDevelopmentAppraisalOption({...createDefaultAppraisalOption(),mode:'KNOWN_LAND_VALUE',knownLandValue:0,financeAnnualRatePercent:0,overheadPercent:0,programme:{appraisalPriceIndex:233,startPriceIndex:240},siteDimensions:[allowance(adjustment)]});
it('preserves a signed adjustment on save/reopen and indexes the adjusted base once',()=>{
 const o=option(1500),row=o.siteDimensions!.find(row=>row.id==='saved-prelim')!;
 expect(calculateSiteDimensionBaseTotal(row,o)).toBe(10000);expect(calculateSiteDimensionManualAdjustment(row,o)).toBe(1500);expect(calculateSiteDimensionTotal(row,o)).toBe(11500);
 expect(calculateSiteDimensionStartPriceIndexContingency(row,o)).toBeCloseTo(11500*(240/233-1),6);
 const copied=normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(o)));expect(copied.siteDimensions!.find(row=>row.id==='saved-prelim')).toMatchObject({manualAdjustment:1500,rate:10000,quantity:1,priceIndex:233,notes:'Existing evidence'});
 expect(buildAppraisalTradePackageBudget(o).allowances.find(row=>row.id==='prelims-saved-prelim')?.amount).toBeCloseTo(11500*240/233,6);
});
it('supports deductions and clearing, without allowing a negative line cost',()=>{
 const row=allowance(-2500);expect(calculateSiteDimensionTotal(row)).toBe(7500);
 row.manualAdjustment=-20000;expect(calculateSiteDimensionManualAdjustment(row)).toBe(-10000);expect(calculateSiteDimensionTotal(row)).toBe(0);
 row.manualAdjustment=0;expect(calculateSiteDimensionTotal(row)).toBe(10000);
 row.manualAdjustment=NaN;expect(calculateSiteDimensionTotal(row)).toBe(10000);
 expect(calculateSiteDimensionTotal({...allowance(5000),libraryRateId:'awd-plot-works-review'})).toBe(10000);
});
it('passes the same adjusted cost into profit, cashflow and summary calculations',()=>{
 const before=option(),after=option(1500),delta=1500*240/233;
 const oldMetrics=calculateAppraisalOption(before),newMetrics=calculateAppraisalOption(after);
 expect(newMetrics.nonLandCost-oldMetrics.nonLandCost).toBeCloseTo(delta,6);expect(oldMetrics.profit-newMetrics.profit).toBeCloseTo(delta,6);
 const outflow=(o:ReturnType<typeof option>)=>buildMonthlyCashflow(o,0).rows.reduce((sum,row)=>sum+row.outflowBeforeFinance,0);
 expect(outflow(after)-outflow(before)).toBeCloseTo(delta,6);
});
it('keeps a manual delta independent of a changing calculated allowance',()=>{
 const o=option(500),row=o.siteDimensions!.find(row=>row.id==='saved-prelim')!;
 row.rate=12000;expect(calculateSiteDimensionTotal(row,o)).toBe(12500);expect(row.manualAdjustment).toBe(500);
 const negative=option(-500);expect(normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(negative))).siteDimensions!.find(row=>row.id==='saved-prelim')?.manualAdjustment).toBe(-500);
});
