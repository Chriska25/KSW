'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="surface rounded-lg px-4 py-5 sm:px-6">
      <div className="flex items-center justify-between gap-1">
        {STEPS.map((item, index) => {
          const done = currentStep > item.step;
          const active = currentStep === item.step;

          return (
            <div key={item.step} className="flex flex-1 items-center min-w-0 last:flex-none">
              <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
                <div
                  className={cn(
                    'flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-150',
                    done && 'bg-success-muted text-success ring-1 ring-success/30',
                    active && 'bg-primary text-primary-foreground ring-2 ring-primary/25',
                    !done && !active && 'bg-surface-muted text-muted-foreground ring-1 ring-border'
                  )}
                  aria-current={active ? 'step' : undefined}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden /> : item.step}
                </div>
                <span
                  className={cn(
                    'hidden sm:block text-caption font-medium uppercase tracking-wider text-center truncate w-full px-0.5',
                    active && 'text-primary',
                    done && !active && 'text-foreground',
                    !done && !active && 'text-muted-foreground'
                  )}
                >
                  {item.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-px flex-1 mx-1 sm:mx-2 transition-colors',
                    currentStep > item.step ? 'bg-primary/40' : 'bg-border'
                  )}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="sm:hidden text-caption text-center mt-3">
        Étape {currentStep} sur {STEPS.length} — {STEPS[currentStep - 1]?.label}
      </p>
    </div>
  );
}
