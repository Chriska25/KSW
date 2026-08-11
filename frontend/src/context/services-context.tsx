'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { onVisibleInterval } from '@/lib/visible-interval';
import type { ServiceItem } from '@/lib/service-types';

interface ServicesContextType {
  services: ServiceItem[];
  seedServices: (items: ServiceItem[]) => void;
}

const ServicesContext = createContext<ServicesContextType>({
  services: [],
  seedServices: () => {},
});

interface ServicesProviderProps {
  children: React.ReactNode;
  initialServices?: ServiceItem[];
}

const SYNC_INTERVAL_MS = 300_000;

export function ServicesProvider({ children, initialServices = [] }: ServicesProviderProps) {
  const [services, setServices] = useState<ServiceItem[]>(initialServices);
  const hasInitialData = initialServices.length > 0;

  const seedServices = useCallback((items: ServiceItem[]) => {
    if (!items.length) return;
    setServices(items);
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const res = await apiClient.get('/services');
      if (res.data && Array.isArray(res.data.data)) {
        const active = res.data.data.filter((s: ServiceItem) => s.isActive !== false);
        setServices(active);
      }
    } catch {
      // Silencieux — prestations SSR déjà injectées depuis le layout
    }
  }, []);

  useEffect(() => {
    if (!hasInitialData) {
      fetchServices();
    }
    const clearInterval = onVisibleInterval(fetchServices, SYNC_INTERVAL_MS);
    return () => clearInterval();
  }, [fetchServices, hasInitialData]);

  const value = useMemo(() => ({ services, seedServices }), [services, seedServices]);

  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export const useServices = () => useContext(ServicesContext);

export function useServicesSeed() {
  return useContext(ServicesContext).seedServices;
}
