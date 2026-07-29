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
} from 'lucide-react';

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
}

export interface AdminQuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  external?: boolean;
}

export const ADMIN_MAIN_NAV: AdminNavItem[] = [
  { href: '/admin/dashboard', label: 'Tableau de Bord', icon: LayoutDashboard },
  { href: '/admin/analytics', label: 'Analytics & KPIs', icon: BarChart3 },
  { href: '/admin/users', label: 'Gestion Utilisateurs', icon: UserCheck },
  { href: '/admin/prestations', label: 'Catalogue Prestations', icon: Camera },
  { href: '/admin/blog', label: 'CMS Blog & Articles', icon: BookOpen },
  { href: '/admin/crm', label: 'CRM & Fiches Clients', icon: Users },
  { href: '/admin/reservations', label: 'Agenda & Réservations', icon: CalendarDays },
  { href: '/admin/devis-factures', label: 'Devis & Factures', icon: FileSpreadsheet },
  { href: '/admin/galeries', label: 'Galeries Photos', icon: ImageIcon },
  { href: '/admin/temoignages', label: 'Témoignages & Avis', icon: Star },
  { href: '/admin/notifications', label: 'Centre Notifications', icon: Bell },
  { href: '/admin/logs', label: 'Journal d\'activité', icon: ScrollText },
  { href: '/admin/faq', label: 'FAQ Contact', icon: HelpCircle },
  { href: '/admin/settings', label: 'Paramètres Studio', icon: Settings },
];

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
  { href: '/admin/settings', label: 'Paramètres studio', icon: Settings },
  { href: '/admin/users', label: 'Gestion utilisateurs', icon: UserCheck },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/', label: 'Voir le site public', icon: Globe, external: true },
  { href: '/client/dashboard', label: 'Espace client', icon: UserCircle },
];
