'use client';

import { CalendarDays, Clock } from 'lucide-react';

interface BookingSummaryCardProps {
  serviceTitle: string;
  date: string;
  time: string;
  totalPrice: string;
  deposit: string;
  depositRate: number;
  className?: string;
}

export function BookingSummaryCard({
  serviceTitle,
  date,
  time,
  totalPrice,
  deposit,
  depositRate,
  className = '',
}: BookingSummaryCardProps) {
  return (
    <div className={`surface rounded-lg overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-border bg-surface-muted">
        <span className="text-caption font-semibold uppercase tracking-wider text-primary">
          Récapitulatif
        </span>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <p className="text-caption mb-1">Prestation</p>
          <p className="text-sm font-medium text-foreground leading-snug">{serviceTitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-surface-muted border border-border p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              <span className="text-caption uppercase tracking-wider">Date</span>
            </div>
            <p className="text-xs font-medium text-foreground">{date}</p>
          </div>
          <div className="rounded-lg bg-surface-muted border border-border p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              <span className="text-caption uppercase tracking-wider">Heure</span>
            </div>
            <p className="text-xs font-medium text-foreground">{time}</p>
          </div>
        </div>

        <div className="space-y-2 pt-1 border-t border-border">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Total TTC</span>
            <span className="font-medium text-foreground tabular-nums">{totalPrice}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Acompte ({depositRate}%)</span>
            <span className="font-medium text-primary tabular-nums">{deposit}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
