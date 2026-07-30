'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { DEFAULT_SETTINGS, type SystemSettings } from '@/lib/studio-defaults';
import { stripSecretsFromSettings } from '@/lib/safe-redirect';

export type { SystemSettings };
export { DEFAULT_SETTINGS };

interface SettingsContextType {
  settings: SystemSettings;
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
  formatPrice: (amount: number) => string;
  currencySymbol: string;
  fullStudioName: string;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  updateSettings: async () => {},
  formatPrice: (amount: number) => `${amount} €`,
  currencySymbol: '€',
  fullStudioName: 'KSW STUDIO',
});

interface SettingsProviderProps {
  children: React.ReactNode;
  initialSettings?: SystemSettings;
}

const SYNC_INTERVAL_MS = 300_000;

export function SettingsProvider({ children, initialSettings }: SettingsProviderProps) {
  const [settings, setSettings] = useState<SystemSettings>(initialSettings ?? DEFAULT_SETTINGS);
  const hasInitialData = Boolean(initialSettings);

  const fetchLiveSettings = useCallback(async () => {
    try {
      const res = await apiClient.get('/settings', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = res.data;
      if (data?.data && Object.keys(data.data).length > 0) {
        setSettings((prev) => {
          const merged = stripSecretsFromSettings({ ...prev, ...data.data } as SystemSettings);
          try {
            localStorage.setItem('studio_settings', JSON.stringify(merged));
          } catch {
            // localStorage indisponible
          }
          return merged;
        });
      }
    } catch (e) {
      console.error('Erreur synchronisation API settings:', e);
    }
  }, []);

  useEffect(() => {
    if (!hasInitialData) {
      fetchLiveSettings();
    }

    const interval = setInterval(fetchLiveSettings, SYNC_INTERVAL_MS);
    const handleUpdate = () => fetchLiveSettings();
    window.addEventListener('settings_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('settings_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [fetchLiveSettings, hasInitialData]);

  const fullStudioName = `${settings.studioNameFirstPart || 'KSW'} ${settings.studioNameSecondPart || 'STUDIO'}`.trim();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const activeTitle = settings.siteTitle || `${fullStudioName} - Photographie d'Art & Studio Photo d'Exception`;
      document.title = activeTitle;
    }
  }, [settings.siteTitle, fullStudioName]);

  const updateSettings = useCallback(async (newSettings: Partial<SystemSettings>) => {
    let nextSettings = DEFAULT_SETTINGS as SystemSettings;
    setSettings((prev) => {
      nextSettings = stripSecretsFromSettings({ ...prev, ...newSettings } as SystemSettings);
      return nextSettings;
    });

    try {
      localStorage.setItem('studio_settings', JSON.stringify(nextSettings));
    } catch {
      // localStorage indisponible
    }

    const res = await apiClient.post('/settings', { settings: nextSettings });
    if (res.data?.status === 'error') {
      throw new Error(res.data.message || 'Erreur lors de la sauvegarde des paramètres');
    }

    if (res.data?.data) {
      setSettings((prev) => ({ ...prev, ...res.data.data }));
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('settings_updated'));
    }
  }, []);

  const getCurrencySymbol = useCallback((currencyStr: string) => {
    if (currencyStr.includes('(') && currencyStr.includes(')')) {
      const match = currencyStr.match(/\((.*?)\)/);
      if (match?.[1]) return match[1];
    }
    return currencyStr.trim() || '€';
  }, []);

  const currencySymbol = useMemo(
    () => getCurrencySymbol(settings.currency),
    [getCurrencySymbol, settings.currency]
  );

  const formatPrice = useCallback(
    (amount: number) => `${amount.toLocaleString('fr-FR')} ${currencySymbol}`,
    [currencySymbol]
  );

  const value = useMemo(
    () => ({
      settings: { ...settings, studioName: fullStudioName },
      updateSettings,
      formatPrice,
      currencySymbol,
      fullStudioName,
    }),
    [settings, updateSettings, formatPrice, currencySymbol, fullStudioName]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
