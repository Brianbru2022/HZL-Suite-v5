import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import type { ThemePreference } from '../../contexts/ThemeContext';

export function ThemeToggle({
  showLabel = false,
  menuPlacement = 'bottom-end',
}: {
  showLabel?: boolean;
  menuPlacement?: 'bottom-end' | 'top-center' | 'top-start';
}) {
  const { preference, setPreference, effective } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cycle = () => {
    const next: ThemePreference = effective === 'dark' ? 'light' : 'dark';
    setPreference(next);
    setOpen(false);
  };
  const options: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
    { value: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
  ];
  const menuPositionClass = menuPlacement === 'top-center'
    ? 'bottom-full left-1/2 mb-2 -translate-x-1/2'
    : menuPlacement === 'top-start'
      ? 'bottom-full left-0 mb-2'
      : 'right-0 top-full mt-2';

  useEffect(() => {
    if (!open) return;

    const focusTimer = window.setTimeout(() => {
      const firstOption = menuRef.current?.querySelector<HTMLButtonElement>('button');
      firstOption?.focus();
    }, 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-app-sm text-slate-600 hover:bg-surface-muted dark:text-slate-300 dark:hover:bg-surface-800 border border-slate-200/60 dark:border-slate-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
        title="Theme"
        aria-label="Toggle theme"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="theme-menu"
      >
        {effective === 'dark' ? (
          <Moon className="w-4 h-4 text-slate-400 dark:text-slate-300" />
        ) : (
          <Sun className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        )}
        {showLabel && (
          <span className="text-xs font-medium capitalize">{effective}</span>
        )}
      </button>
      {open && (
        <div id="theme-menu" ref={menuRef} role="menu" aria-label="Theme options" className={`absolute ${menuPositionClass} w-40 py-1 rounded-app bg-surface dark:bg-surface-800 border border-slate-200 dark:border-slate-700 shadow-app-lg z-[100]`}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="menuitemradio"
              aria-checked={preference === opt.value}
              onClick={() => { setPreference(opt.value); setOpen(false); }}
              className={`w-[calc(100%-0.5rem)] flex items-center gap-2 px-3 py-2 text-left text-sm font-medium transition-colors rounded-app-sm mx-1 ${
                preference === opt.value
                  ? 'bg-primary-100 text-primary-900 dark:bg-emerald-900/40 dark:text-emerald-100'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-surface-muted dark:hover:bg-slate-700/70'
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
