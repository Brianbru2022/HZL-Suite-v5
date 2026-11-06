import React from 'react';
import { UserPlus } from 'lucide-react';

type TenderEmptyTeamPanelProps = {
  tradeName: string;
  availableContractorCount: number;
  tenderContractorCount: number;
  pricedItemCount: number;
};

export function TenderEmptyTeamPanel({
  tradeName,
  availableContractorCount,
  tenderContractorCount,
  pricedItemCount,
}: TenderEmptyTeamPanelProps) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center justify-center rounded-app-xl border border-slate-200/80 bg-white/92 px-10 py-16 text-center shadow-card dark:border-slate-700 dark:bg-surface-900/95">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-app bg-slate-100 text-slate-700 shadow-sm dark:bg-surface-800 dark:text-slate-200">
        <UserPlus className="h-8 w-8" />
      </div>
      <h3 className="mb-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Build your tender team first</h3>
      <p className="mb-6 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
        Add contractors from the Trade &amp; Contractor Library using the &quot;Add contractor to tender...&quot; dropdown above. Only contractors you add will appear in the tender analysis for this project.
      </p>
      <div className="mb-6 grid w-full gap-3 md:grid-cols-3">
        <div className="rounded-app border border-slate-200 bg-surface p-4 text-left dark:border-slate-700 dark:bg-surface-800">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Step 1</div>
          <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Pick the trade</div>
          <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Choose the package you want to issue first and confirm the priced scope looks right.</div>
        </div>
        <div className="rounded-app border border-slate-200 bg-surface p-4 text-left dark:border-slate-700 dark:bg-surface-800">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Step 2</div>
          <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Invite the tender team</div>
          <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Add contractors from the directory so this project has its own tender invite list.</div>
        </div>
        <div className="rounded-app border border-slate-200 bg-surface p-4 text-left dark:border-slate-700 dark:bg-surface-800">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Step 3</div>
          <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Issue and compare</div>
          <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Send the blank tender workbook, enter live returns, then compare and choose a winner.</div>
        </div>
      </div>
      <div className="grid w-full gap-3 md:grid-cols-3">
        <div className="rounded-app border border-slate-200 bg-surface p-4 text-left dark:border-slate-700 dark:bg-surface-800">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Directory</div>
          <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{availableContractorCount} available</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Contractors linked to this trade package.</div>
        </div>
        <div className="rounded-app border border-slate-200 bg-surface p-4 text-left dark:border-slate-700 dark:bg-surface-800">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">In tender</div>
          <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{tenderContractorCount}</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Add at least two for a meaningful comparison.</div>
        </div>
        <div className="rounded-app border border-slate-200 bg-surface p-4 text-left dark:border-slate-700 dark:bg-surface-800">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Scope</div>
          <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{pricedItemCount} items</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Priced items ready for comparison once bids are added.</div>
        </div>
      </div>
      {availableContractorCount === 0 ? (
        <p className="mt-6 text-xs text-amber-600 dark:text-amber-400">
          The trade &quot;{tradeName}&quot; has no contractors in the library yet. Add contractors in the Trade &amp; Contractor Library first, then add them here.
        </p>
      ) : null}
    </div>
  );
}
