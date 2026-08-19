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
    success: 'border-success/30 bg-success-muted text-success',
    error: 'border-danger/30 bg-danger-muted text-danger',
    info: 'border-primary/30 bg-primary-muted text-primary',
  };

  return (
    <AdminToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999999] flex flex-col gap-2 pointer-events-none max-w-sm">
        {toasts.map((t) => {
          const Icon = iconMap[t.type];
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border surface-elevated text-small ${colorMap[t.type]}`}
            >
              <Icon className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
              <span className="text-foreground flex-1">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Fermer"
              >
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
