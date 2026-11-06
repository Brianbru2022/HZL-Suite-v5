import {it,expect} from 'vitest';
import {createDefaultAppraisalOption,normalizeDevelopmentAppraisalOption,calculateSiteDimensionTotal,calculateSiteDimensionStartPriceIndexContingency,normalizeAppraisalRateLibraryItems} from './appraisal';
import {createAwdInfrastructureRatePack,createAwdPlotWorksRatePack,createAwdPrelimsRatePack} from './appraisalInfrastructureRatePacks';
import {INFRASTRUCTURE_PRELIMS_ID,infrastructureBillSection} from './appraisalInfrastructureBill';
import {buildAppraisalTradePackageBudget} from './appraisalTradePackageBudget';
it('starts infrastructure and plot-works rate packs at index 233',()=>{
 expect(createAwdInfrastructureRatePack().every(rate=>rate.priceIndex===233)).toBe(true);
 expect(createAwdPlotWorksRatePack().every(rate=>rate.priceIndex===233)).toBe(true);
});
it('rebases infrastructure to 233 and applies 4% once to other infrastructure sections',()=>{
 const o=normalizeDevelopmentAppraisalOption({...createDefaultAppraisalOption(),siteDimensions:[{id:'road',libraryRateId:'awd-infrastructure-roads',sourceFormula:'USER_ROADS_PATHS_V1: fixture',label:'Roads',category:'OTHER',unit:'sum',quantity:1,rate:10000,priceIndex:215},{id:'plot',libraryRateId:'awd-plot-works-drives',label:'Drives',category:'OTHER',unit:'sum',quantity:1,rate:20000,priceIndex:215}]});
 expect(o.siteDimensions!.find(r=>r.id==='road')!.priceIndex).toBe(233);expect(o.siteDimensions!.find(r=>r.id==='plot')!.priceIndex).toBe(233);
 const prelim=o.siteDimensions!.find(r=>r.libraryRateId===INFRASTRUCTURE_PRELIMS_ID)!;
 expect(calculateSiteDimensionTotal(prelim,o)).toBe(400);
 expect(infrastructureBillSection(o.siteDimensions!.find(r=>r.id==='road')!)).toBe('Roads and paths');
 expect(buildAppraisalTradePackageBudget(o).allowances.find(a=>a.label==='Infrastructure preliminaries (4%)')?.amount).toBe(400);
 const again=normalizeDevelopmentAppraisalOption(o);expect(again.siteDimensions!.filter(r=>r.libraryRateId===INFRASTRUCTURE_PRELIMS_ID)).toHaveLength(1);
 o.siteDimensions!.find(r=>r.id==='road')!.rate=15000;expect(calculateSiteDimensionTotal(prelim,o)).toBe(600);
});

it('prices exactly three drainage items from shared road area and updates the 4% base',()=>{
 const o=normalizeDevelopmentAppraisalOption({...createDefaultAppraisalOption(),siteDimensions:[{id:'roads-area',isCostDriverInput:true,costDriver:'ROADS_M2',category:'ROADS',label:'Road area',unit:'m2',quantity:100,rate:0},{id:'old-sewers',libraryRateId:'awd-infrastructure-drainage-suds',costDriver:'ROADS_M2',category:'ROADS',label:'Drainage and SUDS',unit:'m2',quantity:0,rate:56.72},{id:'old-protection',libraryRateId:'awd-infrastructure-protection',costDriver:'ROADS_M2',category:'ROADS',label:'Protection',unit:'m2',quantity:0,rate:1.05}]});
 const rows=o.siteDimensions!.filter(r=>!r.isCostDriverInput&&infrastructureBillSection(r)==='Drainage');
 expect(rows).toHaveLength(3);expect(rows.map(r=>r.label)).toEqual(['Onsite Sewers','Protection','Manholes and chambers']);
 expect(rows.map(r=>calculateSiteDimensionTotal(r,o)).sort((a,b)=>a-b)).toEqual([86,3421,5600]);
 expect(rows.find(r=>r.id==='old-sewers')!.rate).toBe(56);expect(rows.find(r=>r.id==='old-protection')!.rate).toBe(0.86);
 const prelim=o.siteDimensions!.find(r=>r.libraryRateId===INFRASTRUCTURE_PRELIMS_ID)!;expect(calculateSiteDimensionTotal(prelim,o)).toBeCloseTo(830.44,2);
 const again=normalizeDevelopmentAppraisalOption(o);expect(again.siteDimensions!.filter(r=>!r.isCostDriverInput&&infrastructureBillSection(r)==='Drainage')).toHaveLength(3);
});

