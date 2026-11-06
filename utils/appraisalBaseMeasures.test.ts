import {it, expect} from 'vitest';
import {createDefaultAppraisalOption,normalizeDevelopmentAppraisalOption,calculateSiteDimensionTotal,calculateAppraisalOption} from './appraisal';
it('uses one shared site area for all three allowances and retains other infrastructure', () => {
 const o=normalizeDevelopmentAppraisalOption({...createDefaultAppraisalOption(), siteDimensions:[{id:'site',isCostDriverInput:true,costDriver:'SITE_AREA_M2',category:'SITE_AREA',label:'Site area',unit:'m2',quantity:10000,rate:0},{id:'road',libraryRateId:'awd-infrastructure-roads',costDriver:'ROADS_M2',category:'ROADS',label:'Roads',unit:'m2',quantity:0,rate:108.83}]});
 const amount=(id:string)=>calculateSiteDimensionTotal(o.siteDimensions!.find(r=>r.libraryRateId===id)!,o);
 expect(amount('awd-infrastructure-topsoil-strip-stockpile')).toBe(8700);
 expect(amount('awd-infrastructure-cut-and-fill')).toBe(31900);
 expect(amount('awd-infrastructure-clear-site-vegetation')).toBe(2500);
 expect(o.siteDimensions!.some(r=>r.id==='road')).toBe(true);
 o.siteDimensions!.find(r=>r.costDriver==='SITE_AREA_M2'&&r.isCostDriverInput)!.quantity=20000;
 expect(amount('awd-infrastructure-cut-and-fill')).toBe(63800);
 const next=normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(o)));
 expect(calculateAppraisalOption(next)).toEqual(calculateAppraisalOption(o));
 expect(next.siteDimensions!.filter(r=>r.libraryRateId==='awd-infrastructure-cut-and-fill')).toHaveLength(1);
});
it('updates legacy cut and fill once and preserves subsequent user edits',()=>{
 const o=normalizeDevelopmentAppraisalOption({...createDefaultAppraisalOption(),siteDimensions:[{id:'cut',libraryRateId:'awd-infrastructure-cut-and-fill',costDriver:'SITE_AREA_M2',category:'SITE_AREA',label:'Cut and fill',unit:'m2',quantity:0,rate:4.5}]});
 const row=o.siteDimensions!.find(r=>r.id==='cut')!;expect(row.rate).toBe(3.19);row.rate=3.5;
 expect(normalizeDevelopmentAppraisalOption(o).siteDimensions!.find(r=>r.id==='cut')!.rate).toBe(3.5);
});

it('removes the retired surveys allowance from existing appraisals and totals',()=>{
 const original={...createDefaultAppraisalOption(),financeAnnualRatePercent:0,overheadPercent:0,siteDimensions:[{id:'survey',libraryRateId:'awd-infrastructure-surveys-reports',category:'OTHER' as const,label:'Surveys and reports',unit:'nr' as const,quantity:2,rate:227}]};
 const next=normalizeDevelopmentAppraisalOption(original);
 expect(next.siteDimensions?.some(row=>row.libraryRateId==='awd-infrastructure-surveys-reports')).toBe(false);
 expect(calculateAppraisalOption(original).nonLandCost-calculateAppraisalOption(next).nonLandCost).toBe(454);
});
