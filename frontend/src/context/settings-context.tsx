'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import apiClient, { API_WRITE_TIMEOUT_MS } from '@/lib/api-client';
import { onVisibleInterval } from '@/lib/visible-interval';
import { DEFAULT_SETTINGS, type SystemSettings } from '@/lib/studio-defaults';
import { formatMoneyAmount, parseCurrencySetting, resolveStudioCurrency, DEFAULT_CURRENCY } from '@/lib/currency';
import { mergeSettingsFromApi, prepareSettingsPayloadForSave } from '@/lib/settings-merge';

export type { SystemSettings };
export { DEFAULT_SETTINGS };

interface SettingsContextType {
  settings: SystemSettings;
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
  formatPrice: (amount: number) => string;
  currencySymbol: string;
  currencyCode: string;
  fullStudioName: string;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  updateSettings: async () => {},
  formatPrice: (amount: number) => formatMoneyAmount(amount, DEFAULT_CURRENCY),
  currencySymbol: parseCurrencySetting(DEFAULT_CURRENCY).symbol,
  currencyCode: parseCurrencySetting(DEFAULT_CURRENCY).code,
  fullStudioName: 'KSW STUDIO',
});

interface SettingsProviderProps {
  children: React.ReactNode;
  initialSettings?: SystemSettings;
}

const SYNC_INTERVAL_MS = 300_000;
const SAVE_COOLDOWN_MS = 4000;

export function SettingsProvider({ children, initialSettings }: SettingsProviderProps) {
  const [settings, setSettings] = useState<SystemSettings>(() =>
    mergeSettingsFromApi(initialSettings ?? DEFAULT_SETTINGS)
  );
  const lastSaveAtRef = useRef(0);
  const hasSSRSettings = Boolean(
    initialSettings &&
      (initialSettings.studioNameFirstPart || initialSettings.siteTitle || initialSettings.studioName)
  );

  const fetchLiveSettings = useCallback(async (force = false) => {
    if (!force && Date.now() - lastSaveAtRef.current < SAVE_COOLDOWN_MS) {
      return;
    }

    try {
      const res = await apiClient.get('/settings');
      const data = res.data;
      if (data?.data && Object.keys(data.data).length > 0) {
        setSettings((prev) => {
          const merged = mergeSettingsFromApi(data.data, prev);
          try {
            localStorage.setItem('studio_settings', JSON.stringify(merged));
          } catch {
            // localStorage indisponible
          }
          return merged;
        });
      }
    } catch {
      // Silencieux en arrière-plan — données SSR déjà disponibles
    }
  }, []);

  useEffect(() => {
    if (!hasSSRSettings) {
      void fetchLiveSettings(true);
    }

    const clearInterval = onVisibleInterval(() => void fetchLiveSettings(false), SYNC_INTERVAL_MS);
    const handleUpdate = () => {
      if (document.visibilityState === 'visible') void fetchLiveSettings(false);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void fetchLiveSettings(false);
    };
    window.addEventListener('settings_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval();
      window.removeEventListener('settings_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchLiveSettings, hasSSRSettings]);

  const fullStudioName = `${settings.studioNameFirstPart || 'KSW'} ${settings.studioNameSecondPart || 'STUDIO'}`.trim();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const activeTitle = settings.siteTitle || `${fullStudioName} - Photographie d'Art & Studio Photo d'Exception`;
      document.title = activeTitle;
    }
  }, [settings.siteTitle, fullStudioName]);

  const updateSettings = useCallback(async (newSettings: Partial<SystemSettings>) => {
    let previousSettings = DEFAULT_SETTINGS as SystemSettings;
    let nextSettings = DEFAULT_SETTINGS as SystemSettings;

    setSettings((prev) => {
      previousSettings = prev;
      nextSettings = mergeSettingsFromApi(newSettings, prev);
      return nextSettings;
    });

    try {
      localStorage.setItem('studio_settings', JSON.stringify(nextSettings));
    } catch {
      // localStorage indisponible
    }

    try {
      const res = await apiClient.post(
        '/settings',
        { settings: prepareSettingsPayloadForSave(nextSettings) },
        { timeout: API_WRITE_TIMEOUT_MS }
      );
      if (res.data?.status === 'error') {
        throw new Error(res.data.message || 'Erreur lors de la sauvegarde des paramètres');
      }

      lastSaveAtRef.current = Date.now();

      if (res.data?.data) {
        setSettings((prev) => mergeSettingsFromApi(res.data.data, prev));
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('settings_updated'));
      }
    } catch (err) {
      setSettings(previousSettings);
      try {
        localStorage.setItem('studio_settings', JSON.stringify(previousSettings));
      } catch {
        // localStorage indisponible
      }
      throw err;
    }
  }, []);

  const getCurrencySymbol = useCallback((currencyStr: string) => {
    return parseCurrencySetting(currencyStr).symbol;
  }, []);

  const currencySymbol = useMemo(
    () => getCurrencySymbol(settings.currency),
    [getCurrencySymbol, settings.currency]
  );

  const currencyCode = useMemo(
    () => parseCurrencySetting(settings.currency).code,
    [settings.currency]
  );

  const formatPrice = useCallback(
    (amount: number) => formatMoneyAmount(amount, resolveStudioCurrency(settings.currency)),
    [settings.currency]
  );

  const value = useMemo(
    () => ({
      settings: { ...settings, studioName: fullStudioName },
      updateSettings,
      formatPrice,
      currencySymbol,
      currencyCode,
      fullStudioName,
    }),
    [settings, updateSettings, formatPrice, currencySymbol, currencyCode, fullStudioName]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