it('migrates roads once and prices markings from the saved shared junction count',()=>{
 const o=normalizeDevelopmentAppraisalOption({...createDefaultAppraisalOption(),siteDimensions:[
 {id:'road-measure',isCostDriverInput:true,costDriver:'ROADS_M2',category:'ROADS',label:'Roads',unit:'m2',quantity:100,rate:0},
 {id:'footway-measure',isCostDriverInput:true,costDriver:'PATHS_M2',category:'FOOTPATHS',label:'Footways',unit:'m2',quantity:50,rate:0},
 {id:'junction-measure',isCostDriverInput:true,costDriver:'EXISTING_ROAD_JUNCTIONS',category:'OTHER',label:'Junctions',unit:'nr',quantity:2,rate:0},
 {id:'legacy-road',libraryRateId:'awd-infrastructure-roads',label:'Roads',category:'ROADS',unit:'m2',quantity:0,rate:108.83,costDriver:'ROADS_M2'}]});
 const roadRows=o.siteDimensions!.filter(r=>!r.isCostDriverInput&&infrastructureBillSection(r)==='Roads and paths');
 expect(roadRows).toHaveLength(6);expect(roadRows.find(r=>r.id==='legacy-road')?.rate).toBe(25.27);
 expect(roadRows.map(r=>calculateSiteDimensionTotal(r,o)).sort((a,b)=>a-b)).toEqual([1875,2214,2394,2527,2689.5,9000]);
 const again=normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(o)));
 expect(again.siteDimensions!.filter(r=>!r.isCostDriverInput&&infrastructureBillSection(r)==='Roads and paths').map(r=>r.id)).toEqual(roadRows.map(r=>r.id));
 expect(again.siteDimensions!.find(r=>r.id==='junction-measure')?.quantity).toBe(2);
});

it('migrates services and lighting without duplicates and prices lighting works from road area',()=>{
 const o=normalizeDevelopmentAppraisalOption({...createDefaultAppraisalOption(),houseTypeSchedule:[{...createDefaultAppraisalOption().houseTypeSchedule![0],id:'houses',houseTypeName:'Review houses',quantity:3}],siteDimensions:[{id:'roads',isCostDriverInput:true,costDriver:'ROADS_M2',category:'ROADS',label:'Roads',unit:'m2',quantity:100,rate:0},{id:'legacy-service',libraryRateId:'awd-infrastructure-services-groundworks',label:'Services groundworks',category:'ROADS',unit:'m2',costDriver:'ROADS_M2',quantity:0,rate:25.82}]});
 expect(o.siteDimensions!.find(r=>r.id==='legacy-service')?.rate).toBe(16.55);
 expect(calculateSiteDimensionTotal(o.siteDimensions!.find(r=>r.libraryRateId==='awd-infrastructure-plot-services-groundworks')!,o)).toBe(1398);
 expect(calculateSiteDimensionTotal(o.siteDimensions!.find(r=>r.libraryRateId==='awd-infrastructure-services')!,o)).toBe(3750);
 const pending=o.siteDimensions!.find(r=>r.libraryRateId==='awd-infrastructure-street-lighting-works')!;
 expect(pending.rate).toBe(6.95);expect(pending.costDriver).toBe('ROADS_M2');expect(calculateSiteDimensionTotal(pending,o)).toBe(695);
 expect(calculateSiteDimensionTotal(o.siteDimensions!.find(r=>r.libraryRateId==='awd-infrastructure-street-lighting')!,o)).toBe(294);
 const again=normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(o)));
 for(const id of ['services-groundworks','plot-services-groundworks','services','street-lighting','street-lighting-works'])expect(again.siteDimensions!.filter(r=>r.libraryRateId==='awd-infrastructure-'+id)).toHaveLength(1);
 expect(again.siteDimensions!.find(r=>r.id===pending.id)?.sourceFormula).toContain('USER_STREET_LIGHTING_WORKS_V1:');
});

