'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
}

const sizeClasses = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function AdminModal({ open, onClose, title, children, size = 'lg', footer }: AdminModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999998] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80"
      onClick={onClose}
      role="presentation"
    >
      <Card
        className={`surface-elevated w-full ${sizeClasses[size]} max-h-[92dvh] sm:max-h-[92vh] flex flex-col rounded-t-lg sm:rounded-lg`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
      >
        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3 shrink-0">
          <CardTitle id="admin-modal-title" className="text-h2">{title}</CardTitle>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </CardHeader>
        <CardContent className="overflow-y-auto flex-1 py-5">{children}</CardContent>
        {footer && (
          <div className="px-4 sm:px-6 py-4 border-t border-border shrink-0 flex flex-wrap justify-end gap-2 sm:gap-3">
            {footer}
          </div>
        )}
      </Card>
    </div>
  );
}
