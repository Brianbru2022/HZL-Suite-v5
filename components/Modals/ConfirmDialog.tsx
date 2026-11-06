import React from 'react';
import { AlertTriangle, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { useModalFocus } from '../../hooks/useModalFocus';

export type ConfirmVariant = 'danger' | 'default';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { contentRef, contentProps } = useModalFocus(open, onCancel);

  if (!open) return null;

  const isDanger = variant === 'danger';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/55 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        ref={contentRef}
        {...contentProps}
        className="workspace-shell w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
      >
        <div className={`border-b px-6 py-5 ${isDanger ? 'border-red-200/80 bg-red-50/80 dark:border-red-900/70 dark:bg-red-900/20' : 'border-slate-200/80 bg-white/90 dark:border-slate-700/80 dark:bg-surface-900/95'}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 gap-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-app ${isDanger ? 'bg-red-100 text-red-600 dark:bg-red-900/35 dark:text-red-300' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/35 dark:text-emerald-300'}`}>
                {isDanger ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <div className={`workspace-chip mb-3 ${isDanger ? 'border-red-200 bg-red-100/80 text-red-700 dark:border-red-900/80 dark:bg-red-900/30 dark:text-red-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                  {isDanger ? <AlertTriangle className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                  {isDanger ? 'Confirm destructive action' : 'Confirm action'}
                </div>
                <h2 id="confirm-dialog-title" className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                  {title}
                </h2>
                <p id="confirm-dialog-desc" className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {message}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="workspace-secondary-btn px-3 py-2 text-xs"
              aria-label="Close confirmation dialog"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>
        <div className="bg-white/88 px-6 py-4 dark:bg-surface-900/92">
          <div className="workspace-toolbar flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="workspace-secondary-btn"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex items-center justify-center gap-2 rounded-app-sm px-4 py-2.5 text-sm font-medium shadow-app transition-colors ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200'
            }`}
          >
            {confirmLabel}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
