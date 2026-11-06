import { AWD_PRELIMS_RATE_DEFINITIONS } from './appraisalInfrastructureRatePacks';
import type { AppraisalCostLine, AppraisalSiteCostMetadata, DevelopmentAppraisalOption } from '../types';

export const SITE_COST_ALLOCATION_LABELS = { INFRASTRUCTURE: 'Infrastructure', PLOT_WORKS: 'Plot works', SITE_SPECIFIC: 'Site-specific works', ABNORMALS: 'Abnormals' } as const;
export const SITE_COST_STATUS_LABELS = { TO_BE_ASSESSED: 'To be assessed', PROVISIONAL: 'Provisional allowance', KNOWN: 'Known cost', CLEARED: 'Cleared — no cost' } as const;
export const ABNORMAL_CHECKLIST = [
  ['contamination', 'Contamination and remediation'],
  ['ground', 'Unsuitable ground, made ground, peat and buried waste'],
  ['rock', 'Rock excavation'],
  ['foundations', 'Unusual foundations, piling and ground improvement'],
  ['obstructions', 'Demolition, buried structures and obstructions'],
  ['groundwater', 'Groundwater control and dewatering'],
  ['flood', 'Flood mitigation and exceptional drainage'],
  ['sewers', 'Sewer capacity, diversions and off-site connections'],
  ['utilities', 'Utility capacity upgrades, diversions and connections'],
  ['highways', 'Off-site highways, access and adoption requirements'],
  ['retaining', 'Retaining structures and slope stabilisation'],
  ['ecology', 'Ecology, protected species and habitat mitigation'],
  ['heritage', 'Archaeology and heritage constraints'],
  ['trees', 'Trees and root protection'],
  ['third-parties', 'Neighbouring assets, third-party rights and operational restrictions'],
] as const;
export const isSiteCostElement = (line: AppraisalCostLine) => !!line.siteCost || line.category === 'ABNORMALS';
export const isClearedSiteCost = (line: AppraisalCostLine) => line.siteCost?.status === 'CLEARED';
export function siteCostMetadata(line: AppraisalCostLine): AppraisalSiteCostMetadata {
  const value = line.siteCost;
  return {
    ...value,
    allocation: value && Object.hasOwn(SITE_COST_ALLOCATION_LABELS, value.allocation) ? value.allocation : 'ABNORMALS',
    status: value && Object.hasOwn(SITE_COST_STATUS_LABELS, value.status) ? value.status : 'PROVISIONAL',
    includeInLandOffer: value?.includeInLandOffer === true,
    history: Array.isArray(value?.history) ? value.history : [],
  };
}
export function normalizeSiteCostLines(lines: AppraisalCostLine[]): AppraisalCostLine[] {
  return lines.map(line => isSiteCostElement(line) ? { ...line, siteCost: siteCostMetadata(line) } : line);
}
export function seedSiteCostChecklist(lines: AppraisalCostLine[], durationMonths: number): AppraisalCostLine[] {
  const existing = new Set(lines.map(line => line.siteCost?.checklistKey));
  const ids = new Set(lines.map(line => line.id));
  const checklistId = (key: string) => { let id = `site-checklist-${key}`, suffix = 1; while (ids.has(id)) id = `site-checklist-${key}-${suffix++}`; ids.add(id); return id; };
  return [...normalizeSiteCostLines(lines), ...ABNORMAL_CHECKLIST.filter(([key]) => !existing.has(key)).map(([key, title]): AppraisalCostLine => ({
    id: checklistId(key), title, category: 'ABNORMALS', amount: 0,
    abnormalElement: { kind: 'MANUAL', basis: 'Explicit checklist selection' },
    percentageBasis: 'NONE', cashflow: { type: 'EVEN', startMonth: 1, endMonth: durationMonths },
    siteCost: { allocation: 'ABNORMALS', status: 'TO_BE_ASSESSED', includeInLandOffer: false, checklistKey: key, history: [] },
  }))];
}
/** Keeps the estimate amount and all evidence when a cost is cleared. */
export function changeSiteCost(line: AppraisalCostLine, patch: Partial<AppraisalCostLine>, reason = '', confirmedReopenAmount?: number): AppraisalCostLine {
  const before = siteCostMetadata(line);
  const after = siteCostMetadata({ ...line, ...patch });
  const clearing = before.status !== 'CLEARED' && after.status === 'CLEARED';
  const reopening = before.status === 'CLEARED' && after.status !== 'CLEARED';
  if (clearing && !reason.trim()) throw new Error('Enter a reason for clearing this element.');
  if (reopening && (confirmedReopenAmount === undefined || !Number.isFinite(confirmedReopenAmount) || confirmedReopenAmount < 0)) throw new Error('Confirm the amount to reinstate.');
  const next = { ...line, ...patch, siteCost: after };
  if (clearing) next.siteCost.clearanceReason = reason.trim();
  if (reopening) {
    next.amount = confirmedReopenAmount!;
    if (next.engineeringScopeItemId && !Object.prototype.hasOwnProperty.call(patch,'linkedAbnormalFrozen')) next.linkedAbnormalFrozen = true;
    // The user is confirming a fixed amount; a live source can refresh it on the next update.
    if (!next.sourceBillId) { next.percentageBasis = 'NONE'; next.percentageValue = 0; }
  }
  const snapshot = (entry: AppraisalCostLine, metadata: AppraisalSiteCostMetadata) => JSON.stringify({ title: entry.title, amount: entry.amount, percentageBasis: entry.percentageBasis, percentageValue: entry.percentageValue, cashflow: entry.cashflow, notes: entry.notes, pricedItemsInformationNotes: entry.pricedItemsInformationNotes, nonPricedItemsInformationNotes: entry.nonPricedItemsInformationNotes, sourceLabel: entry.sourceLabel, sourceProjectId: entry.sourceProjectId, sourceBillId: entry.sourceBillId, sourceSectionId: entry.sourceSectionId, sourcePageId: entry.sourcePageId, abnormalElement: entry.abnormalElement, linkedAbnormalFrozen: entry.linkedAbnormalFrozen, quotations: (entry.formalQuotations || []).map(quote => ({ id: quote.id, fileName: quote.fileName })), siteCost: { ...metadata, history: undefined } });
  const oldValue = snapshot(line, before), newValue = snapshot(next, next.siteCost);
  if (oldValue !== newValue) next.siteCost.history = [...before.history, { at: new Date().toISOString(), action: clearing ? 'Cleared' : reopening ? 'Reopened' : 'Updated', before: oldValue, after: newValue, reason: reason.trim() || undefined }];
  return next;
}
export function siteCostSummary(option: DevelopmentAppraisalOption, amountFor: (line: AppraisalCostLine) => number) {
  const rows = (option.costLines || []).filter(isSiteCostElement).map(line => ({ line, metadata: siteCostMetadata(line), amount: isClearedSiteCost(line) ? 0 : amountFor(line) }));
  const additions = { INFRASTRUCTURE: 0, PLOT_WORKS: 0, SITE_SPECIFIC: 0, ABNORMALS: 0 };
  rows.forEach(row => { additions[row.metadata.allocation] += row.amount; });
  const unresolved = rows.filter(row => row.metadata.status === 'TO_BE_ASSESSED');
  return { rows, additions, additionsTotal: rows.reduce((sum, row) => sum + row.amount, 0), abnormalBase: Math.max(0, Number(option.abnormalBaseAllowance) || 0),
    unresolvedCount: unresolved.length, unpricedCount: unresolved.filter(row => row.amount === 0).length,
    unresolvedAllowance: unresolved.reduce((sum, row) => sum + row.amount, 0), clearedCount: rows.filter(row => row.metadata.status === 'CLEARED').length,
    landOfferRows: rows.filter(row => row.metadata.includeInLandOffer),
    landOfferTotal: rows.filter(row => row.metadata.includeInLandOffer).reduce((sum, row) => sum + row.amount, 0) };
}

