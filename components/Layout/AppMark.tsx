import React from 'react';

type AppMarkProps = React.HTMLAttributes<HTMLSpanElement> & {
  size?: 'sm' | 'md';
};

const sizeClasses = {
  sm: 'h-7 w-7 rounded-[7px]',
  md: 'h-8 w-8 rounded-app-sm',
};

export function AppMark({ size = 'sm', className = '', ...spanProps }: AppMarkProps) {
  return (
    <span
      {...spanProps}
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center border border-slate-300 bg-slate-50 text-slate-800 shadow-sm dark:border-slate-600 dark:bg-surface-900 dark:text-slate-100 ${sizeClasses[size]} ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[82%] w-[82%]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4.8 18.4h14.4"
          className="stroke-teal-700 dark:stroke-teal-300"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M6.1 18V7.8M6.1 7.8l2.2-1.2v11.2"
          className="stroke-teal-700 dark:stroke-teal-300"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 17.8V8.5l2.6-1.6 2.5 1.6v9.3"
          className="fill-slate-100 stroke-slate-700 dark:fill-surface-800 dark:stroke-slate-100"
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
        <path
          d="M15.1 17.8V10l2.8 1.5v6.3"
          className="fill-slate-200 stroke-slate-500 dark:fill-slate-700 dark:stroke-slate-300"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M7.4 10.1h-1M7.4 12.5h-1M7.4 14.9h-1"
          className="stroke-white dark:stroke-surface-950"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <path
          d="M10.7 12.3h3.7M10.7 14.8h4.7"
          className="stroke-slate-500 dark:stroke-slate-300"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <path
          d="m14.2 16.3 1.2 1.1 2.4-2.5"
          className="stroke-amber-500 dark:stroke-amber-300"
          strokeWidth="1.55"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