it('prices garden areas, fences and compound once after save/reopen',()=>{
 const quantities={REAR_GARDENS_M2:100,FRONT_GARDENS_M2:50,COMMON_LANDSCAPING_M2:40,BOUNDARY_FENCING_M:20,PLOT_FENCING_M:10};
 const o=normalizeDevelopmentAppraisalOption({...createDefaultAppraisalOption(),houseTypeSchedule:[{id:'houses',houseTypeName:'Review',quantity:3}],siteDimensions:Object.entries(quantities).map(([costDriver,quantity])=>({id:costDriver,isCostDriverInput:true,costDriver,quantity,category:'OTHER',label:costDriver,unit:costDriver.endsWith('M2')?'m2':'m',rate:0}))});
 for(const [id,amount] of [['rear-gardens',158],['front-gardens',350.5],['common-grass-landscaping',101.2],['boundary-fencing',1160],['plot-fencing',280],['compound',1500]] as const) {
  const row=o.siteDimensions!.find(r=>r.libraryRateId===(id.endsWith('gardens')?'awd-plot-works-':'awd-infrastructure-')+id)!;expect(calculateSiteDimensionTotal(row,o)).toBeCloseTo(amount,2);expect(row.priceIndex).toBe(233);
 }
 expect(infrastructureBillSection(o.siteDimensions!.find(r=>r.libraryRateId==='awd-infrastructure-compound')!)).toBe('Compound');
 const again=normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(o)));
 expect(again.siteDimensions!.map(r=>r.id)).toEqual(o.siteDimensions!.map(r=>r.id));
 const base=o.siteDimensions!.filter(r=>!r.isCostDriverInput&&r.libraryRateId?.startsWith('awd-infrastructure-')&&r.libraryRateId!==INFRASTRUCTURE_PRELIMS_ID&&!r.libraryRateId.startsWith('awd-infrastructure-scottish-water-')).reduce((sum,r)=>sum+calculateSiteDimensionTotal(r,o),0);
 expect(calculateSiteDimensionTotal(o.siteDimensions!.find(r=>r.libraryRateId===INFRASTRUCTURE_PRELIMS_ID)!,o)).toBeCloseTo(base*.04,2);
});

it('removes retired base items on load and keeps them excluded on save/reopen',()=>{
 const ids=['ev-charging-without-drives','garden-walls','garden-walls-groundwork','setting-out','testing-approval'];
 const o=normalizeDevelopmentAppraisalOption({...createDefaultAppraisalOption(),siteDimensions:ids.map(id=>({id,libraryRateId:'awd-infrastructure-'+id,category:'OTHER',label:id,unit:'sum',quantity:1,rate:1000}))});
 for(const id of ids)expect(o.siteDimensions!.some(r=>r.libraryRateId==='awd-infrastructure-'+id)).toBe(false);
 const again=normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(o)));
 expect(again.siteDimensions!.map(r=>r.id)).toEqual(o.siteDimensions!.map(r=>r.id));
 expect(calculateSiteDimensionTotal(again.siteDimensions!.find(r=>r.libraryRateId===INFRASTRUCTURE_PRELIMS_ID)!,again)).toBe(0);
});

it('moves garden rows to Plot works without duplicating existing plot allowances',()=>{
 const o=normalizeDevelopmentAppraisalOption({...createDefaultAppraisalOption(),siteDimensions:[
 {id:'area',costDriver:'FRONT_GARDENS_M2',isCostDriverInput:true,category:'FRONT_GARDENS',label:'Front gardens',quantity:100,unit:'m2',rate:0},
 {id:'old-infra-front',libraryRateId:'awd-infrastructure-common-planting',category:'OTHER',label:'Front Gardens',quantity:0,unit:'m2',rate:7.01,costDriver:'FRONT_GARDENS_M2'},
 {id:'old-plot-front',libraryRateId:'awd-plot-works-front-gardens',category:'OTHER',label:'Front gardens',quantity:0,unit:'m2',rate:7.4,costDriver:'FRONT_GARDENS_M2'},
 {id:'old-infra-back',libraryRateId:'awd-infrastructure-groundwork-landscaping',category:'OTHER',label:'Back gardens',quantity:0,unit:'m2',rate:1.58,costDriver:'REAR_GARDENS_M2'}]});
 const front=o.siteDimensions!.filter(r=>r.libraryRateId==='awd-plot-works-front-gardens');expect(front).toHaveLength(1);expect(front[0].id).toBe('old-plot-front');expect(calculateSiteDimensionTotal(front[0],o)).toBe(701);
 expect(o.siteDimensions!.find(r=>r.id==='old-infra-back')?.libraryRateId).toBe('awd-plot-works-rear-gardens');
 expect(o.siteDimensions!.some(r=>['awd-infrastructure-common-planting','awd-infrastructure-groundwork-landscaping'].includes(r.libraryRateId||''))).toBe(false);
 expect(calculateSiteDimensionTotal(o.siteDimensions!.find(r=>r.libraryRateId===INFRASTRUCTURE_PRELIMS_ID)!,o)).toBe(0);
 const again=normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(o)));expect(again.siteDimensions!.map(r=>r.id)).toEqual(o.siteDimensions!.map(r=>r.id));
});

