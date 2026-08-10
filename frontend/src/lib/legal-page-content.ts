import type { SystemSettings } from '@/lib/studio-defaults';

export interface LegalSectionContent {
  id: string;
  title: string;
  body: string;
}

export interface LegalPageContentConfig {
  badge: string;
  title: string;
  subtitle: string;
  updatedAt: string;
  sections: LegalSectionContent[];
}

export interface LegalPagesContent {
  legal: LegalPageContentConfig;
  privacy: LegalPageContentConfig;
}

export const LEGAL_CONTENT_PLACEHOLDERS_HELP =
  'Variables disponibles : {{studioName}}, {{contactEmail}}, {{address}}, {{phone}}, {{siteUrl}} — une ligne commençant par « - » crée une puce.';

const DEFAULT_LEGAL_SECTIONS: LegalSectionContent[] = [
  {
    id: 'editor',
    title: '1. Éditeur du site',
    body: `Le site {{siteUrl}} est édité par :

- {{studioName}} — studio de photographie professionnelle
- Siège : {{address}}
- Téléphone : {{phone}}
- E-mail : {{contactEmail}}
- Forme juridique : Entrepreneur individuel / SAS (à compléter selon votre statut)
- SIRET : [à compléter]
- N° TVA intracommunautaire : [à compléter le cas échéant]`,
  },
  {
    id: 'director',
    title: '2. Directeur de la publication',
    body: `Le directeur de la publication est le représentant légal de {{studioName}}. Pour toute question relative au contenu éditorial, contactez {{contactEmail}}.`,
  },
  {
    id: 'hosting',
    title: '3. Hébergement',
    body: `- Hébergeur frontend : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — vercel.com
- Hébergement des données & API : serveur privé / cloud (infrastructure Docker) — localisation Union européenne lorsque applicable.`,
  },
  {
    id: 'ip',
    title: '4. Propriété intellectuelle',
    body: `L'ensemble des éléments composant le site (textes, photographies, graphismes, logo, icônes, vidéos, architecture, code source) est la propriété exclusive de {{studioName}} ou de ses partenaires, sauf mention contraire.

Toute reproduction, représentation, modification ou exploitation, totale ou partielle, sans autorisation écrite préalable, est strictement interdite et constitue une contrefaçon sanctionnée par le Code de la propriété intellectuelle.

Les photographies présentées dans le portfolio et les galeries privées sont protégées par le droit d'auteur. Leur utilisation est régie par le contrat de prestation signé avec chaque client.`,
  },
  {
    id: 'liability',
    title: '5. Responsabilité',
    body: `{{studioName}} s'efforce d'assurer l'exactitude des informations diffusées sur ce site. Toutefois, le studio ne saurait garantir l'absence d'erreurs ou d'omissions, ni être tenu responsable des dommages directs ou indirects résultant de l'accès ou de l'utilisation du site.

Les liens hypertextes vers des sites tiers n'engagent pas la responsabilité de {{studioName}} quant à leur contenu.`,
  },
  {
    id: 'privacy-link',
    title: '6. Données personnelles',
    body: `Le traitement des données personnelles collectées via ce site (réservation, contact, espace client, galeries privées) est décrit dans notre Politique de confidentialité (/privacy), conforme au Règlement Général sur la Protection des Données (RGPD).`,
  },
  {
    id: 'cookies',
    title: '7. Cookies',
    body: `Le site peut utiliser des cookies techniques nécessaires à son fonctionnement (session, préférences d'affichage, sécurité). Aucun cookie publicitaire tiers n'est déposé sans votre consentement. Vous pouvez configurer votre navigateur pour refuser les cookies non essentiels.`,
  },
  {
    id: 'law',
    title: '8. Droit applicable',
    body: `Les présentes mentions légales sont régies par le droit français. En cas de litige, et à défaut de résolution amiable, les tribunaux compétents de Paris seront seuls compétents, sous réserve des dispositions légales impératives applicables aux consommateurs.`,
  },
];

