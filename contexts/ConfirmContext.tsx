import React, { createContext, useContext, useState, useCallback } from 'react';
import { ConfirmDialog, type ConfirmOptions } from '../components/Modals/ConfirmDialog';

type AskConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

type ConfirmContextValue = {
  askConfirm: AskConfirmFn;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const askConfirm = useCallback<AskConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setPending({
        ...options,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (pending) {
      pending.resolve(true);
      setPending(null);
    }
  }, [pending]);

  const handleCancel = useCallback(() => {
    if (pending) {
      pending.resolve(false);
      setPending(null);
    }
  }, [pending]);

  return (
    <ConfirmContext.Provider value={{ askConfirm }}>
      {children}
      {pending && (
        <ConfirmDialog
          open={true}
          title={pending.title}
          message={pending.message}
          confirmLabel={pending.confirmLabel}
          cancelLabel={pending.cancelLabel}
          variant={pending.variant}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
