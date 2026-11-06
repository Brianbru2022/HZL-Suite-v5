import type { AppraisalCostLine, AppraisalEngineeringScope, AppraisalEngineeringScopeItem, DevelopmentAppraisalOption } from '../types';
import { ENGINEERING_FEE_ITEMS, ENGINEERING_SOURCE_FILE, type EngineeringFeeDefinition } from './appraisalEngineeringCatalogue';
import { changeSiteCost } from './appraisalSiteCosts';

const validNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const positive = (n: unknown) => validNumber(n) ? n : 0;
const round = (n: number) => Math.round(n * 100) / 100;
export function normalizeEngineeringScope(value: unknown): AppraisalEngineeringScope | undefined {
  if (!value || typeof value !== 'object' || (value as AppraisalEngineeringScope).version !== 1) return undefined;
  const source = value as AppraisalEngineeringScope;
  const items: AppraisalEngineeringScope['items'] = {};
  for (const definition of ENGINEERING_FEE_ITEMS) {
    const item = source.items?.[definition.id];
    if (!item || !['PENDING','REQUIRED','NOT_REQUIRED'].includes(item.decision)) continue;
    items[definition.id] = { decision: definition.compulsory ? 'REQUIRED' : item.decision,
      pricingMode: definition.zeroCost ? 'CALCULATED' : definition.siteSpecific ? 'MANUAL' : item.pricingMode === 'CALCULATED' || item.pricingMode === 'MANUAL'
        ? item.pricingMode : item.allowance !== undefined ? 'MANUAL' : 'CALCULATED',
      fixedFee: validNumber(item.fixedFee) ? item.fixedFee : undefined,
      rate: definition.zeroCost ? undefined : validNumber(item.rate) ? item.rate : undefined, quantity: validNumber(item.quantity) ? item.quantity : undefined,
      allowance: definition.zeroCost ? undefined : validNumber(item.allowance) ? item.allowance : undefined, note: typeof item.note === 'string' ? item.note : '' };
  }
  return {version:1,items,confirmedAt: typeof source.confirmedAt === 'string' ? source.confirmedAt : undefined,
    units: validNumber(source.units) ? source.units : undefined, houses: validNumber(source.houses) ? source.houses : undefined,
    houseTypes: validNumber(source.houseTypes) ? source.houseTypes : undefined,
    additionalFlattedBlocks: validNumber(source.additionalFlattedBlocks) ? source.additionalFlattedBlocks : undefined,
    history: Array.isArray(source.history) ? source.history.filter(x => typeof x?.at === 'string' && typeof x.before === 'string' && typeof x.after === 'string') : []};
}
export function createEngineeringScope(): AppraisalEngineeringScope {
  return { version:1, items:Object.fromEntries(ENGINEERING_FEE_ITEMS.filter(x => x.kind !== 'INCLUDED').map(x => [x.id,{decision:x.compulsory ? 'REQUIRED' : 'PENDING',pricingMode:x.siteSpecific ? 'MANUAL' : 'CALCULATED'}])), history:[] };
}
export function engineeringMeasures(option: DevelopmentAppraisalOption, scope?: AppraisalEngineeringScope) {
  const schedule = option.houseTypeSchedule || [];
  const quantity = (row: typeof schedule[number]) => row.salesRows?.length
    ? row.salesRows.reduce((sum,x) => sum + positive(x.quantity),0)
    : positive(row.separateSalesQuantity ? row.salesQuantity : row.quantity);
  const isFlat = (row: typeof schedule[number]) => row.style === 'FLAT' || row.style === 'COTTAGE_FLAT';
  const units = schedule.reduce((sum,row) => sum+quantity(row),0);
  const houses = schedule.filter(row => !isFlat(row)).reduce((sum,row) => sum+quantity(row),0);
  const types = new Set(schedule.filter(row => quantity(row)>0 && !isFlat(row)).map(row => row.libraryHouseTypeId || row.houseTypeName.trim().toLowerCase() || row.id)).size;
  return {units:scope?.units ?? units,houses:scope?.houses ?? houses,types:scope?.houseTypes ?? types,flats:units-houses};
}
export function engineeringItemDecision(def: EngineeringFeeDefinition, scope: AppraisalEngineeringScope): AppraisalEngineeringScopeItem['decision'] {
  if (def.compulsory) return 'REQUIRED';
  if (def.kind === 'INCLUDED') {
    const parent = ENGINEERING_FEE_ITEMS.find(x => x.id === def.parent);
    return parent ? engineeringItemDecision(parent,scope) : 'PENDING';
  }
  return scope.items[def.id]?.decision || 'PENDING';
}
export function engineeringScopeRows(option: DevelopmentAppraisalOption, scope = option.engineeringScope || createEngineeringScope()) {
  const measures = engineeringMeasures(option,scope);
  return ENGINEERING_FEE_ITEMS.map(def => {
    const selected = scope.items[def.id] || {decision:'PENDING'};
    const decision = engineeringItemDecision(def,scope);
    const pricingMode = def.zeroCost ? 'CALCULATED' : def.siteSpecific ? 'MANUAL' : selected.pricingMode || (selected.allowance !== undefined ? 'MANUAL' : 'CALCULATED');
    const rate = def.zeroCost ? 0 : selected.rate ?? def.rate;
    const quantity = def.kind === 'FIXED' ? 1 : def.driver === 'units' ? measures.units : def.driver === 'houses' ? measures.houses
      : def.driver === 'types' ? (def.abnormal ? selected.quantity : measures.types) : selected.quantity;
    const calculated = def.zeroCost || def.kind === 'INCLUDED' ? 0 : rate === null || quantity === undefined ? undefined
      : round((def.kind==='FORMULA' ? selected.fixedFee ?? def.fixedFee : 0) + rate * quantity + (def.id === '6.02' ? positive(scope.additionalFlattedBlocks)*2000 : def.id === '7.01' ? Math.max(0,measures.flats)*800 : 0));
    const amount = decision === 'REQUIRED' ? (def.zeroCost ? 0 : pricingMode === 'MANUAL' ? selected.allowance : calculated) : 0;
    const mechanism = def.kind === 'INCLUDED' ? `Included in ${def.parent}; no separate fee`
      : def.zeroCost ? def.zeroCostNote || '£0; no separate engineer’s fee'
      : def.siteSpecific ? `Surveyor’s fee: ${selected.allowance === undefined ? 'enter quoted or provisional cost' : `£${selected.allowance.toFixed(2)}`}`
      : pricingMode === 'MANUAL' ? `Manual allowance ${selected.allowance === undefined ? 'to be entered' : `£${selected.allowance.toFixed(2)}`} (calculated ${calculated === undefined ? 'unpriced' : `£${calculated.toFixed(2)}`})`
      : def.kind === 'FIXED' ? `£${rate ?? '?'} once` : def.id === '6.02-initial' ? `${quantity ?? '?'} distinct house types × £${rate ?? '?'}` : `${def.kind==='FORMULA' ? `£${selected.fixedFee ?? def.fixedFee} fixed + ` : ''}${quantity ?? '?'} ${def.driver} × £${rate ?? '?'}${def.id==='7.01' ? ` + ${Math.max(0,measures.flats)} flats × £800` : def.id==='6.02' ? ` + ${positive(scope.additionalFlattedBlocks)} additional flatted blocks × £2,000` : ''}`;
    return {def,decision,pricingMode,rate,quantity,amount,calculated,mechanism,note:selected.note || '',destination:def.siteSpecific ? 'Site-specific works' : def.abnormal ? 'Abnormals' : def.kind==='INCLUDED' ? 'Included' : 'Engineer’s fee'};
  });
}
export function engineeringScopeReview(option: DevelopmentAppraisalOption, scope = option.engineeringScope || createEngineeringScope()) {
  const rows = engineeringScopeRows(option,scope);
  return { rows, pending:rows.filter(x => x.def.kind!=='INCLUDED' && x.decision==='PENDING'),
    unpriced:rows.filter(x => x.decision==='REQUIRED' && x.amount===undefined),
    normal:round(rows.filter(x=>!x.def.abnormal).reduce((sum,x)=>sum+(x.amount||0),0)),
    abnormal:round(rows.filter(x=>x.def.abnormal && !x.def.siteSpecific).reduce((sum,x)=>sum+(x.amount||0),0)),
    siteSpecific:round(rows.filter(x=>x.def.siteSpecific).reduce((sum,x)=>sum+(x.amount||0),0)) };
}
/** Live scope amounts use the same model in cost summaries, overheads and cashflow. */
export function engineeringAbnormalAmount(line: AppraisalCostLine, option: DevelopmentAppraisalOption) {
  if (!line.engineeringScopeItemId || !option.engineeringScope?.confirmedAt || line.linkedAbnormalFrozen) return line.amount;
  return engineeringScopeRows(option).find(x=>x.def.id===line.engineeringScopeItemId)?.amount ?? line.amount;
}
export function applyEngineeringScope(option: DevelopmentAppraisalOption, input: AppraisalEngineeringScope): DevelopmentAppraisalOption {
  const scope = normalizeEngineeringScope(input)!;
  const review = engineeringScopeReview(option,scope);
  if (review.pending.length || review.unpriced.length) throw new Error('Confirm every fee decision and price each required item before applying the scope.');
  if (engineeringMeasures(option,scope).units <= 0) throw new Error('Enter the development unit count before applying the scope.');
  const measures=engineeringMeasures(option,scope);
  if (measures.houses>measures.units) throw new Error('The house count cannot exceed the total dwelling count.');
  if (![measures.units,measures.houses,measures.types,scope.additionalFlattedBlocks ?? 0].every(Number.isInteger)) throw new Error('Enter whole numbers for dwelling, house, type and block counts.');
  const feeRows=option.siteDimensions?.filter(row=>!row.isCostDriverInput && row.costDriver==='ENGINEERS_FEES_FORMULA') || [];
  if (!feeRows.length) throw new Error('The Engineer’s fee row is missing from Prelims. Restore that row before applying the scope.');
  if (feeRows.length>1) throw new Error('There is more than one Engineer’s fee row in Prelims. Resolve the duplicate fee rows before applying the scope.');
  const at = new Date().toISOString();
  scope.confirmedAt=at;
  scope.history=[...(option.engineeringScope?.history||[]),{at,before:JSON.stringify({...option.engineeringScope,history:undefined}),after:JSON.stringify({items:scope.items,units:scope.units,houses:scope.houses,houseTypes:scope.houseTypes,additionalFlattedBlocks:scope.additionalFlattedBlocks})}];
  let lines=[...option.costLines];
  for (const row of review.rows.filter(x=>x.def.abnormal)) {
    const index=lines.findIndex(x=>x.engineeringScopeItemId===row.def.id);
    const old=index>=0 ? lines[index] : undefined;
    if (row.decision!=='REQUIRED') {
      if (old && old.siteCost?.status!=='CLEARED') lines[index]=changeSiteCost(old,{siteCost:{...old.siteCost!,status:'CLEARED'}},'Not required in confirmed engineer’s scope');
      continue;
    }
    const previousDecision=option.engineeringScope ? engineeringItemDecision(row.def,option.engineeringScope) : 'PENDING';
    if (old) {
      // Preserve register allocation, evidence, frozen costs and external clearance decisions.
      const reopen=old.siteCost?.status==='CLEARED' && previousDecision!=='REQUIRED';
      lines[index]=changeSiteCost(old,{amount:old.linkedAbnormalFrozen ? old.amount : row.amount!,linkedAbnormalFrozen:old.linkedAbnormalFrozen ?? false,
        siteCost:reopen ? {...old.siteCost!,status:'PROVISIONAL'} : old.siteCost},
        reopen ? 'Reinstated at the explicitly confirmed engineer’s scope amount' : 'Engineer’s scope updated',reopen ? row.amount : undefined);
    } else {
      const id=`engineering-scope-${row.def.id}`;
      if (lines.some(x=>x.id===id)) throw new Error('Engineer’s scope reference conflicts with an existing cost element.');
      lines.push({id,engineeringScopeItemId:row.def.id,title:`${row.def.siteSpecific ? 'Site survey' : 'Engineering'} ${row.def.id}: ${row.def.label}`,category:'ABNORMALS',amount:row.amount!,percentageBasis:'NONE',
        readOnlySnapshot:true,sourceLabel:row.def.siteSpecific ? 'Topographical survey; user-entered quoted or provisional cost' : `Engineer’s Scope; ${ENGINEERING_SOURCE_FILE}; Sheet1!B${row.def.row}:L${row.def.row}`,
        notes:`${row.def.siteSpecific ? 'Third-party surveyor cost; engineer’s procurement activity 1.04 is £0.' : 'Engineering fee only; physical works priced separately. Review any design fee already included in a contractor’s package.'}\n${row.def.scope}\n${row.mechanism}\n${row.note}`,
        cashflow:{type:'EVEN',startMonth:1,endMonth:option.durationMonths},
        siteCost:{allocation:row.def.siteSpecific ? 'SITE_SPECIFIC' : 'ABNORMALS',status:'PROVISIONAL',includeInLandOffer:false,history:[]}});
    }
  }
  return {...option,engineeringScope:scope,engineeringScopeDraft:undefined,costLines:lines};
}
