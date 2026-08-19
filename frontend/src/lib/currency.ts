import { DEFAULT_SETTINGS } from '@/lib/studio-defaults';

export interface ParsedCurrency {
  code: string;
  symbol: string;
  locale: string;
}

/** Devise par défaut — alignée sur les paramètres studio (Admin → Paramètres). */
export const DEFAULT_CURRENCY = DEFAULT_SETTINGS.currency;

export const CURRENCY_OPTIONS = [
  { value: 'EUR (€)', label: 'Euro (EUR)' },
  { value: 'XOF (FCFA)', label: 'Franc CFA (XOF)' },
  { value: 'XAF (FCFA)', label: 'Franc CFA CEMAC (XAF)' },
  { value: 'USD ($)', label: 'Dollar US (USD)' },
  { value: 'GBP (£)', label: 'Livre sterling (GBP)' },
  { value: 'CHF (CHF)', label: 'Franc suisse (CHF)' },
  { value: 'CAD (C$)', label: 'Dollar canadien (CAD)' },
  { value: 'MAD (MAD)', label: 'Dirham marocain (MAD)' },
] as const;

/** Retourne la devise paramétrée ou la valeur par défaut du studio. */
export function resolveStudioCurrency(currencyStr?: string | null): string {
  const raw = (currencyStr ?? '').trim();
  return raw || DEFAULT_CURRENCY;
}

/** Parse"EUR (€)","XOF (FCFA)","USD" depuis les paramètres studio. */
export function parseCurrencySetting(currencyStr?: string): ParsedCurrency {
  const raw = resolveStudioCurrency(currencyStr);
  const parenMatch = raw.match(/^([A-Za-z]{3})\s*\((.+)\)$/);
  if (parenMatch) {
    return {
      code: parenMatch[1].toUpperCase(),
      symbol: parenMatch[2].trim(),
      locale: 'fr-FR',
    };
  }
  if (/^[A-Za-z]{3}$/.test(raw)) {
    return { code: raw.toUpperCase(), symbol: raw.toUpperCase(), locale: 'fr-FR' };
  }
  return { code: 'EUR', symbol: raw || '€', locale: 'fr-FR' };
}

export function formatMoneyAmount(amount: unknown, currencyStr?: string): string {
  const value = Number(amount);
  const safeAmount = Number.isFinite(value) ? value : 0;
  const { code, symbol, locale } = parseCurrencySetting(currencyStr);

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: code === 'XOF' || code === 'JPY' ? 0 : 2,
      maximumFractionDigits: code === 'XOF' || code === 'JPY' ? 0 : 2,
    }).format(safeAmount);
  } catch {
    return `${safeAmount.toLocaleString(locale)} ${symbol}`.trim();
  }
}