const DEFAULT_PRIVACY_SECTIONS: LegalSectionContent[] = [
  {
    id: 'controller',
    title: '1. Responsable du traitement',
    body: `- {{studioName}}
- {{address}}
- E-mail : {{contactEmail}}
- Téléphone : {{phone}}`,
  },
  {
    id: 'data',
    title: '2. Données que nous collectons',
    body: `Selon votre utilisation du site, nous pouvons traiter :

- Identité & contact : nom, prénom, adresse e-mail, numéro de téléphone, adresse postale
- Réservation : date et heure de séance, type de prestation, lieu, notes, référence de réservation
- Paiement : statut de l'acompte, références de transaction (Stripe, Mobile Money, virement) — les données bancaires complètes ne sont jamais stockées sur nos serveurs
- Espace client & galeries : identifiants de connexion, clés d'accès galerie, favoris photos, historique de réservations
- Communication : messages envoyés via le formulaire de contact ou par e-mail
- Navigation : pages visitées, adresse IP anonymisée, type de navigateur (statistiques d'audience)`,
  },
  {
    id: 'purposes',
    title: '3. Finalités du traitement',
    body: `- Gestion des demandes de contact et de devis
- Prise de rendez-vous et suivi des réservations de séances photo
- Facturation, encaissement des acomptes et gestion comptable
- Création et accès aux galeries privées de livraison photos
- Envoi de notifications liées à votre commande (confirmation, galerie prête, etc.)
- Amélioration du site et mesure d'audience
- Respect de nos obligations légales et contractuelles`,
  },
  {
    id: 'legal-basis',
    title: '4. Base légale',
    body: `- Exécution du contrat : réservation, prestation photographique, livraison des images
- Consentement : newsletter, témoignages, cookies non essentiels le cas échéant
- Intérêt légitime : sécurité du site, statistiques anonymisées, prévention de la fraude
- Obligation légale : conservation comptable et fiscale`,
  },
  {
    id: 'retention',
    title: '5. Durée de conservation',
    body: `- Données de réservation et facturation : 10 ans (obligations comptables)
- Compte client actif : durée de la relation commerciale + 3 ans
- Galeries privées : durée indiquée à la création ou jusqu'à suppression par le client
- Messages de contact : 3 ans à compter du dernier échange
- Logs techniques : 12 mois maximum`,
  },
  {
    id: 'recipients',
    title: '6. Destinataires des données',
    body: `Vos données peuvent être transmises, dans la stricte limite de leurs missions, à :

- Stripe — traitement sécurisé des paiements par carte
- Prestataires d'hébergement (Vercel, serveur API) — stockage technique
- Services e-mail — envoi de confirmations et notifications

Nous ne vendons ni ne louons vos données personnelles à des tiers à des fins commerciales.`,
  },
  {
    id: 'rights',
    title: '7. Vos droits (RGPD)',
    body: `Conformément au RGPD, vous disposez des droits suivants :

- Droit d'accès et de rectification de vos données
- Droit à l'effacement (« droit à l'oubli ») dans les limites légales
- Droit à la limitation du traitement
- Droit d'opposition pour motifs légitimes
- Droit à la portabilité de vos données
- Droit de retirer votre consentement à tout moment

Pour exercer vos droits, contactez-nous à {{contactEmail}} en précisant votre demande et une copie d'un justificatif d'identité si nécessaire. Nous répondons sous 30 jours.

Vous pouvez également introduire une réclamation auprès de la CNIL (https://www.cnil.fr).`,
  },
  {
    id: 'security',
    title: '8. Sécurité',
    body: `{{studioName}} met en œuvre des mesures techniques et organisationnelles appropriées : connexion HTTPS, authentification sécurisée, accès restreint aux galeries privées par clé, sauvegardes régulières et hébergement sur infrastructure sécurisée. Aucune transmission sur Internet n'est toutefois totalement inviolable.`,
  },
  {
    id: 'cookies-privacy',
    title: '9. Cookies',
    body: `Le site utilise principalement :

- Cookies de session et d'authentification (espace client / admin)
- Cookie de préférences d'affichage (thème clair/sombre)
- Traceurs de mesure d'audience anonymisés

Vous pouvez refuser ou supprimer les cookies via les paramètres de votre navigateur. Le refus des cookies essentiels peut limiter certaines fonctionnalités (connexion, galerie privée).`,
  },
  {
    id: 'updates',
    title: '10. Modifications',
    body: `Cette politique peut être mise à jour pour refléter l'évolution de nos services ou de la réglementation. La date de dernière mise à jour est indiquée en haut de page. Nous vous invitons à la consulter régulièrement. Pour toute question : formulaire de contact (/contact).`,
  },
];

