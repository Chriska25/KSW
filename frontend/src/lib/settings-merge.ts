import { DEFAULT_SETTINGS, type SystemSettings } from '@/lib/studio-defaults';
import { resolveStudioCurrency } from '@/lib/currency';
import { mergeSocialLinks } from '@/lib/social-links';
import { SECRET_SETTING_KEYS, stripSecretsFromSettings } from '@/lib/safe-redirect';

/** Fusionne les paramètres API avec les défauts (source unique client + SSR). */
export function mergeSettingsFromApi(
  incoming: Partial<SystemSettings> | null | undefined,
  base: SystemSettings = DEFAULT_SETTINGS
): SystemSettings {
  if (!incoming || Object.keys(incoming).length === 0) {
    return { ...base, socialLinks: mergeSocialLinks(base) };
  }

  const merged = stripSecretsFromSettings({
    ...DEFAULT_SETTINGS,
    ...base,
    ...incoming,
    currency: resolveStudioCurrency(incoming.currency ?? base.currency),
  } as Record<string, unknown>) as unknown as SystemSettings;
  merged.socialLinks = mergeSocialLinks(merged);
  return merged;
}

/** Retire les secrets vides avant POST pour ne pas écraser les valeurs en BDD. */
export function prepareSettingsPayloadForSave(settings: SystemSettings): SystemSettings {
  const payload = { ...settings } as Record<string, unknown>;
  for (const key of SECRET_SETTING_KEYS) {
    const value = payload[key];
    if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
      delete payload[key];
    }
  }
  return payload as unknown as SystemSettings;
}
