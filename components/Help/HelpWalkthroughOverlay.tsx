import React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { WalkthroughStep } from '../../types';

export function HelpWalkthroughOverlay({
  steps,
  stepIndex,
  onPrevious,
  onNext,
  onClose,
}: {
  steps: WalkthroughStep[];
  stepIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const step = steps[stepIndex];
  const [targetRect, setTargetRect] = React.useState<DOMRect | null>(null);
  const [position, setPosition] = React.useState<{ left: number; top: number } | null>(null);
  const dragRef = React.useRef<{ pointerId: number; startX: number; startY: number; originLeft: number; originTop: number } | null>(null);

  React.useEffect(() => {
    if (!step?.targetId) {
      setTargetRect(null);
      return;
    }

    const initialTarget = document.querySelector(`[data-help-id="${step.targetId}"]`) as HTMLElement | null;
    initialTarget?.scrollIntoView({ block: 'nearest', inline: 'nearest' });

    const updateRect = () => {
      const target = document.querySelector(`[data-help-id="${step.targetId}"]`) as HTMLElement | null;
      setTargetRect(target?.getBoundingClientRect() || null);
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    const interval = window.setInterval(updateRect, 300);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
      window.clearInterval(interval);
    };
  }, [step]);

  React.useEffect(() => {
    setPosition(null);
  }, [stepIndex, step?.id]);

  if (!step) return null;

  const prefersAbove = targetRect && targetRect.bottom > window.innerHeight * 0.62;
  const cardTop = targetRect
    ? prefersAbove
      ? Math.max(24, targetRect.top - 220)
      : Math.min(window.innerHeight - 220, targetRect.bottom + 16)
    : 96;
  const cardLeft = targetRect ? Math.min(Math.max(24, targetRect.left), window.innerWidth - 420) : Math.max(24, window.innerWidth / 2 - 190);
  const resolvedLeft = position?.left ?? cardLeft;
  const resolvedTop = position?.top ?? cardTop;

  const clampPosition = React.useCallback((left: number, top: number) => ({
    left: Math.min(Math.max(16, left), Math.max(16, window.innerWidth - 396)),
    top: Math.min(Math.max(16, top), Math.max(16, window.innerHeight - 220)),
  }), []);

  const handleDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const origin = position ?? { left: cardLeft, top: cardTop };
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
    <div className="pointer-events-none fixed inset-0 z-[170]">
      <button type="button" aria-label="Close walkthrough" className="pointer-events-auto absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]" onClick={onClose} />
      {targetRect && (
        <div
          className="absolute rounded-app-lg border-2 border-primary-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.35)] transition-all"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      )}
      <div
        className="pointer-events-auto absolute w-[380px] max-w-[calc(100vw-2rem)] rounded-app-xl border border-slate-200 bg-white p-5 shadow-app-lg dark:border-emerald-800/70 dark:bg-surface-900"
        style={{ top: resolvedTop, left: resolvedLeft }}
      >
        <div
          className="flex items-start justify-between gap-3 cursor-move select-none"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        >
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              Walkthrough step {stepIndex + 1} of {steps.length}
            </div>
            <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">{step.title}</h3>
          </div>
          <button type="button" onClick={onClose} className="workspace-secondary-btn px-2 py-2 text-xs">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{step.body}</p>
        {!targetRect && step.targetId && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
            This step is not visible right now. Open the related screen area, then continue.
          </p>
        )}
        <div className="mt-5 flex items-center justify-between">
          <button type="button" onClick={onPrevious} disabled={stepIndex === 0} className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-50">
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <button type="button" onClick={onNext} className="workspace-primary-btn px-3 py-2 text-xs">
            {stepIndex === steps.length - 1 ? 'Finish' : 'Next'}
            {stepIndex !== steps.length - 1 && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
