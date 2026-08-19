'use client';

import { Check } from 'lucide-react';

const STEPS = [
  { step: 1, label: 'Événement' },
  { step: 2, label: 'Visuels' },
  { step: 3, label: 'Détails & options' },
  { step: 4, label: 'Validation' },
] as const;

interface InvitationSubscribeStepperProps {
  currentStep: number;
}

export function InvitationSubscribeStepper({ currentStep }: InvitationSubscribeStepperProps) {
  return (
    <div className="rounded-2xl border border-border/80 px-4 py-5 sm:px-6">
      <div className="flex items-center justify-between gap-1">
        {STEPS.map((item, index) => {
          const done = currentStep > item.step;
          const active = currentStep === item.step;

          return (
            <div key={item.step} className="flex flex-1 items-center min-w-0 last:flex-none">
              <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
                <div
                  className={`relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                    done
                      ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40'
                      : active
                        ? 'bg-amber-400 text-zinc-950 ring-4 ring-amber-400/25 shadow-lg  scale-110'
                        : 'bg-surface-muted text-muted-foreground ring-1 ring-zinc-800'
                  }`}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={3} /> : item.step}
                </div>
                <span
                  className={`hidden sm:block text-[10px] font-semibold uppercase tracking-wider text-center truncate w-full px-0.5 ${
                    active ? 'text-primary' : done ? 'text-foreground' : 'text-zinc-600'
                  }`}
                >
                  {item.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-1 sm:mx-2 rounded-full transition-colors duration-500 ${
                    currentStep > item.step ? 'bg-gradient-to-r from-emerald-500/60 to-amber-400/60' : 'bg-surface-muted'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="sm:hidden text-center text-[11px] text-muted-foreground mt-3 font-medium">
        Étape {currentStep} sur {STEPS.length} — {STEPS[currentStep - 1]?.label}
      </p>
    </div>
  );
}
