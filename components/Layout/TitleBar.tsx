import React, { useState, useEffect } from 'react';
import { Minus, Square, X } from 'lucide-react';
import { APP_NAME } from '../../utils/branding';
import { AppMark } from './AppMark';

function useTauriWindow() {
  const [win, setWin] = useState<{ minimize: () => void; toggleMaximize: () => void; close: () => void } | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const w = await import('@tauri-apps/api/window').then((m) => m.getCurrentWindow());
        if (cancelled) return;
        setWin({
          minimize: () => w.minimize(),
          toggleMaximize: () => w.toggleMaximize(),
          close: () => w.close(),
        });
      } catch {
        if (!cancelled) setWin(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return win;
}

type TitleBarButtonProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isDanger?: boolean;
};

function TitleBarButton({ icon, label, onClick, isDanger = false }: TitleBarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-9 h-9 flex items-center justify-center rounded-app-sm transition-colors focus:outline-none focus:ring-2 focus:ring-inset ${
        isDanger
          ? 'text-slate-500 dark:text-slate-400 hover:bg-red-500 hover:text-white focus:ring-red-500'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-800 focus:ring-primary-500'
      }`}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}

export function TitleBar() {
  const tauriWindow = useTauriWindow();
  const isTauri = tauriWindow !== null;

  return (
    <div
      className="h-10 shrink-0 flex items-center justify-between px-3 bg-surface/78 dark:bg-surface-950/92 border-b border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl select-none"
      data-tauri-drag-region
    >
      <div className="flex items-center gap-3 min-w-0" data-tauri-drag-region>
        <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-surface-800/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">
          Desktop
        </span>
        <AppMark data-tauri-drag-region />
        <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200" data-tauri-drag-region>
          {APP_NAME}
        </span>
      </div>
      {isTauri && tauriWindow && (
        <div className="flex items-center gap-1" data-tauri-drag-region={false}>
          <TitleBarButton
            icon={<Minus className="w-3.5 h-3.5" />}
            label="Minimize"
            onClick={() => tauriWindow.minimize()}
          />
          <TitleBarButton
            icon={<Square className="w-3.5 h-3.5" />}
            label="Maximize"
            onClick={() => tauriWindow.toggleMaximize()}
          />
          <TitleBarButton
            icon={<X className="w-3.5 h-3.5" />}
            label="Close"
            onClick={() => tauriWindow.close()}
            isDanger
          />
        </div>
      )}
    </div>
  );
}
