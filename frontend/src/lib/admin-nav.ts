import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  BarChart3,
  UserCheck,
  Camera,
  BookOpen,
  Users,
  CalendarDays,
  FileSpreadsheet,
  ImageIcon,
  Star,
  Bell,
  Settings,
  Globe,
  Mail,
  UserCircle,
  Plus,
  Download,
  Activity,
  ExternalLink,
  PenLine,
  FolderPlus,
  ScrollText,
  HelpCircle,
  CreditCard,
  MailPlus,
  Clapperboard,
} from 'lucide-react';

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
  keywords?: string;
}

export interface AdminNavSection {
  id: string;
  label: string;
  items: AdminNavItem[];
}

export interface AdminQuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  external?: boolean;
}

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    id: 'overview',
    label: 'Vue d\'ensemble',
    items: [
      { href: '/admin/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, keywords: 'accueil stats' },
      { href: '/admin/analytics', label: 'Analytics & KPIs', icon: BarChart3, keywords: 'statistiques trafic' },
    ],
  },
  {
    id: 'content',
    label: 'Contenu & médias',
    items: [
      { href: '/admin/prestations', label: 'Prestations', icon: Camera, keywords: 'catalogue services tarifs' },
      { href: '/admin/galeries', label: 'Galeries photos', icon: ImageIcon, keywords: 'albums clients' },
      { href: '/admin/videotheque', label: 'Vidéothèque', icon: Clapperboard, keywords: 'video film youtube' },
      { href: '/admin/blog', label: 'Blog & articles', icon: BookOpen, keywords: 'cms contenu' },
      { href: '/admin/temoignages', label: 'Témoignages', icon: Star, keywords: 'avis clients' },
      { href: '/admin/faq', label: 'FAQ contact', icon: HelpCircle, keywords: 'questions reponses' },
    ],
  },
  {
    id: 'clients',
    label: 'Clients & relations',
    items: [
      { href: '/admin/crm', label: 'CRM & messages', icon: Users, keywords: 'contact fiches' },
      { href: '/admin/clients', label: 'Clients connectés', icon: Activity, keywords: 'presence en ligne' },
      { href: '/admin/invitations', label: 'Invitations', icon: MailPlus, keywords: 'rsvp mariage' },
      { href: '/admin/users', label: 'Utilisateurs', icon: UserCheck, keywords: 'comptes admin staff' },
    ],
  },
  {
    id: 'business',
    label: 'Activité',
    items: [
      { href: '/admin/reservations', label: 'Réservations', icon: CalendarDays, keywords: 'planning seances calendrier' },
      { href: '/admin/devis-factures', label: 'Devis & factures', icon: FileSpreadsheet, keywords: 'billing stripe' },
      { href: '/admin/notifications', label: 'Notifications', icon: Bell, keywords: 'alertes centre' },
    ],
  },
  {
    id: 'system',
    label: 'Administration',
    items: [
      { href: '/admin/logs', label: 'Journal d\'activité', icon: ScrollText, keywords: 'audit historique' },
      { href: '/admin/settings', label: 'Paramètres studio', icon: Settings, keywords: 'configuration smtp stripe' },
    ],
  },
];

export const ADMIN_MAIN_NAV: AdminNavItem[] = ADMIN_NAV_SECTIONS.flatMap((section) => section.items);

/** Liens externes ou pages publiques utiles depuis l'admin */
export const ADMIN_SHORTCUT_LINKS: AdminNavItem[] = [
  { href: '/', label: 'Site public', icon: Globe, external: true },
  { href: '/portfolio', label: 'Portfolio', icon: ImageIcon, external: true },
  { href: '/blog', label: 'Blog public', icon: BookOpen, external: true },
  { href: '/contact', label: 'Page contact', icon: Mail, external: true },
  { href: '/reservation', label: 'Tunnel réservation', icon: CalendarDays, external: true },
  { href: '/client/dashboard', label: 'Espace client', icon: UserCircle },
  { href: '/galerie-privee', label: 'Accès galerie par clé', icon: ExternalLink, external: true },
  { href: 'https://dashboard.stripe.com/test/dashboard', label: 'Stripe Dashboard', icon: CreditCard, external: true },
];

/** Actions rapides (topbar + sidebar outils) */
export const ADMIN_QUICK_ACTIONS: AdminQuickAction[] = [
  { id: 'new-booking', label: 'Voir réservations', icon: CalendarDays, href: '/admin/reservations' },
  { id: 'new-blog', label: 'Rédiger un article', icon: PenLine, href: '/admin/blog' },
  { id: 'new-gallery', label: 'Créer une galerie', icon: FolderPlus, href: '/admin/galeries' },
  { id: 'new-service', label: 'Ajouter une prestation', icon: Plus, href: '/admin/prestations' },
  { id: 'crm', label: 'Messages contact', icon: Mail, href: '/admin/crm' },
  { id: 'invoices', label: 'Devis & factures', icon: FileSpreadsheet, href: '/admin/devis-factures' },
  { id: 'backup', label: 'Export backup JSON', icon: Download },
  { id: 'health', label: 'Vérifier l\'API', icon: Activity },
  { id: 'logs', label: 'Journal d\'activité', icon: ScrollText, href: '/admin/logs' },
  { id: 'faq', label: 'Gérer la FAQ', icon: HelpCircle, href: '/admin/faq' },
];

export const ADMIN_USER_MENU: AdminNavItem[] = [
  { href: '/admin/profile', label: 'Mon compte', icon: UserCircle },
  { href: '/admin/settings', label: 'Paramètres studio', icon: Settings },
  { href: '/admin/users', label: 'Gestion utilisateurs', icon: UserCheck },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/', label: 'Voir le site public', icon: Globe, external: true },
  { href: '/client/dashboard', label: 'Espace client', icon: UserCircle },
];

export function findAdminNavItem(pathname: string): AdminNavItem | undefined {
  return ADMIN_MAIN_NAV.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
}

export function findAdminNavSection(pathname: string): AdminNavSection | undefined {
  return ADMIN_NAV_SECTIONS.find((section) =>
    section.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
  );
}
