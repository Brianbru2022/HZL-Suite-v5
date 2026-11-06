import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { generateId } from '../utils/generateId';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  addedAt: number;
}

type ToastContextValue = {
  toasts: Toast[];
  showToast: (options: { type: ToastType; message: string; duration?: number }) => void;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 5000;
const MAX_TOASTS = 5;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, message, duration }: { type: ToastType; message: string; duration?: number }) => {
      const id = generateId();
      const addedAt = Date.now();
      setToasts((prev) => {
        const next = [...prev, { id, type, message, addedAt }];
        return next.slice(-MAX_TOASTS);
      });
      setTimeout(() => dismissToast(id), duration ?? AUTO_DISMISS_MS);
    },
    [dismissToast]
  );

  const value: ToastContextValue = { toasts, showToast, dismissToast };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      <div className="flex flex-col gap-2 pointer-events-auto">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </div>
    </div>
  );
}

const ToastItem: React.FC<{
  toast: Toast;
  onDismiss: (id: string) => void;
}> = ({
  toast,
  onDismiss,
}) => {
  const icons = {
    success: CheckCircle2,
    error: XCircle,
    info: Info,
  };
  const Icon = icons[toast.type];
  const styles = {
    success:
      'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 shadow-lg shadow-emerald-900/10',
    error:
      'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 shadow-lg shadow-red-900/10',
    info:
      'bg-slate-50 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-lg shadow-slate-900/10',
  };
  const iconStyles = {
    success: 'text-emerald-600 dark:text-emerald-400',
    error: 'text-red-600 dark:text-red-400',
    info: 'text-slate-500 dark:text-slate-400',
  };
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 animate-in slide-in-from-right-5 duration-300 ${styles[toast.type]}`}
      role="alert"
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconStyles[toast.type]}`} />
      <p className="text-sm font-medium flex-1 min-w-0">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 p-1 rounded-md opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-transparent"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