/** Uses the same rate-pack, explicit section and driver precedence as the site-metrics screens. */
export function siteBaseRowMatches(row: NonNullable<DevelopmentAppraisalOption['siteDimensions']>[number], section: 'INFRASTRUCTURE' | 'PLOT_WORKS' | 'PRELIMS') {
  if (isAbnormalRemovalRow(row)) return false;
  const prefixes = { INFRASTRUCTURE: 'awd-infrastructure', PLOT_WORKS: 'awd-plot-works', PRELIMS: 'awd-prelims' };
  if ((row.libraryRateId || '').startsWith(prefixes[section] + '-')) return true;
  if (Object.entries(prefixes).some(([other, prefix]) => other !== section && (row.libraryRateId || '').startsWith(prefix + '-'))) return false;
  if (row.sourceRow === section + '_CUSTOM' || row.sourceRow === section + '_LIBRARY') return true;
  if (Object.keys(prefixes).some(other => other !== section && (row.sourceRow === other + '_CUSTOM' || row.sourceRow === other + '_LIBRARY'))) return false;
  const plot = ['TOTAL_UNITS', 'PLOT_WORKS_DRIVES_M2', 'PLOT_WORKS_FOOTPATHS_M2', 'FRONT_GARDENS_M2', 'REAR_GARDENS_M2', 'FIXED_SUM'];
  const infrastructure = ['TOTAL_UNITS', 'SITE_AREA_M2', 'ROADS_M2', 'PATHS_M2', 'COMMON_LANDSCAPING_M2', 'PLANTING_M2', 'BOUNDARY_FENCING_M', 'PLOT_FENCING_M', 'GARDEN_WALLS_M', 'UNITS_WITH_DRIVES', 'UNITS_WITHOUT_DRIVES', 'GARDEN_WALLS_BASE_COST', 'FIXED_SUM'];
  if (section === 'INFRASTRUCTURE') return !row.costDriver || infrastructure.includes(row.costDriver);
  return !!row.costDriver && (section === 'PLOT_WORKS' ? plot.includes(row.costDriver) : AWD_PRELIMS_RATE_DEFINITIONS.some(definition => definition.costDriver === row.costDriver));
}

