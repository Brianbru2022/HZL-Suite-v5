import type { ReactNode } from 'react';

type LibraryEmptyStateProps = {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  titleClassName?: string;
};

export function LibraryEmptyState({
  icon,
  title,
  description,
  actions,
  titleClassName = 'text-base font-semibold text-slate-700 dark:text-slate-200',
}: LibraryEmptyStateProps) {
  return (
    <div className="flex max-w-xl flex-col items-center justify-center rounded-app-xl border border-dashed border-slate-300 bg-white/70 px-8 py-14 text-center dark:border-slate-700 dark:bg-[rgb(20_28_34_/_0.9)]">
      {icon}
      <div className={`mt-4 ${titleClassName}`}>{title}</div>
      {description && (
        <p className="mt-3 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
      {actions}
    </div>
  );
}
