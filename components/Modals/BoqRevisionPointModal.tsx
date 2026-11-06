import React from 'react';
import { History, Save, X } from 'lucide-react';
import type { BoqRevisionPointDetails } from '../../utils/boqRevisionPoints';

interface BoqRevisionPointModalProps {
  isOpen: boolean;
  scopeLabel: string;
  onSubmit: (details: BoqRevisionPointDetails) => void;
  onClose: () => void;
}

export const BoqRevisionPointModal: React.FC<BoqRevisionPointModalProps> = ({
  isOpen,
  scopeLabel,
  onSubmit,
  onClose,
}) => {
  const [label, setLabel] = React.useState('');
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    if (!isOpen) return;
    setLabel('');
    setNote('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      label: label.trim() || undefined,
      note: note.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md dark:bg-black/70">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="boq-revision-point-title"
        onSubmit={handleSubmit}
        className="workspace-shell w-full max-w-xl overflow-hidden"
      >
        <div className="border-b border-slate-200/80 bg-white/94 px-6 py-5 dark:border-slate-700/80 dark:bg-surface-900/95">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-app bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                <History className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="workspace-chip mb-2">BoQ revision point</div>
                <h2 id="boq-revision-point-title" className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                  Record revision point
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
                  Scope: <span className="font-semibold text-slate-700 dark:text-slate-100">{scopeLabel}</span>
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="workspace-secondary-btn px-3 py-2 text-xs" aria-label="Close revision point dialog">
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>

        <div className="space-y-5 bg-white/95 px-6 py-6 dark:bg-surface-900/96">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Label</span>
            <input
              autoFocus
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Before client changes"
              className="mt-2 w-full rounded-app-sm border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-900/40"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Note</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Instruction 04 pricing changes"
              rows={4}
              className="mt-2 w-full resize-none rounded-app-sm border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-900/40"
            />
          </label>

          <div className="rounded-app-sm border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-100">
            The checkpoint captures the current bill state and appears in Version History with live change comparison and revert preview.
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="workspace-secondary-btn px-4 py-2.5 text-sm">
              Cancel
            </button>
            <button type="submit" className="workspace-primary-btn px-4 py-2.5 text-sm">
              <Save className="h-4 w-4" />
              Record revision point
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
