'use client';

import React from 'react';

interface AdminMobileListCardProps {
  children: React.ReactNode;
  className?: string;
}

export function AdminMobileListCard({ children, className = '' }: AdminMobileListCardProps) {
  return (
    <article
      className={`rounded-xl border border-border bg-surface p-4 space-y-3 shadow-sm ${className}`}
    >
      {children}
    </article>
  );
}

interface AdminMobileListCardRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export function AdminMobileListCardRow({ label, value, className = '' }: AdminMobileListCardRowProps) {
  return (
    <div className={`flex items-start justify-between gap-3 text-xs ${className}`}>
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground text-right min-w-0 font-medium">{value}</span>
    </div>
  );
}

export function AdminMobileListCardActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2 pt-3 border-t border-border">{children}</div>
  );
}
