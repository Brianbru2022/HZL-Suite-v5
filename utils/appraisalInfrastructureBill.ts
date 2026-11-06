import type {AppraisalSiteDimensionRow} from '../types';
export const INFRASTRUCTURE_PRELIMS_ID = 'awd-infrastructure-bill-preliminaries';
export const INFRASTRUCTURE_BILL_SECTIONS = ['Preliminaries','Site Enabling Works','Drainage','Roads and paths','Services','Landscaping','Sundry','Street Lighting','Fencing','Compound'] as const;
export function infrastructureBillSection(row: Pick<AppraisalSiteDimensionRow,'libraryRateId'|'label'>): typeof INFRASTRUCTURE_BILL_SECTIONS[number] {
 const id=row.libraryRateId||'';
 if(id===INFRASTRUCTURE_PRELIMS_ID)return 'Preliminaries';
 if(['topsoil-strip-stockpile','cut-and-fill','clear-site-vegetation'].some(key=>id===`awd-infrastructure-${key}`))return 'Site Enabling Works';
 if(DRAINAGE_ALLOWANCES.some(item=>item.id===id)||id.includes('drainage'))return 'Drainage';
 if(ROADS_PATHS_ALLOWANCES.some(item=>item.id===id))return 'Roads and paths';
 if(['roads','kerbs','paths','tar-surfacing'].some(key=>id===`awd-infrastructure-${key}`))return 'Roads and paths';
 if(id.includes('services')||id.includes('service-strips')||id.includes('ev-charging'))return 'Services';
 if(id==='awd-infrastructure-compound')return 'Compound';
 if(id.includes('landscaping')||id.includes('planting'))return 'Landscaping';
 if(id.includes('street-lighting'))return 'Street Lighting';
 if(id.includes('fencing'))return 'Fencing';
 return 'Sundry';
}

export const SITE_ENABLING_WORKS_COMMENT = 'Topsoil strip not exceeding 150mm; cut and fill not exceeding an average of 250mm cut and fill generally including roads, footpaths etc.';

export const DRAINAGE_COMMENT = 'Track excavations not exceeding 2m; pipe sizes not exceeding 225mm; excluding rock etc excavations; 2 connections allowed only to main sewers; manholes not exceeding 2m deep; excludes not standard disconnecting manholes; excludes SUDS; excludes filter trenches.';
export const DRAINAGE_ALLOWANCES = [
 {id:'awd-infrastructure-drainage-suds',label:'Onsite Sewers',rate:56},
 {id:'awd-infrastructure-manholes-chambers',label:'Manholes and chambers',rate:34.21},
 {id:'awd-infrastructure-protection',label:'Protection',rate:0.86},
] as const;

export const ROADS_PATHS_COMMENT = 'Not exceeding 400mm sub-base (sub-base + capping combo) to roads and 370mm to paths; excludes excavation of rock and the like; excludes membranes.';
export const ROADS_PATHS_ALLOWANCES = [
 {id:'awd-infrastructure-roads',label:'Carriageways',rate:25.27,costDriver:'ROADS_M2',unit:'m2'},
 {id:'awd-infrastructure-tar-surfacing',label:'Block surfaces',rate:22.14,costDriver:'ROADS_M2',unit:'m2'},
 {id:'awd-infrastructure-parking-shared-surfaces',label:'Parking bays and Shared surfaces',rate:18.75,costDriver:'ROADS_M2',unit:'m2'},
 {id:'awd-infrastructure-paths',label:'Footways',rate:53.79,costDriver:'PATHS_M2',unit:'m2'},
 {id:'awd-infrastructure-kerbs',label:'Kerbing',rate:23.94,costDriver:'ROADS_M2',unit:'m2'},
 {id:'awd-infrastructure-road-markings',label:'Road markings',rate:4500,costDriver:'EXISTING_ROAD_JUNCTIONS',unit:'nr'},
] as const;

