import React from 'react';
import {
  BarChart3,
  Calculator,
  FileText,
  History,
  LayoutGrid,
  Library as LibraryIcon,
  MapPinned,
  LockKeyhole,
  Settings,
  Scale,
} from 'lucide-react';
import type { Project } from '../../types';
import { ROADMAP_NAVIGATION_MODULES } from '../../utils/appUi';
import { ESTIMATE_ONLY } from '../../utils/buildEdition';

type RestrictedModule = 'LAND_FINDER' | 'APPRAISALS' | 'LIBRARY' | 'TENDER' | 'REPORTS' | 'AUDITS' | 'ROADMAP';

const restrictedModules = new Set<RestrictedModule>(
  `${import.meta.env.VITE_RESTRICTED_MODULES || ''}${ESTIMATE_ONLY ? ',LAND_FINDER,APPRAISALS,LIBRARY,TENDER,REPORTS,AUDITS,ROADMAP' : ''}`
    .split(',')
    .map((moduleName) => moduleName.trim().toUpperCase())
    .filter(Boolean) as RestrictedModule[],
);

const moduleLabels: Record<RestrictedModule, string> = {
  LAND_FINDER: 'Land Finder',
  APPRAISALS: 'Development Appraisals',
  LIBRARY: 'Library maintenance',
  TENDER: 'Tender analysis',
  REPORTS: 'Cost reports',
  AUDITS: 'Audits',
  ROADMAP: 'Roadmap',
};

type RailButtonProps = {
  icon: React.ReactNode;
  label: string;
  title: string;
  onClick: () => void;
  smokeId: string;
  isPrimary?: boolean;
  isComingSoon?: boolean;
  isRestricted?: boolean;
};

function RailButton({ icon, label, title, onClick, smokeId, isPrimary = false, isComingSoon = false, isRestricted = false }: RailButtonProps) {
  return (
    <button
      onClick={onClick}
      data-smoke={smokeId}
      className={`relative w-full flex flex-col items-center gap-1.5 px-2 py-3 rounded-app text-[11px] font-medium transition-all ${isRestricted ? 'opacity-45 grayscale' : ''} ${
        isComingSoon
          ? 'text-slate-400 dark:text-slate-500 hover:bg-red-50/70 hover:text-red-700 dark:hover:bg-red-950/25 dark:hover:text-red-300 border border-transparent'
          : isPrimary
          ? 'bg-white/90 dark:bg-surface-800/95 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-app'
          : 'text-slate-500 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-surface-800 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent'
      }`}
      title={title}
      aria-label={title}
    >
      {isComingSoon && (
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500 shadow-sm ring-2 ring-white dark:ring-surface-950" aria-hidden="true" />
      )}
      <span className="flex items-center justify-center">{icon}</span>
      <span className="leading-none">{label}</span>
    </button>
  );
}