export const DEFAULT_LEGAL_PAGES_CONTENT: LegalPagesContent = {
  legal: {
    badge: 'Informations légales',
    title: 'Mentions légales',
    subtitle:
      "Conformément aux dispositions des articles 6-III et 19 de la Loi n° 2004-575 du 21 juin 2004 pour la Confiance dans l'économie numérique (LCEN), les présentes mentions légales s'appliquent au site {{siteUrl}}.",
    updatedAt: '5 août 2026',
    sections: DEFAULT_LEGAL_SECTIONS,
  },
  privacy: {
    badge: 'Protection des données',
    title: 'Politique de confidentialité',
    subtitle:
      '{{studioName}} accorde une importance particulière à la protection de vos données personnelles. Cette politique explique quelles informations nous collectons, pourquoi, et quels sont vos droits conformément au Règlement (UE) 2016/679 (RGPD).',
    updatedAt: '5 août 2026',
    sections: DEFAULT_PRIVACY_SECTIONS,
  },
};

export interface LegalTemplateVars {
  studioName: string;
  contactEmail: string;
  address: string;
  phone: string;
  siteUrl: string;
}

export function buildLegalTemplateVars(
  settings: Pick<SystemSettings, 'contactEmail' | 'address' | 'phone' | 'studioName' | 'studioNameFirstPart' | 'studioNameSecondPart'>,
  studioName: string
): LegalTemplateVars {
  return {
    studioName: studioName || settings.studioName || 'KSW STUDIO',
    contactEmail: settings.contactEmail || 'contact@kswstudio.fr',
    address: settings.address || '',
    phone: settings.phone || '',
    siteUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://kswstudio.fr',
  };
}

export function applyLegalTemplate(text: string, vars: LegalTemplateVars): string {
  return text
    .replaceAll('{{studioName}}', vars.studioName)
    .replaceAll('{{contactEmail}}', vars.contactEmail)
    .replaceAll('{{address}}', vars.address)
    .replaceAll('{{phone}}', vars.phone)
    .replaceAll('{{siteUrl}}', vars.siteUrl);
}

function mergeSections(
  defaults: LegalSectionContent[],
  overrides?: LegalSectionContent[]
): LegalSectionContent[] {
  if (!Array.isArray(overrides) || overrides.length === 0) return defaults;
  return overrides.map((section, index) => ({
    id: section.id || defaults[index]?.id || `section-${index}`,
    title: section.title ?? defaults[index]?.title ?? '',
    body: section.body ?? defaults[index]?.body ?? '',
  }));
}

function mergePageConfig(
  defaults: LegalPageContentConfig,
  override?: Partial<LegalPageContentConfig>
): LegalPageContentConfig {
  if (!override) return defaults;
  return {
    badge: override.badge ?? defaults.badge,
    title: override.title ?? defaults.title,
    subtitle: override.subtitle ?? defaults.subtitle,
    updatedAt: override.updatedAt ?? defaults.updatedAt,
    sections: mergeSections(defaults.sections, override.sections),
  };
}

export function getLegalPagesContent(settings: Pick<SystemSettings, 'legalPagesContent'>): LegalPagesContent {
  const raw = settings.legalPagesContent;
  if (!raw || typeof raw !== 'object') return DEFAULT_LEGAL_PAGES_CONTENT;
  return {
    legal: mergePageConfig(DEFAULT_LEGAL_PAGES_CONTENT.legal, raw.legal),
    privacy: mergePageConfig(DEFAULT_LEGAL_PAGES_CONTENT.privacy, raw.privacy),
  };
}

export function getLegalPageContent(
  settings: Pick<SystemSettings, 'legalPagesContent'>,
  page: 'legal' | 'privacy'
): LegalPageContentConfig {
  return getLegalPagesContent(settings)[page];
}
