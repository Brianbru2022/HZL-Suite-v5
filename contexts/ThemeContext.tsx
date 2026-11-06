import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

const THEME_KEY = 'qs-pro-theme';

export type ThemePreference = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  effective: 'light' | 'dark';
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const s = localStorage.getItem(THEME_KEY);
    if (s === 'light' || s === 'dark' || s === 'system') return s;
  } catch {}
  return 'system';
}

function getSystemDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(getStoredPreference);
  const [systemDark, setSystemDark] = useState(getSystemDark);

  useEffect(() => {
    const m = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setSystemDark(m.matches);
    m.addEventListener('change', handler);
    return () => m.removeEventListener('change', handler);
  }, []);

  const effective: 'light' | 'dark' = useMemo(() => {
    if (preference === 'light') return 'light';
    if (preference === 'dark') return 'dark';
    return systemDark ? 'dark' : 'light';
  }, [preference, systemDark]);

  useEffect(() => {
    const root = document.documentElement;
    if (effective === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [effective]);

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p);
    try {
      localStorage.setItem(THEME_KEY, p);
    } catch {}
  };

  const value = useMemo(
    () => ({ preference, setPreference, effective }),
    [preference, effective]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
