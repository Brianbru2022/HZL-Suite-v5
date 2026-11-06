import {describe,it,expect} from 'vitest';
import {createDefaultAppraisal,createDefaultAppraisalOption,createDefaultCostLine,normalizeDevelopmentAppraisalOption,calculateSiteDimensionBaseTotal,calculateCostLineAmount,calculateAppraisalOption} from './appraisal';
import {applyEngineeringScope,createEngineeringScope,engineeringMeasures,engineeringScopeReview,normalizeEngineeringScope} from './appraisalEngineeringScope';
import {ENGINEERING_FEE_ITEMS} from './appraisalEngineeringCatalogue';
import {ABNORMAL_CATEGORIES,presetSiteCostAllocation} from './appraisalAbnormalCatalog';
import {buildFinalReportData,buildFinalReportAiContext} from './appraisalFinalReport';
import type {AppraisalEngineeringScope,DevelopmentAppraisalOption} from '../types';
const option=():DevelopmentAppraisalOption=>({...createDefaultAppraisalOption('RESIDENTIAL_SALES',undefined,'HOUSE_BUILDING'),overheadPercent:0,financeAnnualRatePercent:0,calculationMode:'KNOWN_LAND_PROFIT_ON_GDV',knownLandValue:0,
  programme:{appraisalPriceIndex:233,startPriceIndex:233},houseTypeSchedule:[{id:'a',libraryHouseTypeId:'A',houseTypeName:'A',quantity:6,gifaM2:80,buildCostPerM2:1000,saleValuePerUnit:200000},{id:'b',libraryHouseTypeId:'B',houseTypeName:'B',quantity:4,gifaM2:90,buildCostPerM2:1000,saleValuePerUnit:220000}],costLines:[],
  siteDimensions:[{id:'engineer',category:'OTHER',label:'Engineers fees',costDriver:'ENGINEERS_FEES_FORMULA',libraryRateId:'awd-prelims-engineers-fees',unit:'sum',quantity:1,rate:1,priceIndex:233,isCostDriverInput:false}]});
