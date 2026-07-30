'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import type { ServiceItem } from '@/lib/service-types';

interface ServicesContextType {
  services: ServiceItem[];
}

const ServicesContext = createContext<ServicesContextType>({ services: [] });

interface ServicesProviderProps {
  children: React.ReactNode;
  initialServices?: ServiceItem[];
}

const SYNC_INTERVAL_MS = 300_000;

export function ServicesProvider({ children, initialServices = [] }: ServicesProviderProps) {
  const [services, setServices] = useState<ServiceItem[]>(initialServices);
  const hasInitialData = initialServices.length > 0;

  const fetchServices = useCallback(async () => {
    try {
      const res = await apiClient.get('/services', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.data && Array.isArray(res.data.data)) {
        const active = res.data.data.filter((s: ServiceItem) => s.isActive !== false);
        setServices(active);
      }
    } catch (e) {
      console.error('Erreur synchronisation prestations:', e);
    }
  }, []);

  useEffect(() => {
    if (!hasInitialData) {
      fetchServices();
    }
    const interval = setInterval(fetchServices, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchServices, hasInitialData]);

  const value = useMemo(() => ({ services }), [services]);

  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export const useServices = () => useContext(ServicesContext);
