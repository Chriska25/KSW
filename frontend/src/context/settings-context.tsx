'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { DEFAULT_SETTINGS, type SystemSettings } from '@/lib/studio-defaults';

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

export function SettingsProvider({ children, initialSettings }: SettingsProviderProps) {
  const [settings, setSettings] = useState<SystemSettings>(initialSettings ?? DEFAULT_SETTINGS);

  const fetchLiveSettings = async () => {
    try {
      const res = await apiClient.get(`/settings?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache' },
      });
      const data = res.data;
      if (data && data.data && Object.keys(data.data).length > 0) {
        setSettings((prev) => {
          const merged = { ...prev, ...data.data };
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
  };

  useEffect(() => {
    fetchLiveSettings();

    const interval = setInterval(() => {
      fetchLiveSettings();
    }, 30000);

    const handleUpdate = () => fetchLiveSettings();
    window.addEventListener('settings_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('settings_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const fullStudioName = `${settings.studioNameFirstPart || 'KSW'} ${settings.studioNameSecondPart || 'STUDIO'}`.trim();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const activeTitle = settings.siteTitle || `${fullStudioName} - Photographie d'Art & Studio Photo d'Exception`;
      document.title = activeTitle;
    }
  }, [settings, settings.siteTitle, fullStudioName]);

  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      localStorage.setItem('studio_settings', JSON.stringify(updated));
    } catch {
      // localStorage indisponible
    }

    const res = await apiClient.post('/settings', { settings: updated });
    if (res.data?.status === 'error') {
      throw new Error(res.data.message || 'Erreur lors de la sauvegarde des paramètres');
    }

    if (res.data?.data) {
      setSettings((prev) => ({ ...prev, ...res.data.data }));
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('settings_updated'));
    }
  };

  const getCurrencySymbol = (currencyStr: string) => {
    if (currencyStr.includes('(') && currencyStr.includes(')')) {
      const match = currencyStr.match(/\((.*?)\)/);
      if (match && match[1]) return match[1];
    }
    return currencyStr.trim() || '€';
  };

  const currencySymbol = getCurrencySymbol(settings.currency);

  const formatPrice = (amount: number) => {
    return `${amount.toLocaleString('fr-FR')} ${currencySymbol}`;
  };

  return (
    <SettingsContext.Provider
      value={{
        settings: { ...settings, studioName: fullStudioName },
        updateSettings,
        formatPrice,
        currencySymbol,
        fullStudioName,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
