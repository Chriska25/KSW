'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  applyThemeClass,
  persistThemeMode,
  readStoredThemeMode,
  resolveIsDark,
  type ThemeMode,
} from '@/lib/theme';

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolved: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('dark');

  const applyMode = useCallback((nextMode: ThemeMode) => {
    const isDark = resolveIsDark(nextMode);
    applyThemeClass(isDark);
    setResolved(isDark ? 'dark' : 'light');
  }, []);

  const setMode = useCallback(
    (nextMode: ThemeMode) => {
      persistThemeMode(nextMode);
      setModeState(nextMode);
      applyMode(nextMode);
    },
    [applyMode]
  );

  useEffect(() => {
    const stored = readStoredThemeMode();
    setModeState(stored);
    applyMode(stored);
  }, [applyMode]);

  useEffect(() => {
    if (mode !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyMode('system');

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [mode, applyMode]);

  const value = useMemo(() => ({ mode, setMode, resolved }), [mode, setMode, resolved]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme doit être utilisé dans ThemeProvider.');
  }
  return ctx;
}
