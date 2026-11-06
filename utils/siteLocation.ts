import type { Project } from '../types';

export const UK_SITE_REGIONS = ['Scotland', 'England', 'Wales', 'Northern Ireland'] as const;
export type UkSiteRegion = (typeof UK_SITE_REGIONS)[number];

/** Counties and council areas used for location-aware estimating. */
export const UK_SITE_COUNTIES: Record<UkSiteRegion, string[]> = {
  Scotland: [
    'Aberdeen City', 'Aberdeenshire', 'Angus', 'Argyll and Bute', 'City of Edinburgh',
    'Clackmannanshire', 'Dumfries and Galloway', 'Dundee City', 'East Ayrshire',
    'East Dunbartonshire', 'East Lothian', 'East Renfrewshire', 'Falkirk', 'Fife',
    'Glasgow City', 'Highland', 'Inverclyde', 'Midlothian', 'Moray', 'Na h-Eileanan Siar',
    'North Ayrshire', 'North Lanarkshire', 'Orkney Islands', 'Perth and Kinross',
    'Renfrewshire', 'Scottish Borders', 'Shetland Islands', 'South Ayrshire',
    'South Lanarkshire', 'Stirling', 'West Dunbartonshire', 'West Lothian',
  ],
  England: [
    'Bedfordshire', 'Berkshire', 'Bristol', 'Buckinghamshire', 'Cambridgeshire',
    'Cheshire', 'City of London', 'Cornwall', 'Cumbria', 'County Durham', 'Derbyshire',
    'Devon', 'Dorset', 'East Riding of Yorkshire', 'East Sussex', 'Essex',
    'Gloucestershire', 'Greater London', 'Greater Manchester', 'Hampshire',
    'Herefordshire', 'Hertfordshire', 'Isle of Wight', 'Kent', 'Lancashire',
    'Leicestershire', 'Lincolnshire', 'Merseyside', 'Norfolk', 'North Yorkshire',
    'Northamptonshire', 'Northumberland', 'Nottinghamshire', 'Oxfordshire', 'Rutland',
    'Shropshire', 'Somerset', 'South Yorkshire', 'Staffordshire', 'Suffolk', 'Surrey',
    'Tyne and Wear', 'Warwickshire', 'West Midlands', 'West Sussex', 'West Yorkshire',
    'Wiltshire', 'Worcestershire',
  ],
  Wales: [
    'Blaenau Gwent', 'Bridgend', 'Caerphilly', 'Cardiff', 'Carmarthenshire',
    'Ceredigion', 'Conwy', 'Denbighshire', 'Flintshire', 'Gwynedd', 'Isle of Anglesey',
    'Merthyr Tydfil', 'Monmouthshire', 'Neath Port Talbot', 'Newport', 'Pembrokeshire',
    'Powys', 'Rhondda Cynon Taf', 'Swansea', 'Torfaen', 'Vale of Glamorgan', 'Wrexham',
  ],
  'Northern Ireland': ['Antrim', 'Armagh', 'Down', 'Fermanagh', 'Londonderry', 'Tyrone'],
};

export function formatProjectSiteLocation(project: Pick<Project, 'location' | 'siteCountry' | 'siteRegion' | 'siteCounty'>): string {
  const place = project.siteCounty?.trim() || project.location?.trim() || '';
  const region = project.siteRegion?.trim() || '';
  const country = project.siteCountry?.trim() || '';
  const parts = [place];
  if (region && !place.toLowerCase().includes(region.toLowerCase())) parts.push(region);
  if (country && !parts.join(', ').toLowerCase().includes(country.toLowerCase())) parts.push(country);
  return parts.filter(Boolean).join(', ');
}
