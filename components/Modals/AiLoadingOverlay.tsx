/**
 * Full-screen overlay shown while AI is processing (e.g. generating BoQ hierarchy).
 */
import React from 'react';
import { Loader2, Cpu } from 'lucide-react';
import { useModalFocus } from '../../hooks/useModalFocus';

export interface AiLoadingOverlayProps {
  visible: boolean;
}

export function AiLoadingOverlay({ visible }: AiLoadingOverlayProps) {
  const { contentRef, contentProps } = useModalFocus(visible, () => {}, {
    closeOnEscape: false,
  });

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
      <div
        ref={contentRef}
        {...contentProps}
        aria-live="polite"
        aria-busy="true"
        aria-label="AI is working"
        className="workspace-shell flex w-full max-w-sm animate-in zoom-in flex-col items-center gap-4 p-6"
      >
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-violet-600 dark:text-violet-300" />
          <Cpu className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-violet-700 dark:text-violet-200" />
        </div>
        <div className="text-center">
          <h3 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">AI is working…</h3>
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            Processing your request and generating compliant bill items.
          </p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full w-1/2 animate-[progress_2s_ease-in-out_infinite] bg-violet-600 dark:bg-violet-400" />
        </div>
      </div>
    </div>
  );
}
