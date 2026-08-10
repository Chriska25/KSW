import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  FolderHeart,
  KeyRound,
  Bell,
  CalendarDays,
  FileSpreadsheet,
  User,
  MailPlus,
  Globe,
  ImageIcon,
  ExternalLink,
} from 'lucide-react';

export interface ClientNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  matchPrefix?: boolean;
  external?: boolean;
  keywords?: string;
  /** Injecté dynamiquement par le shell (ex. compteur notifications) */
  badgeKey?: 'notifications';
}

export interface ClientNavSection {
  id: string;
  label: string;
  items: ClientNavItem[];
}

export const CLIENT_NAV_SECTIONS: ClientNavSection[] = [
  {
    id: 'space',
    label: 'Mon espace',
    items: [
      { href: '/client/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, keywords: 'accueil home' },
      { href: '/client/reservations', label: 'Réservations', icon: CalendarDays, keywords: 'seances planning' },
      {
        href: '/client/notifications',
        label: 'Notifications',
        icon: Bell,
        badgeKey: 'notifications',
        keywords: 'alertes messages',
      },
    ],
  },
  {
    id: 'media',
    label: 'Médias & documents',
    items: [
      {
        href: '/client/galeries',
        label: 'Mes galeries',
        icon: FolderHeart,
        matchPrefix: true,
        keywords: 'photos albums prives',
      },
      { href: '/client/documents', label: 'Factures', icon: FileSpreadsheet, keywords: 'devis pdf facture' },
      {
        href: '/client/invitations',
        label: 'Invitations',
        icon: MailPlus,
        matchPrefix: true,
        keywords: 'rsvp mariage electronique',
      },
    ],
  },
  {
    id: 'account',
    label: 'Compte & accès',
    items: [
      { href: '/galerie-privee', label: 'Accès par clé', icon: KeyRound, keywords: 'code galerie privee' },
      { href: '/client/profile', label: 'Mon profil', icon: User, keywords: 'compte mot de passe avatar' },
    ],
  },
];

export const CLIENT_MAIN_NAV: ClientNavItem[] = CLIENT_NAV_SECTIONS.flatMap((section) => section.items);

export const CLIENT_SHORTCUT_LINKS: ClientNavItem[] = [
  { href: '/', label: 'Site public', icon: Globe, external: true },
  { href: '/portfolio', label: 'Portfolio', icon: ImageIcon, external: true },
  { href: '/reservation', label: 'Réserver une séance', icon: CalendarDays, external: true },
];

export const CLIENT_USER_MENU: ClientNavItem[] = [
  { href: '/client/profile', label: 'Mon profil', icon: User },
  { href: '/galerie-privee', label: 'Accès galerie par clé', icon: KeyRound },
];

export function isClientNavItemActive(pathname: string, item: ClientNavItem): boolean {
  if (item.matchPrefix) {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  return pathname === item.href;
}

export function findClientNavItem(pathname: string): ClientNavItem | undefined {
  return CLIENT_MAIN_NAV.find((item) => isClientNavItemActive(pathname, item));
}

export function findClientNavSection(pathname: string): ClientNavSection | undefined {
  return CLIENT_NAV_SECTIONS.find((section) =>
    section.items.some((item) => isClientNavItemActive(pathname, item))
  );
}
