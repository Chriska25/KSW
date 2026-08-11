import { findClientNavItem, findClientNavSection } from '@/lib/client-nav';

export interface ClientPageMeta {
  title: string;
  description?: string;
  section?: string;
}

const PAGE_META: Record<string, ClientPageMeta> = {
  '/client/dashboard': {
    title: 'Tableau de bord',
    description: 'Vue d’ensemble de votre espace client.',
  },
  '/client/galeries': {
    title: 'Mes galeries',
    description: 'Galeries privées liées à votre compte.',
  },
  '/client/invitations': {
    title: 'Invitations électroniques',
    description: 'Demandes, validation studio et liens invités.',
  },
  '/client/invitations/nouvelle': {
    title: 'Nouvelle invitation',
    description: 'Formulaire de souscription au service invitations.',
    section: 'Invitations',
  },
  '/client/reservations': {
    title: 'Mes réservations',
    description: 'Suivi de vos séances, acomptes et confirmations.',
  },
  '/client/documents': {
    title: 'Devis & factures',
    description: 'Documents liés à vos réservations.',
  },
  '/client/notifications': {
    title: 'Notifications',
    description: 'Réservations, paiements et galeries.',
  },
  '/client/profile': {
    title: 'Mon profil',
    description: 'Identité, photo et mot de passe.',
  },
};

export function getClientPageMeta(pathname: string): ClientPageMeta {
  if (pathname.startsWith('/client/galeries/') && pathname !== '/client/galeries') {
    return {
      title: 'Galerie privée',
      section: 'Mes galeries',
      description: 'Consultation et téléchargement de vos photos.',
    };
  }

  if (PAGE_META[pathname]) {
    const base = PAGE_META[pathname];
    const section = findClientNavSection(pathname);
    return { ...base, section: base.section ?? section?.label };
  }

  const item = findClientNavItem(pathname);
  const section = findClientNavSection(pathname);
  if (item) {
    return {
      title: item.label,
      section: section?.label,
    };
  }

  return {
    title: 'Espace client',
    section: 'Mon espace',
  };
}