export const Rail = ({
  onGoHome,
  onOpenLibrary,
  onOpenLandFinder,
  onOpenAppraisals,
  onOpenEstimating,
  onOpenTender,
  onOpenContracts,
  onOpenValuations,
  onOpenFinalAccounts,
  onOpenReports,
  onOpenAudits,
  onOpenSettings,
  currentProject,
  activeLocation = 'HOME',
}: {
  onGoHome: () => void;
  onOpenLibrary: () => void;
  onOpenLandFinder?: () => void;
  onOpenAppraisals?: () => void;
  onOpenEstimating?: () => void;
  onOpenTender?: () => void;
  onOpenContracts?: () => void;
  onOpenValuations?: () => void;
  onOpenFinalAccounts?: () => void;
  onOpenReports?: () => void;
  onOpenAudits?: () => void;
  onOpenSettings: () => void;
  currentProject: Project | null;
  activeLocation?: 'HOME' | 'LAND_FINDER' | 'APPRAISALS' | 'ESTIMATING' | 'LIBRARY' | 'TENDER' | 'CONTRACTS' | 'VALUATIONS' | 'FINAL_ACCOUNTS' | 'REPORTS' | 'AUDITS' | 'SETTINGS' | 'ROADMAP';
}) => {
  const openRoadmap = onOpenContracts || onOpenValuations || onOpenFinalAccounts || onGoHome;
  const [restrictedModule, setRestrictedModule] = React.useState<RestrictedModule | null>(null);
  const requestModule = (module: RestrictedModule, action: (() => void) | undefined) => {
    if (restrictedModules.has(module)) {
      setRestrictedModule(module);
      return;
    }
    (action || onGoHome)();
  };

  return (
    <>
    <aside className="w-24 shrink-0 flex flex-col py-4 px-2.5 bg-surface/82 dark:bg-surface-950/92 border-r border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl z-[260]">
      <div>
        <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
          Work
        </div>
        <div className="mt-2 space-y-2">
          <RailButton
            icon={<LayoutGrid className="w-5 h-5" />}
            label="Home"
            title="Home command centre"
            smokeId="rail-home"
            onClick={onGoHome}
            isPrimary={activeLocation === 'HOME'}
          />
          <RailButton
            icon={<MapPinned className="w-5 h-5" />}
            label="Land Finder"
            title={restrictedModules.has('LAND_FINDER') ? 'Land Finder - licence required' : 'Land Finder'}
            smokeId="rail-land-finder"
            onClick={() => requestModule('LAND_FINDER', onOpenLandFinder)}
            isPrimary={activeLocation === 'LAND_FINDER'}
            isRestricted={restrictedModules.has('LAND_FINDER')}
          />
          <RailButton
            icon={<Calculator className="w-5 h-5" />}
            label="Appraise"
            title={restrictedModules.has('APPRAISALS') ? 'Development appraisals - licence required' : 'Development appraisals'}
            smokeId="rail-appraisals"
            onClick={() => requestModule('APPRAISALS', onOpenAppraisals)}
            isPrimary={activeLocation === 'APPRAISALS'}
            isRestricted={restrictedModules.has('APPRAISALS')}
          />
          <RailButton
            icon={<FileText className="w-5 h-5" />}
            label="Estimate"
            title="Estimating"
            smokeId="rail-estimate"
            onClick={onOpenEstimating || onGoHome}
            isPrimary={activeLocation === 'ESTIMATING'}
          />
          <RailButton
            icon={<LibraryIcon className="w-5 h-5" />}
            label="Library"
            title="Library, trades, and contractors"
            smokeId="rail-library"
            onClick={() => requestModule('LIBRARY', onOpenLibrary)}
            isPrimary={activeLocation === 'LIBRARY'}
            isRestricted={restrictedModules.has('LIBRARY')}
          />
          <RailButton
            icon={<Scale className="w-5 h-5" />}
            label="Tender"
            title="Tender analysis"
            smokeId="rail-tender"
            onClick={() => requestModule('TENDER', onOpenTender)}
            isPrimary={activeLocation === 'TENDER'}
            isRestricted={restrictedModules.has('TENDER')}
          />
          <RailButton
            icon={<BarChart3 className="w-5 h-5" />}
            label="Reports"
            title="Cost reports"
            smokeId="rail-reports"
            onClick={() => requestModule('REPORTS', onOpenReports)}
            isPrimary={activeLocation === 'REPORTS'}
            isRestricted={restrictedModules.has('REPORTS')}
          />
          <RailButton
            icon={<History className="w-5 h-5" />}
            label="Audits"
            title={restrictedModules.has('AUDITS') ? 'Audits - licence required' : 'Audits'}
            smokeId="rail-audits"
            onClick={() => requestModule('AUDITS', onOpenAudits)}
            isPrimary={activeLocation === 'AUDITS'}
            isRestricted={restrictedModules.has('AUDITS')}
          />
          <RailButton
            icon={<Calculator className="w-5 h-5" />}
            label="Roadmap"
            title={`${ROADMAP_NAVIGATION_MODULES.length} workflow modules`}
            smokeId="rail-roadmap"
            onClick={() => requestModule('ROADMAP', openRoadmap)}
            isPrimary={activeLocation === 'ROADMAP'}
            isComingSoon
            isRestricted={restrictedModules.has('ROADMAP')}
          />
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
          System
        </div>
        <div className="mt-2">
          <RailButton
            icon={<Settings className="w-5 h-5" />}
            label="Settings"
            title={currentProject ? 'App and project settings' : 'App settings'}
            smokeId="rail-settings"
            onClick={onOpenSettings}
            isPrimary={activeLocation === 'SETTINGS'}
          />
        </div>
      </div>
    </aside>
    {restrictedModule && (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="module-licence-title">
        <div className="w-full max-w-sm rounded-app-lg border border-slate-200 bg-white p-6 shadow-app-lg dark:border-slate-700 dark:bg-surface-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-app bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"><LockKeyhole className="h-5 w-5" /></div>
          <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">Module licence</div>
          <h2 id="module-licence-title" className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">{moduleLabels[restrictedModule]} is not licensed</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">This installation does not have a licence to access this module. Please contact HZL to enable it.</p>
          <div className="mt-5 flex justify-end"><button type="button" onClick={() => setRestrictedModule(null)} className="workspace-primary-btn px-4 py-2 text-xs">Close</button></div>
        </div>
      </div>
    )}
    </>
  );
};
