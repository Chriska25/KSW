import { findAdminNavItem, findAdminNavSection } from '@/lib/admin-nav';

export interface AdminPageMeta {
  title: string;
  description?: string;
  section?: string;
}

const PAGE_META: Record<string, AdminPageMeta> = {
  '/admin/dashboard': {
    title: 'Tableau de bord',
    description: 'Vue synthétique de l\'activité du studio.',
  },
  '/admin/analytics': {
    title: 'Analytics & KPIs',
    description: 'Trafic, conversions et indicateurs clés.',
  },
  '/admin/users': {
    title: 'Utilisateurs',
    description: 'Comptes admin, photographes et assistants.',
  },
  '/admin/prestations': {
    title: 'Prestations',
    description: 'Catalogue des offres et tarifs.',
  },
  '/admin/blog': {
    title: 'Blog & articles',
    description: 'Contenus éditoriaux et SEO.',
  },
  '/admin/crm': {
    title: 'CRM & messages',
    description: 'Contacts, leads et échanges clients.',
  },
  '/admin/clients': {
    title: 'Clients connectés',
    description: 'Présence en ligne et activité récente.',
  },
  '/admin/reservations': {
    title: 'Réservations',
    description: 'Planning et suivi des séances.',
  },
  '/admin/devis-factures': {
    title: 'Devis & factures',
    description: 'Documents commerciaux et paiements.',
  },
  '/admin/galeries': {
    title: 'Galeries photos',
    description: 'Albums privés et livraisons clients.',
  },
  '/admin/videotheque': {
    title: 'Vidéothèque',
    description: 'Films et vidéos du portfolio public.',
  },
  '/admin/invitations': {
    title: 'Invitations électroniques',
    description: 'RSVP, liens publics et listes invités.',
  },
  '/admin/temoignages': {
    title: 'Témoignages',
    description: 'Avis clients publiés sur le site.',
  },
  '/admin/notifications': {
    title: 'Notifications',
    description: 'Centre d\'alertes et activité récente.',
  },
  '/admin/logs': {
    title: 'Journal d\'activité',
    description: 'Historique des actions administrateur.',
  },
  '/admin/faq': {
    title: 'FAQ contact',
    description: 'Questions fréquentes affichées sur le site.',
  },
  '/admin/settings': {
    title: 'Paramètres studio',
    description: 'Configuration globale de la plateforme.',
  },
  '/admin/profile': {
    title: 'Mon compte',
    description: 'Profil et préférences personnelles.',
  },
};

export function getAdminPageMeta(pathname: string): AdminPageMeta {
  if (PAGE_META[pathname]) {
    const base = PAGE_META[pathname];
    const section = findAdminNavSection(pathname);
    return { ...base, section: section?.label };
  }

  const item = findAdminNavItem(pathname);
  const section = findAdminNavSection(pathname);
  if (item) {
    return {
      title: item.label,
      section: section?.label,
    };
  }

  return {
    title: 'Administration',
    section: 'Studio',
  };
}
