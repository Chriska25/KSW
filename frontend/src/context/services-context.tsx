'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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

export function ServicesProvider({ children, initialServices = [] }: ServicesProviderProps) {
  const [services, setServices] = useState<ServiceItem[]>(initialServices);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await apiClient.get(`/services?t=${Date.now()}`, {
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        });
        if (res.data && Array.isArray(res.data.data)) {
          const active = res.data.data.filter((s: ServiceItem) => s.isActive !== false);
          setServices(active);
        }
      } catch (e) {
        console.error('Erreur synchronisation prestations:', e);
      }
    };

    fetchServices();
    const interval = setInterval(fetchServices, 30000);
    return () => clearInterval(interval);
  }, []);

  return <ServicesContext.Provider value={{ services }}>{children}</ServicesContext.Provider>;
}

export const useServices = () => useContext(ServicesContext);
