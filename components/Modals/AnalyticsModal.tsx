import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BadgePercent,
  Layers3,
  PieChart,
  PoundSterling,
  ShieldCheck,
  TrendingUp,
  X,
} from 'lucide-react';
import { Project, TradePackage } from '../../types';
import { calculateProjectTotal, safeMul } from '../../utils/calculations';
import { formatCurrency } from '../../utils/formatting';
import { useModalFocus } from '../../hooks/useModalFocus';
import { useHelpContext } from '../../hooks/useHelpContext';
import { useAppContextOptional } from '../../contexts/AppContext';
import { HelpButton } from '../Help/HelpButton';

interface AnalyticsModalProps {
  project: Project;
  trades: TradePackage[];
  onClose: () => void;
  onOpenPrompt?: (type: string) => void;
  onOpenTrades?: () => void;
  onOpenTenderView?: () => void;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  project,
  trades,
  onClose,
  onOpenPrompt,
  onOpenTrades,
  onOpenTenderView,
}) => {
  const app = useAppContextOptional();
  useHelpContext('ANALYTICS');
  const { contentRef, contentProps } = useModalFocus(true, onClose);
  const totalValue = calculateProjectTotal(project);

  const tradeData = useMemo(() => {
    const map = new Map<string, number>();
    map.set('Unassigned', 0);

    project.bills.forEach((bill) => {
      bill.sections.forEach((section) => {
        section.items.forEach((item) => {
          if (item.type !== 'PRICED') return;

          const value = item.total || safeMul(item.quantity, item.rate);
          const tradeId = item.tradePackageId || 'Unassigned';
          const current = map.get(tradeId) || 0;
          map.set(tradeId, current + value);
        });
      });
    });

    const palette = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#0f766e', '#ec4899', '#8b5cf6', '#84cc16'];
    const data: { name: string; value: number; color: string; percentage: number }[] = [];

    trades.forEach((trade, idx) => {
      const value = map.get(trade.id);
      if (value && value > 0) {
        data.push({
          name: trade.name,
          value,
          color: palette[idx % palette.length],
          percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
        });
      }
      map.delete(trade.id);
    });

    const unassigned = map.get('Unassigned');
    if (unassigned && unassigned > 0) {
      data.push({
        name: 'Unassigned',
        value: unassigned,
        color: '#94a3b8',
        percentage: totalValue > 0 ? (unassigned / totalValue) * 100 : 0,
      });
    }

    return data.sort((left, right) => right.value - left.value);
  }, [project, totalValue, trades]);

  const conicGradient = useMemo(() => {
    if (tradeData.length === 0) {
      return 'conic-gradient(#cbd5e1 0deg 360deg)';
    }

    let currentDeg = 0;
    const segments = tradeData.map((entry) => {
      const degrees = (entry.percentage / 100) * 360;
      const segment = `${entry.color} ${currentDeg}deg ${currentDeg + degrees}deg`;
      currentDeg += degrees;
      return segment;
    });

    return `conic-gradient(${segments.join(', ')})`;
  }, [tradeData]);

  const leadTrade = tradeData[0];
  const secondTrade = tradeData[1];
  const leadGap = leadTrade && secondTrade ? leadTrade.value - secondTrade.value : 0;
  const unassignedTrade = tradeData.find((entry) => entry.name === 'Unassigned');
  const hasTradeValue = tradeData.length > 0;
  const hasUnassignedExposure = Boolean(unassignedTrade && unassignedTrade.value > 0);
  const unassignedSeverityClasses = hasUnassignedExposure
    ? 'border-amber-200/90 bg-amber-50/92 dark:border-amber-900/80 dark:bg-amber-950/22'
    : 'border-emerald-200/80 bg-emerald-50/88 dark:border-emerald-900/80 dark:bg-emerald-900/20';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-in fade-in dark:bg-black/60" onClick={onClose}>
      <div
        ref={contentRef}
        {...contentProps}
        aria-labelledby="analytics-modal-title"
        aria-describedby="analytics-modal-desc"
        data-help-id="help-analytics"
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-app-xl border border-slate-200/80 bg-white/95 shadow-app-lg dark:border-slate-700 dark:bg-surface-900/95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200/80 bg-white/90 px-6 py-6 backdrop-blur-xl dark:border-slate-700/80 dark:bg-surface-900/95">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl space-y-3">
              <div className="workspace-chip px-3 py-1 text-[11px] tracking-[0.28em]">
                <PieChart className="h-3.5 w-3.5" />
                Project analytics
              </div>
              <div>
                <h2 id="analytics-modal-title" className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                  Commercial breakdown and trade exposure
                </h2>
                <p id="analytics-modal-desc" className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Read where value sits, expose missing trade structure, and move directly into the next commercial action.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HelpButton compact onClick={() => app?.openHelp('ANALYTICS')} />
              <button type="button" onClick={onClose} aria-label="Close analytics" className="rounded-app-sm border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300 dark:hover:bg-surface-800">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,_rgba(71,100,118,0.1),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2f5_100%)] px-6 py-6 dark:bg-surface-950">
          <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-app border border-slate-200/80 bg-white/88 px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-surface-900/85">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                <PoundSterling className="h-3.5 w-3.5" />
                Total value
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">GBP {formatCurrency(totalValue)}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Current priced exposure across the full project.</div>
            </div>

            <div className="rounded-app border border-slate-200/80 bg-white/88 px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-surface-900/85">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                <Layers3 className="h-3.5 w-3.5" />
                Active packages
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{tradeData.length}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {hasTradeValue ? 'Packages currently carrying priced value.' : 'No priced package exposure yet.'}
              </div>
            </div>

            <div className="rounded-app border border-emerald-200/80 bg-emerald-50/88 px-4 py-4 shadow-sm dark:border-emerald-900/80 dark:bg-emerald-900/20">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Lead package
              </div>
              <div className="mt-3 text-lg font-semibold text-emerald-950 dark:text-emerald-100">{leadTrade?.name || 'No priced scope yet'}</div>
              <div className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                {leadTrade ? `GBP ${formatCurrency(leadTrade.value)} • ${leadTrade.percentage.toFixed(1)}% of project value` : 'Build priced scope to surface the lead package'}
              </div>
            </div>

            <div className={`rounded-app border px-4 py-4 shadow-sm ${unassignedSeverityClasses}`}>
              <div className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] ${
                hasUnassignedExposure ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'
              }`}>
                {hasUnassignedExposure ? <AlertTriangle className="h-3.5 w-3.5" /> : <BadgePercent className="h-3.5 w-3.5" />}
                Unassigned value
              </div>
              <div className={`mt-3 text-2xl font-semibold tracking-tight ${
                hasUnassignedExposure ? 'text-amber-950 dark:text-amber-100' : 'text-emerald-950 dark:text-emerald-100'
              }`}>
                {unassignedTrade ? `GBP ${formatCurrency(unassignedTrade.value)}` : 'GBP 0.00'}
              </div>
              <div className={`mt-1 text-xs ${
                hasUnassignedExposure ? 'text-amber-700/80 dark:text-amber-300/80' : 'text-emerald-700/80 dark:text-emerald-300/80'
              }`}>
                {unassignedTrade ? `${unassignedTrade.percentage.toFixed(1)}% of project value still needs trade allocation` : 'All current priced scope is assigned to a trade package'}
              </div>
              {hasUnassignedExposure && onOpenTrades && (
                <button
                  type="button"
                  onClick={onOpenTrades}
                  className="mt-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800 transition hover:text-amber-950 dark:text-amber-200 dark:hover:text-amber-50"
                >
                  Review trade packages
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-app-xl border border-slate-200/80 bg-white/92 p-6 shadow-card dark:border-slate-700 dark:bg-surface-900/95">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-400">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Cost by trade
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Distribution map</h3>
                  <p className="mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">
                    Read where commercial weight sits first, then challenge the ranking alongside it.
                  </p>
                </div>
                {leadTrade ? (
                  <div className="rounded-app border border-slate-200 bg-surface px-4 py-3 text-right dark:border-slate-700 dark:bg-surface-800">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Lead package</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{leadTrade.name}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{leadTrade.percentage.toFixed(1)}% of total value</div>
                  </div>
                ) : null}
              </div>

              {tradeData.length > 0 ? (
                <div className="mt-8 flex flex-col items-center justify-center gap-8 lg:flex-row lg:items-center">
                  <div className="relative h-80 w-80 rounded-full shadow-inner ring-1 ring-slate-200/80 dark:ring-slate-700/80" style={{ background: conicGradient }}>
                    <div className="absolute inset-0 m-auto flex h-48 w-48 flex-col items-center justify-center rounded-full border border-slate-200 bg-white/95 shadow-app dark:border-slate-700 dark:bg-surface-900/95">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400 dark:text-slate-500">Total value</span>
                      <span className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">GBP {formatCurrency(totalValue)}</span>
                      <span className="mt-2 text-xs text-slate-500 dark:text-slate-400">{tradeData.length} packages carrying value</span>
                    </div>
                  </div>

                  <div className="grid w-full gap-3">
                    {tradeData.slice(0, 4).map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between rounded-app border border-slate-200 bg-surface px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-surface-800">
                        <div className="flex items-center gap-3">
                          <div className="h-4 w-4 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                          <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{entry.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{entry.percentage.toFixed(1)}% of project value</div>
                          </div>
                        </div>
                        <div className="text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">GBP {formatCurrency(entry.value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-8 rounded-app-lg border border-dashed border-slate-300 bg-surface px-6 py-12 text-center dark:border-slate-700 dark:bg-surface-800">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-app bg-slate-100 text-slate-700 dark:bg-surface-800 dark:text-slate-200">
                    <PieChart className="h-7 w-7" />
                  </div>
                  <h4 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Commercial insight is waiting for priced scope</h4>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Add priced items first, then allocate them to trade packages so this view can expose real commercial concentration.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    {onOpenPrompt && (
                      <button type="button" onClick={() => onOpenPrompt('ADD_BILL')} className="workspace-primary-btn px-4 py-2 text-sm">
                        Create or extend bill scope
                      </button>
                    )}
                    {onOpenTrades && (
                      <button type="button" onClick={onOpenTrades} className="workspace-secondary-btn px-4 py-2 text-sm">
                        Review trade packages
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-app-xl border border-slate-200/80 bg-white/92 p-6 shadow-card dark:border-slate-700 dark:bg-surface-900/95">
                <div className="mb-5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Ranked breakdown</div>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Package list</h3>
                </div>
                <div className="space-y-3">
                  {tradeData.length > 0 ? (
                    tradeData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center justify-between rounded-app border border-slate-200 bg-surface px-4 py-3 transition hover:border-slate-300 dark:border-slate-700 dark:bg-surface-800 dark:hover:border-slate-600">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                            {index + 1}
                          </div>
                          <div className="h-4 w-4 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                          <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{entry.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{entry.percentage.toFixed(1)}% of total</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">GBP {formatCurrency(entry.value)}</div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">Rank {index + 1}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-app border border-dashed border-slate-300 bg-surface px-4 py-6 text-center dark:border-slate-700 dark:bg-surface-800">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">No ranked package exposure yet</div>
                      <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Price items and assign trades before relying on package comparisons.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-app-xl border border-slate-200/80 bg-slate-900 p-6 text-white shadow-card dark:border-slate-700 dark:bg-slate-100 dark:text-slate-900">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300 dark:text-slate-500">Commercial insight</div>
                    <div className="mt-3 text-2xl font-semibold tracking-tight">
                      {hasUnassignedExposure
                        ? 'Trade allocation needs attention'
                        : leadTrade
                          ? leadTrade.name
                          : 'Waiting for priced scope'}
                    </div>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-slate-200 dark:text-slate-700">
                      {hasUnassignedExposure
                        ? `GBP ${formatCurrency(unassignedTrade?.value || 0)} remains outside trade packages. Allocate that scope before relying on tender or package comparisons.`
                        : leadTrade
                          ? leadGap > 0 && secondTrade
                            ? `${leadTrade.name} leads the next package, ${secondTrade.name}, by GBP ${formatCurrency(leadGap)}. Review whether that concentration matches the commercial strategy.`
                            : `${leadTrade.name} currently holds the largest share of project value.`
                          : 'Build priced scope first, then this panel will surface the dominant commercial positions.'}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {hasUnassignedExposure && onOpenTrades ? (
                        <button type="button" onClick={onOpenTrades} className="rounded-app-sm border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-white/15 dark:border-slate-300 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300">
                          Fix trade allocation
                        </button>
                      ) : leadTrade && onOpenTenderView ? (
                        <button type="button" onClick={onOpenTenderView} className="rounded-app-sm border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-white/15 dark:border-slate-300 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300">
                          Open tender analysis
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="rounded-app bg-white/10 p-3 dark:bg-slate-200">
                    <PoundSterling className="h-8 w-8 text-white dark:text-slate-900" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