export const ABNORMAL_REMOVAL_RATE_IDS = [
  'awd-infrastructure-removal-existing-structures',
  'awd-infrastructure-removal-existing-surfaces',
  'awd-infrastructure-alterations',
] as const;
export function isAbnormalRemovalRow(row: { libraryRateId?: string }) {
  return ABNORMAL_REMOVAL_RATE_IDS.some(id => id === row.libraryRateId);
}
/** Removes only untouched generated prompts and workbook removal presets. */
export function removeUnselectedAbnormalPresets(option: DevelopmentAppraisalOption): DevelopmentAppraisalOption {
  const untouched = (line: AppraisalCostLine) => !line.abnormalElement && !(line.siteCost?.history?.length)
    && !(line.formalQuotations?.length) && !line.pricedItemsInformationNotes?.trim() && !line.nonPricedItemsInformationNotes?.trim()
    && !line.siteCost?.includeInLandOffer && !line.siteCost?.responsiblePerson && !line.siteCost?.offerQualification
    && !line.siteCost?.baseOverlapNote && !line.sourceBillId;
  const unusedRows = new Set((option.siteDimensions || []).filter(row => {
    const index = ABNORMAL_REMOVAL_RATE_IDS.indexOf(row.libraryRateId as typeof ABNORMAL_REMOVAL_RATE_IDS[number]);
    if (index < 0 || row.priceIndex !== 215) return false;
    const expectedTitle = ['Removal of existing structures', 'Removal of existing surfaces', 'Alterations'][index];
    if (row.label !== expectedTitle || !row.notes?.startsWith('AWD Infrastructure Pack.')) return false;
    const expectedFormula = index < 2 ? `Infrastructure!B${index+4} = 'Project Data'!B8 * 6.22` : 'Infrastructure!B6 = 0';
    if (row.sourceFormula !== expectedFormula || row.sourceRow !== `Infrastructure!B${index+4}`
      || row.notes !== `AWD Infrastructure Pack. ${index < 2 ? 'per total unit' : 'manual allowance'}. Base formula: ${expectedFormula}. Revised costs ignored.`) return false;
    if (index < 2 ? row.rate !== 6.22 || row.quantity !== 0 || row.costDriver !== 'TOTAL_UNITS' || row.unit !== 'nr'
      : row.rate !== 0 || row.quantity !== 1 || row.costDriver !== 'FIXED_SUM' || row.unit !== 'sum') return false;
    const linked = option.costLines.filter(line => line.sourceSiteDimensionId === row.id);
    return linked.every(line => untouched(line) && line.id === `site-removal-${row.id}` && line.title === row.label
      && line.sourceLabel === 'Existing removal allowance; live measurement schedule'
      && line.siteCost?.allocation === 'ABNORMALS' && line.siteCost?.status === 'PROVISIONAL'
      && line.notes === (index === 0 ? 'Existing buildings, foundations, walls, fencing and buried structures: define demolition, service isolation, disposal and reinstatement extent. Excludes construction of new structures.'
        : index === 1 ? 'Existing paving, roads, bunds and kerbs: define breaking out, crushing or processing, reuse, disposal and reinstatement extent. Excludes construction of new surfaces.'
        : 'Alterations to existing assets: define the affected structures, services, surfaces and required modifications. Additional abnormal allowance; excludes new infrastructure base works.'));
  }).map(row => row.id));
  const costLines = option.costLines.filter(line => {
    if (line.sourceSiteDimensionId && unusedRows.has(line.sourceSiteDimensionId)) return false;
    const title = ABNORMAL_CHECKLIST.find(([key]) => key === line.siteCost?.checklistKey)?.[1];
    return !(title && untouched(line) && line.id.startsWith(`site-checklist-${line.siteCost?.checklistKey}`)
      && line.title === title && line.amount === 0 && !line.notes?.trim() && line.siteCost?.status === 'TO_BE_ASSESSED');
  });
  const siteDimensions = (option.siteDimensions || []).filter(row => !unusedRows.has(row.id));
  return costLines.length === option.costLines.length && siteDimensions.length === (option.siteDimensions || []).length
    ? option : {...option, costLines, siteDimensions};
}
/** Reclassifies existing removal estimates, preserving their measured source and stable identity. */
export function linkAbnormalRemovalRows(option: DevelopmentAppraisalOption): DevelopmentAppraisalOption {
  let lines = option.costLines;
  for (const row of (option.siteDimensions || []).filter(isAbnormalRemovalRow)) {
    if (lines.some(line => line.sourceSiteDimensionId === row.id)) continue;
    const baseId = `site-removal-${row.id}`;
    let id = baseId, suffix = 1;
    while (lines.some(line => line.id === id)) id = `${baseId}-${suffix++}`;
    const structures = row.libraryRateId === ABNORMAL_REMOVAL_RATE_IDS[0];
    lines = [...lines, {
      id, title: row.label, category: 'ABNORMALS', amount: Math.max(0, row.quantity * row.rate),
      sourceSiteDimensionId: row.id, percentageBasis: 'NONE', readOnlySnapshot: true,
      cashflow: { type: 'EVEN', startMonth: 1, endMonth: option.durationMonths },
      sourceLabel: 'Existing removal allowance; live measurement schedule',
      notes: row.libraryRateId === 'awd-infrastructure-alterations'
        ? 'Alterations to existing assets: define the affected structures, services, surfaces and required modifications. Additional abnormal allowance; excludes new infrastructure base works.'
        : structures
        ? 'Existing buildings, foundations, walls, fencing and buried structures: define demolition, service isolation, disposal and reinstatement extent. Excludes construction of new structures.'
        : 'Existing paving, roads, bunds and kerbs: define breaking out, crushing or processing, reuse, disposal and reinstatement extent. Excludes construction of new surfaces.',
      siteCost: { allocation: 'ABNORMALS', status: 'PROVISIONAL', includeInLandOffer: false, history: [] },
    }];
  }
  return lines === option.costLines ? option : { ...option, costLines: lines };
}
export function isActiveSiteSourceRow(row: { id: string }, option: DevelopmentAppraisalOption) {
  return !option.costLines.some(line => line.sourceSiteDimensionId === row.id && isClearedSiteCost(line));
}
