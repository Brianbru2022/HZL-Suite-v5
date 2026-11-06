import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, X } from 'lucide-react';
import type { ItemLibrary, LibraryApprovalStatus, LibraryGovernance } from '../../types';
import { assessLibraryGovernance, recordLibraryGovernanceChange } from '../../utils/libraryGovernance';

type Props = {
  library: ItemLibrary;
  onClose: () => void;
  onSave: (governance: LibraryGovernance) => Promise<void>;
};

const statusLabels: Record<LibraryApprovalStatus, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In review',
  APPROVED: 'Approved',
  SUPERSEDED: 'Superseded',
};

export function LibraryGovernanceDialog({ library, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<LibraryGovernance>(() => library.governance || { approvalStatus: 'DRAFT' });
  const [changeSummary, setChangeSummary] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => setDraft(library.governance || { approvalStatus: 'DRAFT' }), [library]);
  const issues = useMemo(() => assessLibraryGovernance({ governance: draft }), [draft]);
  const update = (key: keyof LibraryGovernance, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setIsSaving(true);
    try {
      await onSave(recordLibraryGovernanceChange(library.governance, draft, changeSummary));
      onClose();
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-label="Library governance">
      <div className="flex max-h-[min(48rem,calc(100vh-2rem))] w-full max-w-3xl flex-col overflow-hidden rounded-app-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-surface-900">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Library governance</div>
            <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">{library.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="workspace-compact-btn" aria-label="Close library governance"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Owner" value={draft.owner || ''} onChange={(value) => update('owner', value)} placeholder="Responsible estimator or team" />
            <Field label="Source" value={draft.source || ''} onChange={(value) => update('source', value)} placeholder="Supplier quote, benchmark, framework" />
            <Field label="Rate date" type="date" value={draft.rateDate || ''} onChange={(value) => update('rateDate', value)} />
            <Field label="Review date" type="date" value={draft.reviewDate || ''} onChange={(value) => update('reviewDate', value)} />
            <Field label="Index basis" value={draft.indexBasis || ''} onChange={(value) => update('indexBasis', value)} placeholder="e.g. BCIS 233, Jul 2026" />
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Approval status</span>
              <select value={draft.approvalStatus || 'DRAFT'} onChange={(event) => setDraft((current) => ({ ...current, approvalStatus: event.target.value as LibraryApprovalStatus }))} className="mt-1.5 w-full rounded-app border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-100">
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <label className="mt-4 block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Change summary</span>
            <input value={changeSummary} onChange={(event) => setChangeSummary(event.target.value)} placeholder="What was checked or amended?" className="mt-1.5 w-full rounded-app border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-100" />
          </label>
          <section className={`mt-4 rounded-app border p-3 ${issues.length ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20' : 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20'}`}>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-100">{issues.length ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}{issues.length ? 'Governance actions required' : 'Governance record complete'}</div>
            {issues.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-900 dark:text-amber-100">{issues.map((issue) => <li key={issue.code}>{issue.message}</li>)}</ul>}
          </section>
          {(draft.changeHistory || []).length > 0 && <section className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700"><div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200"><ClipboardList className="h-4 w-4" />Recent governance changes</div><ul className="mt-2 space-y-2 text-xs text-slate-600 dark:text-slate-300">{[...(draft.changeHistory || [])].reverse().slice(0, 8).map((change) => <li key={change.id}><span className="font-medium">{new Date(change.changedAt).toLocaleString()}</span> - {change.summary}</li>)}</ul></section>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700"><button type="button" onClick={onClose} className="workspace-secondary-btn px-3 py-2 text-xs">Cancel</button><button type="button" onClick={() => { void save(); }} disabled={isSaving} className="workspace-primary-btn px-3 py-2 text-xs disabled:opacity-50">{isSaving ? 'Saving...' : 'Save governance'}</button></div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <label className="block"><span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-app border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-100" /></label>;
}
