/** Valide qu'une redirection interne ne pointe pas vers un domaine externe. */
export function safeRedirect(path: string | null | undefined, fallback: string): string {
  if (!path) return fallback;
  const clean = path.trim();
  if (!clean.startsWith('/') || clean.startsWith('//') || clean.includes('://')) {
    return fallback;
  }
  return clean;
}

const STRIPE_HOSTS = new Set(['checkout.stripe.com', 'pay.stripe.com']);

export function isAllowedStripeCheckoutUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && STRIPE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

const SECRET_SETTING_KEYS = ['stripeSecretKey', 'stripeWebhookSecret', 'smtpPassword'] as const;

export function stripSecretsFromSettings<T extends Record<string, unknown>>(settings: T): T {
  const copy = { ...settings };
  for (const key of SECRET_SETTING_KEYS) {
    if (key in copy) {
      (copy as Record<string, unknown>)[key] = '';
    }
  }
  return copy;
}