export const SERVICES_COMMENT = 'Main Services at £1,250 per dwelling covers fresh-water service to plots. Excludes substations, non PPE pipework and service costs exceeding £1,250 per unit.';
export const SERVICES_LIGHTING_ALLOWANCES = [
 {id:'awd-infrastructure-services-groundworks',label:'Main Services Groundworks',rate:16.55,costDriver:'ROADS_M2',unit:'m2'},
 {id:'awd-infrastructure-plot-services-groundworks',label:'Plot services groundwork',rate:466,costDriver:'TOTAL_UNITS',unit:'nr'},
 {id:'awd-infrastructure-services',label:'Main Services',rate:1250,costDriver:'TOTAL_UNITS',unit:'nr'},
 {id:'awd-infrastructure-street-lighting',label:'Street Lighting Groundworks',rate:2.94,costDriver:'ROADS_M2',unit:'m2'},
 {id:'awd-infrastructure-street-lighting-works',label:'Street lighting works',rate:6.95,costDriver:'ROADS_M2',unit:'m2'},
] as const;
export function isInfrastructureRatePending(row: Pick<AppraisalSiteDimensionRow,'sourceFormula'|'rate'>): boolean {
 return row.sourceFormula?.includes('USER_SERVICES_LIGHTING_V1: UNPRICED') === true && row.rate === 0;
}

export const LANDSCAPING_COMMENT = 'Excludes imported topsoil.';
export const LANDSCAPING_FENCING_COMPOUND_ALLOWANCES = [
 {id:'awd-infrastructure-common-grass-landscaping',label:'Common areas',rate:2.53,costDriver:'COMMON_LANDSCAPING_M2',unit:'m2'},
 {id:'awd-infrastructure-boundary-fencing',label:'Boundary Fencing',rate:58,costDriver:'BOUNDARY_FENCING_M',unit:'m'},
 {id:'awd-infrastructure-plot-fencing',label:'Plot fencing',rate:28,costDriver:'PLOT_FENCING_M',unit:'m'},
 {id:'awd-infrastructure-compound',label:'Compound',rate:500,costDriver:'TOTAL_UNITS',unit:'nr'},
] as const;

export const RETIRED_INFRASTRUCTURE_RATE_IDS = new Set([
 'awd-infrastructure-scottish-water-charges',
 'awd-infrastructure-scottish-water-rebates',
 'awd-infrastructure-scottish-water-connections',
 'awd-infrastructure-surveys-reports',
 'awd-infrastructure-ev-charging-without-drives',
 'awd-infrastructure-garden-walls',
 'awd-infrastructure-garden-walls-groundwork',
 'awd-infrastructure-setting-out',
 'awd-infrastructure-testing-approval',
]);

export const PLOT_GARDEN_ALLOWANCES = [
 {id:'awd-plot-works-front-gardens',legacyId:'awd-infrastructure-common-planting',label:'Front Gardens',rate:7.01,costDriver:'FRONT_GARDENS_M2',unit:'m2'},
 {id:'awd-plot-works-rear-gardens',legacyId:'awd-infrastructure-groundwork-landscaping',label:'Back gardens',rate:1.58,costDriver:'REAR_GARDENS_M2',unit:'m2'},
] as const;
export const PLOT_WORKS_BILL_SECTIONS = ['Drives and footpaths','Landscaping','Sundry'] as const;
export function plotWorksBillSection(row: Pick<AppraisalSiteDimensionRow,'libraryRateId'|'label'>): typeof PLOT_WORKS_BILL_SECTIONS[number] {
 if(['awd-plot-works-drives','awd-plot-works-footpaths'].includes(row.libraryRateId||''))return 'Drives and footpaths';
 if(PLOT_GARDEN_ALLOWANCES.some(spec=>spec.id===row.libraryRateId))return 'Landscaping';
 return 'Sundry';
}

export const PLOT_BASE_ALLOWANCES = [
 {id:'awd-plot-works-plot-clearance',label:'Plot clearance',rate:125,costDriver:'TOTAL_UNITS',unit:'nr'},
 {id:'awd-plot-works-footpaths',label:'Paths',rate:47.29,costDriver:'PLOT_WORKS_FOOTPATHS_M2',unit:'m2'},
 {id:'awd-plot-works-steps-borders',label:'Steps and Borders',rate:500,costDriver:'TOTAL_UNITS',unit:'nr'},
 {id:'awd-plot-works-drives',label:'Driveways',rate:67.30,costDriver:'PLOT_WORKS_DRIVES_M2',unit:'m2'},
] as const;
