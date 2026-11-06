import { useState } from 'react';
import { Check, Maximize2, Minimize2, Minus, Plus } from 'lucide-react';
import { PopoverMenu } from '../../UI/PopoverMenu';
import { WORKSPACE_VIEW_PRESETS } from '../../../utils/appUi';

export function WorkspaceViewMenu({
  workspaceZoom,
  isWorkspaceFocused,
  onZoomOutWorkspace,
  onZoomResetWorkspace,
  onZoomInWorkspace,
  onToggleWorkspaceFocus,
  activePresetId,
  onApplyWorkspacePreset,
}: {
  workspaceZoom?: number;
  isWorkspaceFocused?: boolean;
  onZoomOutWorkspace?: () => void;
  onZoomResetWorkspace?: () => void;
  onZoomInWorkspace?: () => void;
  onToggleWorkspaceFocus?: () => void;
  activePresetId?: string;
  onApplyWorkspacePreset?: (presetId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!onZoomOutWorkspace || !onZoomResetWorkspace || !onZoomInWorkspace || !onToggleWorkspaceFocus) return null;

  return (
    <PopoverMenu
      ariaLabel="Workspace view controls"
      width={320}
      estimatedHeight={440}
      open={open}
      onOpenChange={setOpen}
      menuClassName="workspace-popover-menu p-4"
      trigger={({ ref, isOpen, toggle }) => (
        <button
          ref={ref}
          type="button"
          onClick={toggle}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/85 text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-[rgb(27_36_44_/_0.92)] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          title="Workspace view controls"
          data-help-id="help-bill-zoom"
        >
          {isWorkspaceFocused ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Workspace view</div>
          {onApplyWorkspacePreset && (
            <div className="mt-3 space-y-1.5">
              {WORKSPACE_VIEW_PRESETS.map((preset) => {
                const isActive = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onApplyWorkspacePreset(preset.id);
                      close();
                    }}
                    className={`flex w-full items-start justify-between gap-3 rounded-app-sm border px-3 py-2.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                      isActive
                        ? 'border-emerald-700 bg-emerald-800 text-white shadow-sm dark:border-emerald-600 dark:bg-emerald-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200 dark:hover:bg-surface-800'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{preset.label}</span>
                      <span className={`mt-1 block text-[11px] ${isActive ? 'text-emerald-50/80' : 'text-slate-500 dark:text-slate-400'}`}>
                        {preset.density === 'compact' ? 'Compact' : 'Comfortable'}
                        {preset.focusMode ? ' focus' : ''}
                        {' · '}
                        {preset.visiblePanels.join(', ')}
                      </span>
                    </span>
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      isActive
                        ? 'border-white/40 bg-white/18 text-white'
                        : 'border-slate-200 text-transparent dark:border-slate-700'
                    }`}>
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-surface-900">
            <button type="button" role="menuitem" onClick={onZoomOutWorkspace} className="inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-slate-100 dark:hover:bg-slate-800" title="Zoom out">
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button type="button" role="menuitem" onClick={onZoomResetWorkspace} className="min-w-[3.5rem] rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-center text-xs font-semibold tabular-nums transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-700">
              {workspaceZoom ?? 100}%
            </button>
            <button type="button" role="menuitem" onClick={onZoomInWorkspace} className="inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-slate-100 dark:hover:bg-slate-800" title="Zoom in">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onToggleWorkspaceFocus();
              close();
            }}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-app border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {isWorkspaceFocused ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {isWorkspaceFocused ? 'Exit focus mode' : 'Enter focus mode'}
          </button>
        </>
      )}
    </PopoverMenu>
  );
}
