import type { Project } from '../../types';

type ProjectLocation = Pick<Project, 'location' | 'siteCountry' | 'siteRegion' | 'siteCounty'>;

const flagUrl = (fileName: string) => `${import.meta.env.BASE_URL}flags/${fileName}`;

const regionalFlags: Record<string, string> = {
  Scotland: flagUrl('Flag_of_Scotland.svg'),
  England: flagUrl('Flag_of_England.svg'),
  Wales: flagUrl('Flag_of_Wales.svg'),
  'Northern Ireland': flagUrl('Flag_of_the_United_Kingdom.svg'),
};

export function ProjectLocationBadge({ project, className = '' }: { project: ProjectLocation; className?: string }) {
  const country = project.siteCountry?.trim() || 'United Kingdom';
  const region = project.siteRegion?.trim() || (country === 'United Kingdom' ? 'Scotland' : '');
  const legacyArea = project.location?.split(',')[0]?.trim() || '';
  const area = project.siteCounty?.trim()
    || (legacyArea && legacyArea !== region && legacyArea !== country ? legacyArea : 'Area not set');
  const countryFlag = country === 'United Kingdom'
    ? flagUrl('Flag_of_the_United_Kingdom.svg')
    : country === 'Ireland' ? flagUrl('Flag_of_Ireland.svg') : null;
  const regionFlag = country === 'United Kingdom' ? regionalFlags[region] : null;
  const title = [country, region, area].filter(Boolean).join(' · ');

  return (
    <span
      className={`inline-flex min-w-0 max-w-40 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-300 ${className}`}
      title={title}
      aria-label={`Estimate location: ${title}`}
    >
      {countryFlag && <img src={countryFlag} alt="" className="h-3 w-[18px] shrink-0 rounded-[1px] object-cover ring-1 ring-slate-200 dark:ring-slate-600" />}
      {regionFlag && <img src={regionFlag} alt="" className="h-3 w-[18px] shrink-0 rounded-[1px] object-cover ring-1 ring-slate-200 dark:ring-slate-600" />}
      <span className="truncate">{area}</span>
    </span>
  );
}