const confirmed=():AppraisalEngineeringScope=>{const scope=createEngineeringScope();for(const item of Object.values(scope.items))if(item.decision==='PENDING')item.decision='NOT_REQUIRED';return scope;};
describe('Engineer’s scope from Allanwater fees',()=>{
 it('retains all source scope lines with unique references and excludes inconsistent column G from fits',()=>{
  expect(ENGINEERING_FEE_ITEMS).toHaveLength(62);expect(new Set(ENGINEERING_FEE_ITEMS.map(x=>x.id)).size).toBe(62);
  expect(ENGINEERING_FEE_ITEMS.some(x=>['1.13','1.14','2.07','3.SA','4.04','5.01','6.02','6.07'].includes(x.id))).toBe(false);
  for(const id of ['2.01','3.01','4.01','4.02','4.03','4.07']){const d=ENGINEERING_FEE_ITEMS.find(x=>x.id===id)!;const obs=d.references.filter(x=>!x.excludedFromFit && typeof x.value==='number' && x.value>0);const rate=obs.reduce((s,x)=>s+Number(x.value)*(d.driver==='houses'?x.houses:x.units),0)/obs.reduce((s,x)=>s+(d.driver==='houses'?x.houses:x.units)**2,0);expect(d.fit?.perUnitRate).toBe(Math.round(rate*100)/100);expect(d.fixedFee>0).toBe(d.fit!.looFixed<d.fit!.looPerUnit);}
 });
 it('starts at zero until a confirmed scope is applied, including when a draft is saved',()=>{
  const o=normalizeDevelopmentAppraisalOption(option());const row=o.siteDimensions!.find(x=>x.id==='engineer')!;
  row.rate=2;
  expect(calculateSiteDimensionBaseTotal(row,o)).toBe(0);
  o.engineeringScopeDraft=confirmed();
  expect(calculateSiteDimensionBaseTotal(row,o)).toBe(0);
  expect(calculateSiteDimensionBaseTotal(row,normalizeDevelopmentAppraisalOption(o))).toBe(0);
 });
 it('retains the historical fee on a frozen revision and starts a new revision at zero',()=>{
  const o=option();const row=o.siteDimensions!.find(x=>x.id==='engineer')!;
  o.frozenMetrics=calculateAppraisalOption(o);
  const frozenFee=calculateSiteDimensionBaseTotal(row,o);
  expect(frozenFee).toBeGreaterThan(0);
  expect(calculateSiteDimensionBaseTotal(row,{...o,frozenMetrics:undefined})).toBe(0);
 });
 it('uses the confirmed normal scope total directly for the Prelims fee',()=>{
  const original=option();
  const fee=original.siteDimensions!.find(x=>x.id==='engineer')!;
  fee.rate=2; // A retained legacy rate must not multiply a confirmed scope amount.
  const pending=calculateSiteDimensionBaseTotal(fee,original);
  const applied=applyEngineeringScope(original,confirmed());
  const confirmedFee=applied.siteDimensions!.find(x=>x.id==='engineer')!;
  expect(pending).toBe(0);
  expect(calculateSiteDimensionBaseTotal(confirmedFee,applied)).toBe(engineeringScopeReview(applied).normal);
  expect(calculateSiteDimensionBaseTotal(confirmedFee,normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(applied))))).toBe(engineeringScopeReview(applied).normal);
  expect(applied.costLines).toHaveLength(0);
 });
 it('requires scope decisions and prices before application; foundation design is compulsory per house type',()=>{
  expect(()=>applyEngineeringScope(option(),createEngineeringScope())).toThrow(/Confirm every/);
  const s=confirmed();s.items['2.01']={decision:'REQUIRED',pricingMode:'MANUAL'};expect(()=>applyEngineeringScope(option(),s)).toThrow(/price each/);
  const o=applyEngineeringScope(option(),confirmed());expect(engineeringScopeReview(o).normal).toBe(5936.21);expect(o.costLines).toHaveLength(0);
  const larger=engineeringScopeReview({...o,houseTypeSchedule:o.houseTypeSchedule!.map(x=>({...x,quantity:x.quantity*2}))}).normal;expect(larger).toBe(9765.91);expect(larger/20).toBeLessThan(engineeringScopeReview(o).normal/10);
 });
 it('charges £750 for each distinct scheduled house type without duplicating specialist foundation designs',()=>{
  const s=confirmed();const o=option();
  const foundation=()=>engineeringScopeReview(o,s).rows.find(x=>x.def.id==='6.02-initial')!;
  expect(engineeringMeasures(o).types).toBe(2);
  expect(foundation()).toMatchObject({quantity:2,calculated:1500,amount:1500,mechanism:'2 distinct house types × £750'});
  o.houseTypeSchedule!.push({...o.houseTypeSchedule![0],id:'another-a',quantity:3});
  expect(foundation().amount).toBe(1500);
  o.houseTypeSchedule!.push({id:'flat',houseTypeName:'Block A',style:'FLAT',quantity:4,gifaM2:300,buildCostPerM2:1000});
  expect(foundation().amount).toBe(1500);
  s.houseTypes=3;expect(foundation().amount).toBe(2250);
  s.houseTypes=undefined;s.items['6.02']={decision:'REQUIRED',quantity:1};
  const review=engineeringScopeReview(o,s);expect(review.rows.some(x=>x.def.id==='6.02')).toBe(false);expect(review.abnormal).toBe(0);expect(foundation().amount).toBe(1500);
 });
 it('uses house counts for drainage and flat/type measures for explicit per-type fees',()=>{
  const o=option();o.houseTypeSchedule!.push({id:'flat',houseTypeName:'Block A',style:'FLAT',quantity:1,separateSalesQuantity:true,salesQuantity:4,gifaM2:300,buildCostPerM2:1000});
  const s=confirmed();s.items['3.01']={decision:'REQUIRED'};s.items['7.01']={decision:'REQUIRED'};
  const result=engineeringScopeReview(o,s);expect(engineeringMeasures(o)).toEqual({units:14,houses:10,types:2,flats:4});expect(result.rows.find(x=>x.def.id==='3.01')?.amount).toBe(4211.8);expect(result.rows.find(x=>x.def.id==='7.01')?.amount).toBe(5800);
 });
 it('keeps optional works out and honours an explicit zero or chosen total allowance',()=>{
  const s=confirmed();s.items['4.01']={decision:'REQUIRED',allowance:0};s.items['1.07']={decision:'REQUIRED',allowance:3500,note:'Flood assessment required'};
  const result=engineeringScopeReview(option(),s);expect(result.normal).toBe(9436.21);expect(result.rows.find(x=>x.def.id==='4.01')?.amount).toBe(0);expect(result.rows.find(x=>x.def.id==='4.07')?.amount).toBe(0);
 });
 it('offers calculated, manual and excluded choices without reusing a stale manual amount',()=>{
  const s=confirmed();const calculated=engineeringScopeReview(option(),s).rows.find(x=>x.def.id==='2.01')!.amount;
  s.items['2.01']={decision:'REQUIRED',pricingMode:'MANUAL'};
  expect(engineeringScopeReview(option(),s).unpriced.map(x=>x.def.id)).toContain('2.01');
  expect(()=>applyEngineeringScope(option(),s)).toThrow(/price each required item/);
  s.items['2.01'].allowance=9000;
  expect(engineeringScopeReview(option(),s).rows.find(x=>x.def.id==='2.01')!.amount).toBe(9000);
  s.items['2.01'].pricingMode='CALCULATED';
  expect(engineeringScopeReview(option(),s).rows.find(x=>x.def.id==='2.01')!.amount).toBe(calculated);
  s.items['1.07']={decision:'REQUIRED',pricingMode:'MANUAL',allowance:1200};
  expect(engineeringScopeReview(option(),s).rows.find(x=>x.def.id==='1.07')!.amount).toBe(1200);
  s.items['1.07'].decision='NOT_REQUIRED';
  expect(engineeringScopeReview(option(),s).rows.find(x=>x.def.id==='1.07')!.amount).toBe(0);
 });
 it('treats saved legacy total overrides as manual and preserves them after reopening',()=>{
  const s=confirmed();s.items['1.07']={decision:'REQUIRED',allowance:3500};
  const normalized=normalizeEngineeringScope(JSON.parse(JSON.stringify(s)))!;
  expect(normalized.items['1.07'].pricingMode).toBe('MANUAL');
  expect(engineeringScopeReview(option(),normalized).rows.find(x=>x.def.id==='1.07')!.amount).toBe(3500);
  expect(normalizeEngineeringScope({...s,items:{...s.items,'1.07':{decision:'REQUIRED',pricingMode:'MANUAL'}}})!.items['1.07'].allowance).toBeUndefined();
 });
 it('keeps 1.04 procurement at zero and prices the topographical survey separately in site-specific costs',()=>{
  const s=confirmed();s.items['1.04']={decision:'REQUIRED',pricingMode:'MANUAL',allowance:400,rate:200};
  s.items['1.04-survey']={decision:'REQUIRED',pricingMode:'MANUAL'};
  expect(engineeringScopeReview(option(),s).unpriced.map(x=>x.def.id)).toContain('1.04-survey');
  s.items['1.04-survey'].allowance=1800;
  const normalized=normalizeEngineeringScope(s)!;
  expect(normalized.items['1.04']).toMatchObject({decision:'REQUIRED',pricingMode:'CALCULATED'});
  expect(normalized.items['1.04'].allowance).toBeUndefined();
  expect(normalized.items['1.04'].rate).toBeUndefined();
  const review=engineeringScopeReview(option(),normalized);
  expect(review.rows.find(x=>x.def.id==='1.04')?.amount).toBe(0);
  expect(review.rows.find(x=>x.def.id==='1.04-survey')?.amount).toBe(1800);
  expect(review.siteSpecific).toBe(1800);expect(review.abnormal).toBe(0);
  const base=applyEngineeringScope(option(),confirmed());
  const applied=applyEngineeringScope(option(),normalized);
  expect(applied.costLines).toHaveLength(1);
  expect(applied.costLines[0].siteCost?.allocation).toBe('SITE_SPECIFIC');
  expect(calculateCostLineAmount(applied.costLines[0],applied)).toBe(1800);
  expect(calculateAppraisalOption(applied).nonLandCost-calculateAppraisalOption(base).nonLandCost).toBeCloseTo(1800,5);
  expect(buildFinalReportData(applied).engineeringScope?.rows.find(x=>x.reference==='1.04-survey')?.destination).toBe('Site-specific works');
 });
 it('keeps 1.06 coal mining risk assessment coordination at zero even with a legacy manual fee',()=>{
  const s=confirmed();s.items['1.06']={decision:'REQUIRED',pricingMode:'MANUAL',allowance:950,rate:400};
  const normalized=normalizeEngineeringScope(s)!;
  expect(normalized.items['1.06']).toMatchObject({decision:'REQUIRED',pricingMode:'CALCULATED'});
  expect(normalized.items['1.06'].allowance).toBeUndefined();
  expect(normalized.items['1.06'].rate).toBeUndefined();
  const row=engineeringScopeReview(option(),normalized).rows.find(x=>x.def.id==='1.06')!;
  expect(row.calculated).toBe(0);expect(row.amount).toBe(0);
  expect(engineeringScopeReview(option(),normalized).unpriced).toHaveLength(0);
  expect(buildFinalReportData(applyEngineeringScope(option(),normalized)).engineeringScope?.rows.find(x=>x.reference==='1.06')?.status).toBe('Required: no fee');
 });
 it('offers remediation strategy and verification only as an unpriced abnormal preset',()=>{
  const ground=ABNORMAL_CATEGORIES.find(x=>x.id==='ground')!;
  const preset=ground.elements.find(x=>x.id==='remediation-strategy-verification')!;
  expect(preset.label).toBe('Remediation strategy and verification');
  expect(preset.scope).toContain('interim and completion verification');
  expect(presetSiteCostAllocation(preset.id)).toBe('ABNORMALS');
  expect(engineeringScopeReview(option(),confirmed()).rows.some(x=>x.def.id==='1.13')).toBe(false);
  expect(option().costLines).toHaveLength(0);
 });
 it('offers stockpile testing only as an abnormal preset without a seeded allowance',()=>{
  const ground=ABNORMAL_CATEGORIES.find(x=>x.id==='ground')!;
  const preset=ground.elements.find(x=>x.id==='stockpile-testing')!;
  expect(preset.label).toBe('Stockpile testing and assessment');
  expect(preset.scope).toContain('sampling and laboratory testing');
  expect(presetSiteCostAllocation(preset.id)).toBe('ABNORMALS');
  expect(engineeringScopeReview(option(),confirmed()).rows.some(x=>x.def.id==='1.14')).toBe(false);
  expect(option().costLines).toHaveLength(0);
 });
 it('offers off-site works design only as an abnormal preset without a seeded allowance',()=>{
  const roads=ABNORMAL_CATEGORIES.find(x=>x.id==='roads')!;
  const preset=roads.elements.find(x=>x.id==='offsite-works-design')!;
  expect(preset.label).toBe('Off-site works design');
  expect(preset.scope).toContain('engineer’s quoted or provisional fee');
  expect(presetSiteCostAllocation(preset.id)).toBe('ABNORMALS');
  expect(engineeringScopeReview(option(),confirmed()).rows.some(x=>x.def.id==='2.07')).toBe(false);
  expect(option().costLines).toHaveLength(0);
 });
 it('offers safety audit only as an abnormal preset without automatically charging the source allowance',()=>{
  const roads=ABNORMAL_CATEGORIES.find(x=>x.id==='roads')!;
  const preset=roads.elements.find(x=>x.id==='safety-audit')!;
  expect(preset.label).toBe('Safety audit');
  expect(preset.scope).toContain('independent reviewer');
  expect(presetSiteCostAllocation(preset.id)).toBe('ABNORMALS');
  expect(engineeringScopeReview(option(),confirmed()).rows.some(x=>x.def.id==='3.SA')).toBe(false);
  expect(option().costLines).toHaveLength(0);
 });
 it('offers retaining wall setting out only as an unpriced abnormal preset',()=>{
  const retaining=ABNORMAL_CATEGORIES.find(x=>x.id==='retaining')!;
  const preset=retaining.elements.find(x=>x.id==='retaining-wall-setting-out')!;
  expect(preset.label).toBe('Retaining wall setting out');
  expect(preset.scope).toContain('setting-out coordinates');
  expect(presetSiteCostAllocation(preset.id)).toBe('ABNORMALS');
  expect(engineeringScopeReview(option(),confirmed()).rows.some(x=>x.def.id==='4.04')).toBe(false);
  expect(option().costLines).toHaveLength(0);
 });
 it('offers retaining structure design only as an unpriced abnormal preset',()=>{
  const retaining=ABNORMAL_CATEGORIES.find(x=>x.id==='retaining')!;
  const preset=retaining.elements.find(x=>x.id==='retaining-structure-design')!;
  expect(preset.label).toBe('Retaining structure design');
  expect(preset.scope).toContain('distinct retaining structure type');
  expect(presetSiteCostAllocation(preset.id)).toBe('ABNORMALS');
  expect(engineeringScopeReview(option(),confirmed()).rows.some(x=>x.def.id==='5.01')).toBe(false);
  expect(option().costLines).toHaveLength(0);
 });
 it('offers specialist foundation and flatted-block design only as unpriced abnormal presets',()=>{
  const ground=ABNORMAL_CATEGORIES.find(x=>x.id==='ground')!;
  const specialist=ground.elements.find(x=>x.id==='specialist-foundation-design')!;
  const flatted=ground.elements.find(x=>x.id==='flatted-block-foundation-design')!;
  expect(specialist.scope).toContain('reinforcement and bar-bending schedules');
  expect(flatted.scope).toContain('flatted block');
  expect(presetSiteCostAllocation(specialist.id)).toBe('ABNORMALS');
  expect(presetSiteCostAllocation(flatted.id)).toBe('ABNORMALS');
  expect(option().costLines).toHaveLength(0);
  expect(engineeringScopeReview(option(),confirmed()).rows.some(x=>x.def.id==='6.02'||x.def.id==='6.07')).toBe(false);
 });
 it('applies the normal scope without creating specialist or flatted-block abnormal costs',()=>{
  const s=confirmed();s.items['6.02']={decision:'REQUIRED',quantity:2};s.additionalFlattedBlocks=1;
  const o=applyEngineeringScope(option(),s);
  expect(o.costLines).toHaveLength(0);
  expect(o.engineeringScope?.items['6.02']).toBeUndefined();
  const reapplied=applyEngineeringScope(o,s);
  expect(reapplied.costLines).toHaveLength(0);
  expect(reapplied.engineeringScope?.history).toHaveLength(2);
 });
 it('preserves an older linked specialist foundation abnormal and its cost when scope is reapplied',()=>{
  const o=applyEngineeringScope(option(),confirmed());
  const legacy=createDefaultCostLine('ABNORMALS',12,{id:'engineering-scope-6.02',engineeringScopeItemId:'6.02',title:'Engineering 6.02: Additional specialist foundation design',amount:1500,
   notes:'Specialist engineer quotation retained',siteCost:{allocation:'ABNORMALS',status:'PROVISIONAL',includeInLandOffer:false,history:[]}});
  o.costLines.push(legacy);
  const before=calculateAppraisalOption(o).nonLandCost;
  const reapplied=applyEngineeringScope(o,confirmed());
  expect(reapplied.costLines).toHaveLength(1);
  expect(reapplied.costLines[0]).toEqual(legacy);
  expect(calculateCostLineAmount(reapplied.costLines[0],reapplied)).toBe(1500);
  expect(calculateAppraisalOption(reapplied).nonLandCost).toBeCloseTo(before,5);
  const saved=normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(reapplied)),undefined,'HOUSE_BUILDING');
  expect(saved.costLines[0].id).toBe(legacy.id);
  expect(calculateCostLineAmount(saved.costLines[0],saved)).toBe(1500);
 });
 it('preserves normal scope and reporting across save and reopen',()=>{
  const o=applyEngineeringScope(option(),confirmed());
  const saved=normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(o)),undefined,'HOUSE_BUILDING');
  expect(saved.engineeringScope).toEqual(o.engineeringScope);
  expect(saved.costLines).toHaveLength(0);
  const report=buildFinalReportData(o);
  expect(report.engineeringScope?.rows).toHaveLength(62);
  expect(report.engineeringScope?.rows.some(x=>x.reference==='6.02'||x.reference==='6.07')).toBe(false);
  expect(buildFinalReportAiContext(o).option.engineeringScope).toEqual(report.engineeringScope);
 });
 it('rejects inconsistent counts and missing fee rows before making changes',()=>{
  const s=confirmed();s.houses=11;expect(()=>applyEngineeringScope(option(),s)).toThrow(/cannot exceed/);s.houses=9.5;expect(()=>applyEngineeringScope(option(),s)).toThrow(/whole numbers/);s.houses=10;expect(()=>applyEngineeringScope({...option(),siteDimensions:[]},s)).toThrow(/missing from Prelims/);
 });
 it('exports the confirmed full scope to Excel, PDF and Word without adding another financial cost',async()=>{
  const exports=await import('./appraisalExport');const {Workbook}=await import('exceljs');const JSZip=(await import('jszip')).default;
  const o=applyEngineeringScope(option(),confirmed());const appraisal={...createDefaultAppraisal(),name:'Engineer review',options:[o],selectedOptionId:o.id};
  const excel=await exports.exportAppraisalRevenueCostSummaryToExcelBlob(appraisal);const workbook=new Workbook();await workbook.xlsx.load(await excel.blob.arrayBuffer());
  const sheet=workbook.getWorksheet('Engineers Scope')!;expect(sheet).toBeDefined();expect(sheet.getCell('A2').value).toBe('1.01');const rows=sheet.getRows(2,62)!;const references=rows.map(x=>x.getCell(1).value);expect(references).toContain('6.02-initial');expect(references).not.toContain('6.02');expect(references).not.toContain('6.07');const foundation=rows.find(x=>x.getCell(1).value==='6.02-initial')!;expect(foundation.getCell(4).value).toBe('Engineer’s fee');expect(foundation.getCell(6).value).toBe(1500);
  const word=await exports.exportAppraisalFinalReportToDocxBlob(appraisal);const zip=await JSZip.loadAsync(await word.blob.arrayBuffer());const xml=await zip.file('word/document.xml')!.async('string');expect(xml).toContain('6.02-initial');expect(xml).toContain('£606.51 fixed + 10 units × £382.97');
  const pdf=await exports.exportAppraisalRevenueCostSummaryToPdf(appraisal);expect(pdf.blob.size).toBeGreaterThan(10000);
  const {writeFileSync}=await import('node:fs');writeFileSync('outputs/engineers-scope-review/engineers-report-qa.pdf',Buffer.from(await pdf.blob.arrayBuffer()));
  const before=calculateAppraisalOption(o).nonLandCost;expect(calculateAppraisalOption(o).nonLandCost).toBe(before);
 });
});
