export interface SystemSettings {
  studioNameFirstPart: string;
  studioNameSecondPart: string;
  studioSubtitle: string;
  contactEmail: string;
  phone: string;
  address: string;
  currency: string;
  timezone: string;
  depositRate: number;
  cancellationNoticeDays: number;
  autoApproveBookings: boolean;
  stripeTestMode: boolean;
  stripePublicKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  payPalEnabled: boolean;
  watermarkText: string;
  watermarkPosition: string;
  watermarkOpacity: number;
  webpQuality: number;
  force2FAForAdmin: boolean;
  sessionLifetimeHours: number;
  smtpEnabled?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFrom?: string;
  siteTitle?: string;
  studioName?: string;
  studioDescription?: string;
}

export const DEFAULT_SETTINGS: SystemSettings = {
  studioNameFirstPart: 'KSW',
  studioNameSecondPart: 'STUDIO',
  studioSubtitle: 'HAUTE PHOTOGRAPHIE & PRODUCTION',
  studioName: 'KSW STUDIO',
  siteTitle: 'KSW STUDIO - Photographie d\'Art & Studio Photo d\'Exception',
  studioDescription:
    "Studio photographique d'art spécialisé dans le mariage d'exception, le portrait de caractère et le reportage corporate haut de gamme en France et à l'international.",
  contactEmail: 'contact@kswstudio.fr',
  phone: '+33 1 42 68 00 00',
  address: '12 Rue du Faubourg Saint-Honoré, 75008 Paris',
  currency: 'EUR (€)',
  timezone: 'Europe/Paris',
  depositRate: 30,
  cancellationNoticeDays: 7,
  autoApproveBookings: false,
  stripeTestMode: true,
  stripePublicKey: 'pk_test_51Mz...LumiereKey',
  stripeSecretKey: 'sk_test_51Mz...SecretKeySample',
  stripeWebhookSecret: 'whsec_...SampleSecret',
  payPalEnabled: true,
  watermarkText: 'Épreuve sécurisée',
  watermarkPosition: 'bottom_center',
  watermarkOpacity: 40,
  webpQuality: 85,
  force2FAForAdmin: true,
  sessionLifetimeHours: 8,
  smtpEnabled: false,
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPassword: '',
  smtpFrom: '',
};
