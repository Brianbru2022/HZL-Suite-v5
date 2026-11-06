import {it,expect} from 'vitest';
import {createDefaultAppraisalOption,createSiteDimensionRowFromRate,createDefaultCostLine,normalizeDevelopmentAppraisalOption} from './appraisal';
import {createAwdInfrastructureRatePack} from './appraisalInfrastructureRatePacks';
import {ABNORMAL_REMOVAL_RATE_IDS,linkAbnormalRemovalRows,removeUnselectedAbnormalPresets,changeSiteCost} from './appraisalSiteCosts';
import {resolveLinkedAbnormalAmount,refreshLinkedAbnormalLines} from './appraisalLinkedAbnormals';
import type {Project} from '../types';
import {ABNORMAL_CATEGORIES} from './appraisalAbnormalCatalog';
import {calculateCostLineAmount} from './appraisal';
const preset=()=>linkAbnormalRemovalRows({...createDefaultAppraisalOption(),costLines:[],siteDimensions:ABNORMAL_REMOVAL_RATE_IDS.map(id=>createSiteDimensionRowFromRate(createAwdInfrastructureRatePack().find(rate=>rate.id===id)!))});
it('starts with no automatic abnormal costs and removes only untouched legacy presets',()=>{
 expect(createDefaultAppraisalOption().costLines).toEqual([]);
 const original=preset();expect(original.costLines).toHaveLength(3);
 const clean=removeUnselectedAbnormalPresets(original);expect(clean.costLines).toHaveLength(0);expect(clean.siteDimensions).toHaveLength(0);expect(removeUnselectedAbnormalPresets(clean)).toBe(clean);
 const loaded=normalizeDevelopmentAppraisalOption(original);expect(loaded.costLines).toHaveLength(0);expect(loaded.siteDimensions!.some(row=>ABNORMAL_REMOVAL_RATE_IDS.includes(row.libraryRateId as any))).toBe(false);
 expect(normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(loaded))).costLines).toHaveLength(0);
});
it('preserves edited, evidenced and explicitly selected abnormal costs',()=>{
 for(const edit of ['rate','notes','evidence','explicit','history']){
  const original=preset(),line=original.costLines[0];
  if(edit==='rate')original.siteDimensions![0].rate=20;
  if(edit==='notes')line.notes+=' Engineer evidence confirms demolition.';
  if(edit==='evidence')line.formalQuotations=[{id:'quote'} as any];
  if(edit==='explicit')line.abnormalElement={kind:'RATE',quantity:1,rate:6.22};
  if(edit==='history')line.siteCost!.history=[{at:'2026-10-07',action:'Edited',before:'',after:''}];
  expect(removeUnselectedAbnormalPresets(original).costLines.find(item=>item.id===line.id)).toBe(line);
 }
});
it('retains page links on reopen and refreshes only that page with the bill multiplier',()=>{
 const project={id:'p',bills:[{id:'b',name:'Source bill',billType:'HOUSE_TYPE',houseTypeQuantity:2,sections:[{id:'s',name:'Section',items:[],pages:[{id:'page',items:[{type:'PRICED',total:300},{type:'COMMENT',total:999}]},{id:'other-page',items:[{type:'PRICED',total:500}]}]}]}]} as unknown as Project;
 const line=createDefaultCostLine('ABNORMALS',12,{id:'added',amount:1,sourceProjectId:'p',sourceBillId:'b',sourceSectionId:'s',sourcePageId:'page',abnormalElement:{kind:'BILL'}});
 expect(resolveLinkedAbnormalAmount(line,[project])).toBe(600);
 const loaded=normalizeDevelopmentAppraisalOption({...createDefaultAppraisalOption(),costLines:[line]});expect(loaded.costLines[0].sourcePageId).toBe('page');
 expect(refreshLinkedAbnormalLines(loaded,[project]).costLines[0].amount).toBe(600);
 expect(resolveLinkedAbnormalAmount({...line,linkedAbnormalFrozen:true},[project])).toBeNull();
});
it('keeps rate snapshots and AI dialogue through normalization and records scope-only changes',()=>{
 const meta={kind:'AI' as const,basis:'Quantified ground works',dialogue:[{role:'user' as const,text:'Allow 200 m3 of excavation.'},{role:'assistant' as const,text:'Confirm disposal classification.'}]};
 const line=createDefaultCostLine('ABNORMALS',12,{amount:5000,abnormalElement:meta});const loaded=normalizeDevelopmentAppraisalOption({...createDefaultAppraisalOption(),costLines:[line]});expect(loaded.costLines[0].abnormalElement).toEqual(meta);
 const edited=changeSiteCost(line,{abnormalElement:{...meta,basis:'Revised disposal scope'}});expect(edited.siteCost!.history).toHaveLength(1);
});
it('preserves an explicitly chosen preset and its cost source across save, move and clear',()=>{
 const category=ABNORMAL_CATEGORIES.find(entry=>entry.id==='services')!;
 const preset=category.elements.find(entry=>entry.id==='excess-service-charges')!;
 const original=createDefaultCostLine('ABNORMALS',12,{amount:500,title:preset.label,abnormalElement:{kind:'RATE',categoryId:category.id,categoryLabel:category.label,presetId:preset.id,presetLabel:preset.label,presetScope:preset.scope,quantity:2,rate:250,rateId:'evidenced-excess-charge'},siteCost:{allocation:'ABNORMALS',status:'PROVISIONAL',includeInLandOffer:false,history:[]}});
 const option=createDefaultAppraisalOption();
 const loaded=normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify({...option,costLines:[original]})));
 expect(loaded.costLines).toHaveLength(1);
 expect(loaded.costLines[0].abnormalElement).toEqual(original.abnormalElement);
 const moved=changeSiteCost(loaded.costLines[0],{siteCost:{...loaded.costLines[0].siteCost!,allocation:'INFRASTRUCTURE'}});
 expect(moved.id).toBe(original.id);expect(moved.abnormalElement).toEqual(original.abnormalElement);
 expect(calculateCostLineAmount(moved,loaded)).toBe(500);
 const cleared=changeSiteCost(moved,{siteCost:{...moved.siteCost!,status:'CLEARED'}},'Provider confirmed no additional charge.');
 expect(calculateCostLineAmount(cleared,loaded)).toBe(0);
 expect(cleared.abnormalElement).toEqual(original.abnormalElement);
 expect(cleared.siteCost!.history).toHaveLength(2);
 const reopened=normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify({...loaded,costLines:[cleared]})));
 expect(reopened.costLines[0].abnormalElement).toEqual(original.abnormalElement);
 expect(reopened.costLines[0].siteCost!.history).toEqual(cleared.siteCost!.history);
});
