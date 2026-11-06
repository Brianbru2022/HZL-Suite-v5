import { useState } from 'react';
import { Crosshair } from 'lucide-react';
import { PopoverMenu } from '../../UI/PopoverMenu';

export function QuickJumpMenu({
  activeBillSections,
  activeBillPages,
  hasSectionJump,
  sectionJumpEnabled,
  hasPageJump,
  pageJumpEnabled,
  onJumpToSection,
  onJumpToPage,
}: {
  activeBillSections: Array<{ id: string; name: string }>;
  activeBillPages: Array<{ id: string; name: string }>;
  hasSectionJump: boolean;
  sectionJumpEnabled: boolean;
  hasPageJump: boolean;
  pageJumpEnabled: boolean;
  onJumpToSection?: (id: string) => void;
  onJumpToPage?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!hasSectionJump && !hasPageJump) return null;

  return (
    <PopoverMenu
      ariaLabel="Quick jump"
      width={288}
      estimatedHeight={340}
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
          title="Quick jump"
          data-help-id="help-bill-quick-jump"
        >
          <Crosshair className="h-4 w-4" />
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Quick jump</div>
          <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Move around the active bill</div>
          <div className="mt-4 grid gap-3">
            {hasSectionJump && (
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Section
                <select
                  defaultValue=""
                  disabled={!sectionJumpEnabled}
                  onChange={(event) => {
                    if (!event.target.value) return;
                    onJumpToSection?.(event.target.value);
                    event.target.value = '';
                    close();
                  }}
                  className="mt-1 w-full rounded-app border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-100"
                >
                  <option value="">{sectionJumpEnabled ? 'Jump to section' : 'No sections in bill'}</option>
                  {activeBillSections.map((section, index) => (
                    <option key={section.id} value={section.id}>
                      {`Section ${index + 1}: ${section.name}`}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {hasPageJump && (
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Page
                <select
                  defaultValue=""
                  disabled={!pageJumpEnabled}
                  onChange={(event) => {
                    if (!event.target.value) return;
                    onJumpToPage?.(event.target.value);
                    event.target.value = '';
                    close();
                  }}
                  className="mt-1 w-full rounded-app border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-100"
                >
                  <option value="">{pageJumpEnabled ? 'Jump to page' : 'No pages in section'}</option>
                  {activeBillPages.map((page, index) => (
                    <option key={page.id} value={page.id}>
                      {`Page ${index + 1}: ${page.name}`}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </>
      )}
    </PopoverMenu>
  );
}
