'use client';

import {
  Banknote,
  Check,
  CreditCard,
  Landmark,
  Smartphone,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export type PaymentMethodChoice = 'stripe' | 'mobile_money' | 'paypal' | 'virement' | 'cash';

export interface PaymentOption {
  id: PaymentMethodChoice;
  label: string;
  description: string;
}

const ICONS: Record<PaymentMethodChoice, LucideIcon> = {
  stripe: CreditCard,
  mobile_money: Smartphone,
  paypal: Wallet,
  virement: Landmark,
  cash: Banknote,
};

interface PaymentMethodListProps {
  options: PaymentOption[];
  value: PaymentMethodChoice;
  onChange: (id: PaymentMethodChoice) => void;
  depositLabel: string;
}

export function PaymentMethodList({ options, value, onChange, depositLabel }: PaymentMethodListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/20 bg-gradient-to-r from-amber-400/10 via-amber-400/5 to-transparent px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-400/90">
            Acompte à régler
          </p>
          <p className="text-lg font-extrabold text-white mt-0.5">{depositLabel}</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center shrink-0">
          <CreditCard className="h-5 w-5 text-amber-400" />
        </div>
      </div>

      <div className="space-y-2" role="radiogroup" aria-label="Mode de paiement">
        {options.map((option) => {
          const selected = value === option.id;
          const Icon = ICONS[option.id];

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.id)}
              className={`group w-full flex items-center gap-3 sm:gap-4 rounded-xl border px-3.5 py-3.5 sm:px-4 sm:py-4 text-left transition-all duration-200 ${
                selected
                  ? 'border-amber-400/50 bg-gradient-to-r from-amber-400/12 to-amber-400/5 shadow-[0_0_24px_-8px_rgba(251,191,36,0.45)]'
                  : 'border-zinc-800/90 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/50'
              }`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 ${
                  selected
                    ? 'border-amber-400/40 bg-amber-400/15 text-amber-400'
                    : 'border-zinc-800 bg-zinc-900/80 text-zinc-400 group-hover:border-zinc-700 group-hover:text-zinc-300'
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${selected ? 'text-white' : 'text-zinc-200'}`}>
                    {option.label}
                  </span>
                  {option.id === 'stripe' && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                      Sécurisé
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{option.description}</p>
              </div>

              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                  selected
                    ? 'border-amber-400 bg-amber-400 text-zinc-950'
                    : 'border-zinc-700 bg-transparent group-hover:border-zinc-600'
                }`}
              >
                {selected && <Check className="h-3 w-3" strokeWidth={3} />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
