'use client';

import { CalendarDays, Clock, Sparkles } from 'lucide-react';

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
    <div
      className={`rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/80 to-zinc-950/90 overflow-hidden ${className}`}
    >
      <div className="px-4 py-3 border-b border-zinc-800/80 bg-amber-400/5 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-400" />
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-400/90">
          Récapitulatif
        </span>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Prestation</p>
          <p className="text-sm font-bold text-white leading-snug">{serviceTitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-3">
            <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wider">Date</span>
            </div>
            <p className="text-xs font-semibold text-zinc-200">{date}</p>
          </div>
          <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-3">
            <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wider">Heure</span>
            </div>
            <p className="text-xs font-semibold text-zinc-200">{time}</p>
          </div>
        </div>

        <div className="space-y-2 pt-1 border-t border-zinc-800/80">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Total TTC</span>
            <span className="font-semibold text-zinc-200">{totalPrice}</span>
          </div>
          <div className="flex justify-between items-center rounded-xl bg-amber-400/10 border border-amber-400/20 px-3 py-2.5">
            <span className="text-xs font-bold text-amber-400">Acompte ({depositRate}%)</span>
            <span className="text-sm font-extrabold text-amber-400">{deposit}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
