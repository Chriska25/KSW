'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface AdminToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const AdminToastContext = createContext<AdminToastContextValue>({
  toast: () => {},
});

export function AdminToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = String(Date.now());
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const iconMap = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
  };

  const colorMap = {
    success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    error: 'border-red-500/40 bg-red-500/10 text-red-300',
    info: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  };

  return (
    <AdminToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const Icon = iconMap[t.type];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md text-sm font-medium animate-in slide-in-from-right-4 fade-in duration-300 ${colorMap[t.type]}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-white">{t.message}</span>
              <button type="button" onClick={() => dismiss(t.id)} className="ml-2 text-zinc-400 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </AdminToastContext.Provider>
  );
}

export const useAdminToast = () => useContext(AdminToastContext);
