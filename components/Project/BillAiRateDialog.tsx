import React, { useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { BillNavigationRow } from '../../utils/billNavigation';
import type { BillAiRateUpdate } from '../../utils/billAiRateSelection';
import { formatCurrency } from '../../utils/formatting';
import { stripRichText } from '../../utils/richText';
import { useModalFocus } from '../../hooks/useModalFocus';
import type { LiveBoQRateEstimate } from '../../services/geminiService';

export interface BillAiRateTarget {
  row: BillNavigationRow;
  context: string;
  skipReason?: string;
}

type Proposal = { result?: LiveBoQRateEstimate; error?: string };

export function BillAiRateDialog({ targets, onApply, onClose }: {
  targets: BillAiRateTarget[];
  onApply: (updates: BillAiRateUpdate[]) => void;
  onClose: () => void;
}) {
  const [proposals, setProposals] = useState<Record<string, Proposal>>({});
  const [includedIds, setIncludedIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const cancelRef = useRef(false);
  const { contentRef, contentProps } = useModalFocus(true, () => { cancelRef.current = true; onClose(); });
  const eligible = targets.filter((target) => !target.skipReason);
  const successful = eligible.filter((target) => proposals[target.row.item.id]?.result && includedIds.has(target.row.item.id));

  const research = async () => {
    cancelRef.current = false;
    setRunning(true);
    setProgress(0);
    setProposals({});
    setIncludedIds(new Set());
    const { getLiveBoQRateEstimate } = await import('../../services/geminiService');
    for (const target of eligible) {
      if (cancelRef.current) break;
      const item = target.row.item;
      try {
        const outcome = await getLiveBoQRateEstimate(stripRichText(item.description), item.unit, target.context);
        if (cancelRef.current) break;
        if ('error' in outcome) {
          setProposals((current) => ({ ...current, [item.id]: { error: outcome.error } }));
        } else {
          setProposals((current) => ({ ...current, [item.id]: { result: outcome.data } }));
          setIncludedIds((current) => new Set(current).add(item.id));
        }
      } catch (error) {
        if (cancelRef.current) break;
        setProposals((current) => ({ ...current, [item.id]: { error: error instanceof Error ? error.message : String(error) } }));
      }
      setProgress((current) => current + 1);
    }
    if (!cancelRef.current) setRunning(false);
  };

  const apply = () => {
    const updates = successful.map(({ row }) => {
      const result = proposals[row.item.id].result!;
      return {
        itemId: row.item.id,
        rate: Math.round(result.rate * 100) / 100,
        evidence: { rationale: result.rationale, sources: result.sources, assessedAt: result.assessedAt },
      };
    });
    if (updates.length === 0) return;
    onApply(updates);
    onClose();
  };

  return <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/55 p-4">
    <div ref={contentRef} {...contentProps} aria-label="AI live unit rates" className="flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-app-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-surface-900">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <div><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">AI live unit rates</h2><p className="mt-1 text-xs text-slate-500">{eligible.length} priced item{eligible.length === 1 ? '' : 's'} to research. Review the sources and rates before applying them.</p></div>
        <button type="button" aria-label="Close AI rate review" onClick={() => { cancelRef.current = true; onClose(); }} className="workspace-icon-btn"><X className="h-4 w-4" /></button>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {targets.map(({ row, context, skipReason }) => {
          const item = row.item;
          const proposal = proposals[item.id];
          return <div key={item.id} className="rounded-app border border-slate-200 p-3 text-xs dark:border-slate-700">
            <div className="flex items-start gap-3">
              <input type="checkbox" aria-label={`Include ${stripRichText(item.description)}`} checked={Boolean(proposal?.result && includedIds.has(item.id))} disabled={!proposal?.result || running} onChange={(event) => setIncludedIds((current) => { const next = new Set(current); if (event.target.checked) next.add(item.id); else next.delete(item.id); return next; })} className="mt-1" />
              <div className="min-w-0 flex-1"><div className="font-semibold text-slate-900 dark:text-slate-100">{stripRichText(item.description) || 'Untitled item'} <span className="font-normal text-slate-500">/ {item.unit || 'no unit'}</span></div><div className="mt-0.5 text-slate-500">{context}</div></div>
              <div className="shrink-0 text-right"><div className="text-slate-500">Current {formatCurrency(item.rate)}</div><div className="font-semibold text-emerald-800 dark:text-emerald-300">{proposal?.result ? `Proposed ${formatCurrency(proposal.result.rate)}` : skipReason || (running ? 'Researching…' : 'Pending')}</div></div>
            </div>
            {proposal?.error && <p className="mt-2 text-rose-700 dark:text-rose-300">{proposal.error}</p>}
            {proposal?.result && <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800"><p className="text-slate-700 dark:text-slate-200">{proposal.result.rationale}</p><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">{proposal.result.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="text-emerald-700 underline dark:text-emerald-300">{source.title}</a>)}</div></div>}
          </div>;
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-700">
        <span className="text-xs text-slate-500">{running ? `Researched ${progress} of ${eligible.length}…` : progress > 0 ? `${progress} researched · ${successful.length} ready to apply` : 'No rates changed yet'}</span>
        <div className="flex gap-2"><button type="button" onClick={() => { cancelRef.current = true; onClose(); }} className="workspace-secondary-btn px-3 py-2 text-xs">{running ? 'Stop' : 'Close'}</button><button type="button" onClick={() => void research()} disabled={running || eligible.length === 0} className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-40"><Search className="h-3.5 w-3.5" />{progress ? 'Research again' : 'Find live rates'}</button><button type="button" onClick={apply} disabled={running || successful.length === 0} className="workspace-primary-btn px-3 py-2 text-xs disabled:opacity-40">Apply {successful.length} rate{successful.length === 1 ? '' : 's'}</button></div>
      </div>
    </div>
  </div>;
}
