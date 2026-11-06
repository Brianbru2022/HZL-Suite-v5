import React from 'react';
import { HelpCircle, PlayCircle, X } from 'lucide-react';
import type { HelpArticle } from '../../types';

type HelpMode = 'GUIDE' | 'HOW_TO' | 'WALKTHROUGH';

export function HelpPanel({
  isOpen,
  article,
  onClose,
  onStartWalkthrough,
}: {
  isOpen: boolean;
  article: HelpArticle | null;
  onClose: () => void;
  onStartWalkthrough: (stepId?: string) => void;
}) {
  const [mode, setMode] = React.useState<HelpMode>('GUIDE');
  const [selectedSectionIndex, setSelectedSectionIndex] = React.useState(0);
  const [selectedHowToIndex, setSelectedHowToIndex] = React.useState(0);
  const [selectedWalkthroughIndex, setSelectedWalkthroughIndex] = React.useState(0);
  const [position, setPosition] = React.useState<{ left: number; top: number } | null>(null);
  const dragRef = React.useRef<{ pointerId: number; startX: number; startY: number; originLeft: number; originTop: number } | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setMode(article?.howTos?.length ? 'HOW_TO' : 'GUIDE');
    setSelectedSectionIndex(0);
    setSelectedHowToIndex(0);
    setSelectedWalkthroughIndex(0);
    setPosition(null);
  }, [article?.id, isOpen]);

  if (!isOpen || !article) return null;

  const activeSection = article.sections[selectedSectionIndex] || article.sections[0];
  const activeHowTo = article.howTos?.[selectedHowToIndex] || article.howTos?.[0];
  const activeWalkthroughStep = article.walkthroughSteps?.[selectedWalkthroughIndex] || article.walkthroughSteps?.[0];

  const modeButtonClass = (isActive: boolean) =>
    `rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${
      isActive
        ? 'bg-emerald-800 text-white dark:bg-emerald-800 dark:text-emerald-50'
        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300 dark:hover:bg-surface-800'
    }`;

  const defaultLeft = Math.max(16, window.innerWidth / 2 - 480);
  const defaultTop = Math.max(16, window.innerHeight / 2 - 320);
  const resolvedLeft = position?.left ?? defaultLeft;
  const resolvedTop = position?.top ?? defaultTop;

  const clampPosition = React.useCallback((left: number, top: number) => ({
    left: Math.min(Math.max(16, left), Math.max(16, window.innerWidth - 976)),
    top: Math.min(Math.max(16, top), Math.max(16, window.innerHeight - 240)),
  }), []);

  const handleDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const origin = position ?? { left: defaultLeft, top: defaultTop };
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: origin.left,
      originTop: origin.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handleDragMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    const nextLeft = dragRef.current.originLeft + (event.clientX - dragRef.current.startX);
    const nextTop = dragRef.current.originTop + (event.clientY - dragRef.current.startY);
    setPosition(clampPosition(nextLeft, nextTop));
  };

  const handleDragEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div className="fixed inset-0 z-[130]">
      <div className="absolute inset-0 bg-slate-950/38 backdrop-blur-[1px]" onClick={onClose} aria-hidden />
      <div className="absolute inset-0 overflow-y-auto px-4 py-8 sm:px-6">
        <div
          className="absolute w-full max-w-5xl overflow-hidden rounded-app-xl border border-slate-300 bg-white shadow-[0_24px_70px_-18px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-surface-900"
          style={{ left: resolvedLeft, top: resolvedTop }}
        >
          <div
            className="border-b border-slate-200 bg-white px-6 py-5 dark:border-slate-700 dark:bg-surface-900 cursor-move select-none"
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="workspace-chip mb-2">
                  <HelpCircle className="h-3.5 w-3.5" />
                  Screen guide
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{article.title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{article.summary}</p>
              </div>
              <button type="button" onClick={onClose} className="workspace-secondary-btn px-3 py-2 text-xs">
                <X className="h-4 w-4" />
                Close
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setMode('HOW_TO')} className={modeButtonClass(mode === 'HOW_TO')}>
                How do I
              </button>
              <button type="button" onClick={() => setMode('GUIDE')} className={modeButtonClass(mode === 'GUIDE')}>
                Screen guide
              </button>
              {article.walkthroughSteps && article.walkthroughSteps.length > 0 && (
                <button type="button" onClick={() => setMode('WALKTHROUGH')} className={modeButtonClass(mode === 'WALKTHROUGH')}>
                  Walkthrough
                </button>
              )}
            </div>
          </div>

          <div className="grid max-h-[72vh] min-h-[28rem] grid-cols-1 overflow-hidden md:grid-cols-[18rem_minmax(0,1fr)]">
            <div className="border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-surface-950 md:border-b-0 md:border-r">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                {mode === 'GUIDE' ? 'Guide sections' : mode === 'HOW_TO' ? 'Tasks' : 'Walkthrough steps'}
              </div>
              <div className="mt-3 space-y-2">
                {mode === 'GUIDE' &&
                  article.sections.map((section, index) => (
                    <button
                      key={section.title}
                      type="button"
                      onClick={() => setSelectedSectionIndex(index)}
                      className={`w-full rounded-app-lg border px-3 py-3 text-left transition ${
                        index === selectedSectionIndex
                          ? 'border-primary-300 bg-primary-50 text-primary-900 dark:border-primary-700 dark:bg-primary-900/25 dark:text-primary-100'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300 dark:hover:bg-surface-800'
                      }`}
                    >
                      <div className="text-sm font-semibold">{section.title}</div>
                      <div className="mt-1 text-xs leading-5 opacity-80">{section.bullets[0]}</div>
                    </button>
                  ))}

                {mode === 'HOW_TO' &&
                  (article.howTos?.length ? (
                    article.howTos.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedHowToIndex(index)}
                        className={`w-full rounded-app-lg border px-3 py-3 text-left transition ${
                          index === selectedHowToIndex
                            ? 'border-primary-300 bg-primary-50 text-primary-900 dark:border-primary-700 dark:bg-primary-900/25 dark:text-primary-100'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300 dark:hover:bg-surface-800'
                        }`}
                      >
                        <div className="text-sm font-semibold">{item.title}</div>
                        <div className="mt-1 text-xs leading-5 opacity-80">{item.summary}</div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-app-lg border border-slate-200 bg-white p-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-400">
                      This screen does not have task-specific help yet. Use the screen guide instead.
                    </div>
                  ))}

                {mode === 'WALKTHROUGH' &&
                  article.walkthroughSteps?.map((step, index) => (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setSelectedWalkthroughIndex(index)}
                      className={`w-full rounded-app-lg border px-3 py-3 text-left transition ${
                        index === selectedWalkthroughIndex
                          ? 'border-primary-300 bg-primary-50 text-primary-900 dark:border-primary-700 dark:bg-primary-900/25 dark:text-primary-100'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300 dark:hover:bg-surface-800'
                      }`}
                    >
                      <div className="text-sm font-semibold">{step.title}</div>
                      <div className="mt-1 text-xs leading-5 opacity-80">{step.body}</div>
                    </button>
                  ))}
              </div>
            </div>

            <div className="overflow-y-auto bg-slate-50 p-5 dark:bg-surface-950">
              {mode === 'GUIDE' && activeSection && (
                <section className="rounded-app-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-surface-900">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    {activeSection.title}
                  </div>
                  <div className="mt-4 space-y-3">
                    {activeSection.bullets.map((bullet) => (
                      <p key={bullet} className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                        {bullet}
                      </p>
                    ))}
                  </div>
                </section>
              )}

              {mode === 'HOW_TO' && activeHowTo && (
                <section className="rounded-app-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-surface-900">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    How do I
                  </div>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{activeHowTo.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{activeHowTo.summary}</p>
                  <ol className="mt-5 space-y-3">
                    {activeHowTo.steps.map((step, index) => (
                      <li key={step} className="flex gap-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-xs font-semibold text-white dark:bg-emerald-800 dark:text-emerald-50">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  {activeHowTo.walkthroughStepId && article.walkthroughSteps?.length ? (
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={() => onStartWalkthrough(activeHowTo.walkthroughStepId)}
                        className="workspace-primary-btn px-4 py-2 text-sm"
                      >
                        <PlayCircle className="h-4 w-4" />
                        Start walkthrough
                      </button>
                    </div>
                  ) : null}
                </section>
              )}

              {mode === 'WALKTHROUGH' && activeWalkthroughStep && (
                <section className="rounded-app-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-surface-900">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    Guided walkthrough
                  </div>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{activeWalkthroughStep.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{activeWalkthroughStep.body}</p>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onStartWalkthrough(activeWalkthroughStep.id)}
                      className="workspace-primary-btn px-4 py-2 text-sm"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Start from this step
                    </button>
                    <button type="button" onClick={() => onStartWalkthrough()} className="workspace-secondary-btn px-4 py-2 text-sm">
                      <PlayCircle className="h-4 w-4" />
                      Start full walkthrough
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