it('reprices the saved unpriced street lighting works without changing its identity',()=>{
 const o=normalizeDevelopmentAppraisalOption({...createDefaultAppraisalOption(),siteDimensions:[{id:'lighting-original',libraryRateId:'awd-infrastructure-street-lighting-works',category:'OTHER',label:'Street lighting works',rate:0,quantity:1,unit:'sum',costDriver:'FIXED_SUM',sourceFormula:'USER_SERVICES_LIGHTING_V1: UNPRICED'},{id:'roads',isCostDriverInput:true,costDriver:'ROADS_M2',category:'ROADS',label:'Roads',unit:'m2',quantity:200,rate:0}]});
 const rows=o.siteDimensions!.filter(r=>r.libraryRateId==='awd-infrastructure-street-lighting-works');expect(rows).toHaveLength(1);expect(rows[0].id).toBe('lighting-original');expect(rows[0].unit).toBe('m2');expect(rows[0].priceIndex).toBe(233);expect(calculateSiteDimensionTotal(rows[0],o)).toBe(1390);
});

it('updates plot allowances once using shared areas and house schedule units',()=>{
 const o=normalizeDevelopmentAppraisalOption({...createDefaultAppraisalOption(),houseTypeSchedule:[{id:'houses',houseTypeName:'Review',quantity:2}],siteDimensions:[{id:'drive-area',costDriver:'PLOT_WORKS_DRIVES_M2',isCostDriverInput:true,category:'DRIVES',label:'Drives',quantity:100,unit:'m2',rate:0},{id:'path-area',costDriver:'PLOT_WORKS_FOOTPATHS_M2',isCostDriverInput:true,category:'FOOTPATHS',label:'Paths',quantity:50,unit:'m2',rate:0},{id:'original-drive',libraryRateId:'awd-plot-works-drives',label:'Drives',category:'DRIVES',unit:'m2',quantity:0,rate:81.47,costDriver:'PLOT_WORKS_DRIVES_M2'}]});
 for(const [key,total] of [['drives',6730],['footpaths',2364.5],['plot-clearance',250],['steps-borders',1000]] as const)expect(calculateSiteDimensionTotal(o.siteDimensions!.find(r=>r.libraryRateId==='awd-plot-works-'+key)!,o)).toBeCloseTo(total,2);
 expect(o.siteDimensions!.find(r=>r.libraryRateId==='awd-plot-works-drives')?.id).toBe('original-drive');
 const again=normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(o)));expect(again.siteDimensions!.map(r=>r.id)).toEqual(o.siteDimensions!.map(r=>r.id));
});
it('rebases saved and new preliminaries to 233 without changing base costs or other sections',()=>{
 const o=normalizeDevelopmentAppraisalOption({...createDefaultAppraisalOption(),programme:{appraisalPriceIndex:233,startPriceIndex:240},siteDimensions:[
 {id:'saved-prelim',libraryRateId:'awd-prelims-insurance',label:'Insurance',category:'OTHER',unit:'sum',costDriver:'FIXED_SUM',quantity:1,rate:10000,priceIndex:215,notes:'Retain evidence'},
 {id:'custom-prelim',sourceRow:'PRELIMS_CUSTOM',label:'Custom preliminaries',category:'OTHER',unit:'sum',costDriver:'FIXED_SUM',quantity:1,rate:500,priceIndex:220},
 {id:'custom-plot',sourceRow:'PLOT_WORKS_CUSTOM',label:'Custom plot works',category:'OTHER',unit:'sum',costDriver:'FIXED_SUM',quantity:1,rate:800,priceIndex:215}]});
 const saved=o.siteDimensions!.find(row=>row.id==='saved-prelim')!;
 expect(saved).toMatchObject({priceIndex:233,rate:10000,quantity:1,notes:'Retain evidence'});
 expect(calculateSiteDimensionTotal(saved,o)).toBe(10000);
 expect(calculateSiteDimensionStartPriceIndexContingency(saved,o)).toBeCloseTo(10000*(240/233-1),6);
 expect(o.siteDimensions!.find(row=>row.id==='custom-prelim')?.priceIndex).toBe(233);
 expect(o.siteDimensions!.find(row=>row.id==='custom-plot')?.priceIndex).toBe(233);
 const again=normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(o)));
 expect(again.siteDimensions!.map(row=>row.id)).toEqual(o.siteDimensions!.map(row=>row.id));
 expect(createAwdPrelimsRatePack().every(rate=>rate.priceIndex===(rate.costDriver==='PLANNING_FEES_FORMULA'||rate.costDriver==='BUILDING_WARRANT_FORMULA'||rate.id.startsWith('awd-prelims-scottish-water-')?0:233))).toBe(true);
 expect(normalizeAppraisalRateLibraryItems([{...createAwdPrelimsRatePack()[0],priceIndex:215}])[0].priceIndex).toBe(233);
});
