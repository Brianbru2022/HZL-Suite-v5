import React from 'react';
import { ChevronLeft, ChevronRight, ListTree } from 'lucide-react';

type LibraryItemPreviewPanelProps = {
  isCollapsed: boolean;
  onShow: () => void;
  onCollapse: () => void;
  children: React.ReactNode;
};

export function LibraryItemPreviewPanel({
  isCollapsed,
  onShow,
  onCollapse,
  children,
}: LibraryItemPreviewPanelProps) {
  return (
    <main className="min-h-0 overflow-hidden">
      {isCollapsed ? (
        <div className="flex h-full flex-col items-center gap-3 rounded-app-xl border border-slate-200/80 bg-white/90 px-2 py-3 shadow-card dark:border-slate-700/80 dark:bg-[rgb(16_24_30_/_0.98)]">
          <button
            type="button"
            onClick={onShow}
            className="workspace-secondary-btn px-2 py-2"
            aria-label="Show item pane"
            title="Show item pane"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onShow}
            className="flex rotate-180 items-center gap-2 whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 [writing-mode:vertical-rl] dark:text-slate-500 dark:hover:bg-surface-800 dark:hover:text-slate-200"
            aria-label="Show selected section items"
            title="Show selected section items"
          >
            Items
          </button>
        </div>
      ) : (
        <div className="flex h-full flex-col overflow-hidden rounded-app-xl border border-slate-200/80 bg-white/90 shadow-card dark:border-slate-700/80 dark:bg-[rgb(16_24_30_/_0.98)]">
          <div className="flex items-center justify-between border-b border-slate-200/70 bg-slate-50/70 px-4 py-2 dark:border-slate-700/70 dark:bg-surface-900/60">
            <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <ListTree className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">Item preview</span>
            </div>
            <button
              type="button"
              onClick={onCollapse}
              className="workspace-secondary-btn px-2 py-1.5"
              aria-label="Collapse item pane"
              title="Collapse item pane"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {children}
        </div>
      )}
    </main>
  );
}
