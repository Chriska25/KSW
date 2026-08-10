import type { HomePageContent } from '@/lib/home-page-content';
import { DEFAULT_HOME_PAGE_CONTENT } from '@/lib/home-page-content';
import type { PortfolioPageContent } from '@/lib/portfolio-content';
import { DEFAULT_PORTFOLIO_CONTENT } from '@/lib/portfolio-content';
import type { PrestationsPageContent } from '@/lib/prestations-content';
import { DEFAULT_PRESTATIONS_CONTENT } from '@/lib/prestations-content';
import type { LegalPagesContent } from '@/lib/legal-page-content';
import { DEFAULT_LEGAL_PAGES_CONTENT } from '@/lib/legal-page-content';
import type { SocialLinksSettings } from '@/lib/social-links';
import { DEFAULT_SOCIAL_LINKS } from '@/lib/social-links';

export type { HomePageContent, PortfolioPageContent, PrestationsPageContent };

export interface SystemSettings {
  studioNameFirstPart: string;
  studioNameSecondPart: string;
  studioSubtitle: string;
  contactEmail: string;
  phone: string;
  address: string;
  /** Latitude affichée sur la carte Contact (sélection admin). */
  studioMapLat: number;
  /** Longitude affichée sur la carte Contact (sélection admin). */
  studioMapLng: number;
  /** Niveau de zoom de la carte Contact (10–20). */
  studioMapZoom: number;
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
  mobileMoneyEnabled: boolean;
  mobileMoneyProvider: string;
  mobileMoneyNumber: string;
  mobileMoneyInstructions: string;
  watermarkText: string;
  watermarkPosition: string;
  watermarkOpacity: number;
  /** Afficher le filigrane texte (combinable avec le logo). */
  watermarkShowText: boolean;
  /** Activer un logo en filigrane sur les photos web. */
  watermarkLogoEnabled: boolean;
  /** URL du logo filigrane (/uploads/… ou URL externe). Vide = logo facture. */
  watermarkLogoUrl?: string;
  watermarkLogoPosition: string;
  /** Taille du logo en % de la largeur de l'image (5–50). */
  watermarkLogoSize: number;
  watermarkLogoOpacity: number;
  webpQuality: number;
  force2FAForAdmin: boolean;
  sessionLifetimeHours: number;
  smtpEnabled?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  /** Indique si un mot de passe SMTP est déjà stocké côté serveur (valeur jamais renvoyée). */
  smtpPasswordConfigured?: boolean;
  smtpFrom?: string;
  /** Envoi Gmail via API HTTPS (contournement ports SMTP bloqués). */
  gmailUseApi?: boolean;
  siteTitle?: string;
  studioName?: string;
  studioDescription?: string;
  homePageContent?: HomePageContent;
  /** Textes, vidéothèque et bannière de la page /portfolio. */
  portfolioContent?: PortfolioPageContent;
  /** Textes et bannière de la page /prestations. */
  prestationsContent?: PrestationsPageContent;
  /** Textes des pages Mentions légales & Confidentialité. */
  legalPagesContent?: LegalPagesContent;
  /** URL du logo affiché sur les factures (/uploads/… ou URL externe). */
  invoiceLogoUrl?: string;
  /** Afficher le logo sur les factures imprimables (défaut : oui si un logo est défini). */
  showLogoOnInvoice?: boolean;
  /** Liens réseaux sociaux affichés dans le footer. */
  socialLinks?: SocialLinksSettings;
}

export const STUDIO_GMAIL_ADDRESS = 'magickasai@gmail.com';

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
  studioMapLat: 48.868285,
  studioMapLng: 2.317581,
  studioMapZoom: 16,
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
  mobileMoneyEnabled: true,
  mobileMoneyProvider: 'Orange Money',
  mobileMoneyNumber: '+225 07 00 00 00 00',
  mobileMoneyInstructions:
    'Effectuez le transfert puis indiquez votre numéro et la référence de transaction ci-dessous. Mentionnez la référence de réservation dans le motif.',
  watermarkText: 'Épreuve sécurisée',
  watermarkPosition: 'bottom_center',
  watermarkOpacity: 40,
  watermarkShowText: true,
  watermarkLogoEnabled: false,
  watermarkLogoUrl: '',
  watermarkLogoPosition: 'bottom_right',
  watermarkLogoSize: 18,
  watermarkLogoOpacity: 40,
  webpQuality: 85,
  force2FAForAdmin: true,
  sessionLifetimeHours: 8,
  smtpEnabled: false,
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPassword: '',
  smtpFrom: '',
  gmailUseApi: true,
  homePageContent: DEFAULT_HOME_PAGE_CONTENT,
  portfolioContent: DEFAULT_PORTFOLIO_CONTENT,
  prestationsContent: DEFAULT_PRESTATIONS_CONTENT,
  legalPagesContent: DEFAULT_LEGAL_PAGES_CONTENT,
  invoiceLogoUrl: '',
  showLogoOnInvoice: true,
  socialLinks: { ...DEFAULT_SOCIAL_LINKS },
};
