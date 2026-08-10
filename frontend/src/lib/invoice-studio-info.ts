import type { SystemSettings } from '@/lib/studio-defaults';

export interface InvoiceStudioInfo {
  studioName?: string;
  studioSubtitle?: string;
  address?: string;
  phone?: string;
  contactEmail?: string;
  currency?: string;
  invoiceLogoUrl?: string;
  showLogoOnInvoice?: boolean;
}

/** Convertit une URL relative (/uploads/…) en URL absolue pour l'aperçu facture. */
export function resolveInvoiceLogoUrl(logoUrl?: string): string | undefined {
  const raw = (logoUrl || '').trim();
  if (!raw) return undefined;
  if (raw.startsWith('data:') || raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  if (typeof window === 'undefined') {
    return raw.startsWith('/') ? raw : `/${raw}`;
  }
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return `${window.location.origin}${path}`;
}

export function buildInvoiceStudioInfo(settings: Partial<SystemSettings>): InvoiceStudioInfo {
  return {
    studioName: settings.studioName,
    studioSubtitle: settings.studioSubtitle,
    address: settings.address,
    phone: settings.phone,
    contactEmail: settings.contactEmail,
    currency: settings.currency,
    invoiceLogoUrl: settings.invoiceLogoUrl,
    showLogoOnInvoice: settings.showLogoOnInvoice,
  };
}
