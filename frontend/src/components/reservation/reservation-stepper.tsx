'use client';

import { Check } from 'lucide-react';

const STEPS = [
  { step: 1, label: 'Formule' },
  { step: 2, label: 'Date & Heure' },
  { step: 3, label: 'Coordonnées' },
  { step: 4, label: 'Acompte' },
] as const;

interface ReservationStepperProps {
  currentStep: number;
}

export function ReservationStepper({ currentStep }: ReservationStepperProps) {
  return (
    <div className="glass-panel rounded-2xl border border-zinc-800/80 px-4 py-5 sm:px-6">
      <div className="flex items-center justify-between gap-1">
        {STEPS.map((item, index) => {
          const done = currentStep > item.step;
          const active = currentStep === item.step;
          const upcoming = currentStep < item.step;

          return (
            <div key={item.step} className="flex flex-1 items-center min-w-0 last:flex-none">
              <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
                <div
                  className={`relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                    done
                      ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40'
                      : active
                        ? 'bg-amber-400 text-zinc-950 ring-4 ring-amber-400/25 shadow-lg shadow-amber-500/20 scale-110'
                        : 'bg-zinc-900 text-zinc-500 ring-1 ring-zinc-800'
                  }`}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={3} /> : item.step}
                </div>
                <span
                  className={`hidden sm:block text-[10px] font-semibold uppercase tracking-wider text-center truncate w-full px-0.5 ${
                    active ? 'text-amber-400' : done ? 'text-zinc-300' : upcoming ? 'text-zinc-600' : 'text-zinc-400'
                  }`}
                >
                  {item.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-1 sm:mx-2 rounded-full transition-colors duration-500 ${
                    currentStep > item.step ? 'bg-gradient-to-r from-emerald-500/60 to-amber-400/60' : 'bg-zinc-800'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="sm:hidden text-center text-[11px] text-zinc-500 mt-3 font-medium">
        Étape {currentStep} sur {STEPS.length} — {STEPS[currentStep - 1]?.label}
      </p>
    </div>
  );
}
