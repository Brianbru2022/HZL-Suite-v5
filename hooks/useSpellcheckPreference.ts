import React from 'react';

export type SpellcheckLanguage = 'en-GB' | 'en-US';

export type SpellcheckPreference = {
  enabled: boolean;
  language: SpellcheckLanguage;
};

const STORAGE_KEY = 'qspro.spellcheckPreference';
const DEFAULT_PREFERENCE: SpellcheckPreference = {
  enabled: true,
  language: 'en-GB',
};
const EVENT_NAME = 'qspro:spellcheck-preference-changed';

function normalizePreference(value: unknown): SpellcheckPreference {
  if (!value || typeof value !== 'object') return DEFAULT_PREFERENCE;
  const next = value as Partial<SpellcheckPreference>;
  return {
    enabled: next.enabled !== false,
    language: next.language === 'en-US' ? 'en-US' : 'en-GB',
  };
}

export function getSpellcheckPreference(): SpellcheckPreference {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCE;
    return normalizePreference(JSON.parse(raw));
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

export function setSpellcheckPreference(preference: SpellcheckPreference) {
  if (typeof window === 'undefined') return;
  const normalized = normalizePreference(preference);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: normalized }));
}

export function useSpellcheckPreference() {
  const [preference, setPreferenceState] = React.useState<SpellcheckPreference>(() => getSpellcheckPreference());

  React.useEffect(() => {
    const sync = () => setPreferenceState(getSpellcheckPreference());
    const syncFromEvent = (event: Event) => {
      const detail = (event as CustomEvent<SpellcheckPreference>).detail;
      setPreferenceState(normalizePreference(detail));
    };
    window.addEventListener('storage', sync);
    window.addEventListener(EVENT_NAME, syncFromEvent as EventListener);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(EVENT_NAME, syncFromEvent as EventListener);
    };
  }, []);

  const updatePreference = React.useCallback((next: SpellcheckPreference) => {
    setSpellcheckPreference(next);
    setPreferenceState(normalizePreference(next));
  }, []);

  return { preference, setPreference: updatePreference };
}
