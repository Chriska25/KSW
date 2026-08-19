import type { ServiceItem } from '@/lib/service-types';

export type ServiceKind = 'photo' | 'invitation';

export const SERVICE_KIND_LABELS: Record<ServiceKind, string> = {
  photo: 'Prise de vue (réservation)',
  invitation: 'Invitation électronique (RSVP)',
};

/** Déduit le type pour les prestations créées avant l’ajout du champ explicite. */
export function inferServiceKind(pkg: Pick<ServiceItem, 'title' | 'category' | 'serviceKind'>): ServiceKind {
  if (pkg.serviceKind === 'invitation' || pkg.serviceKind === 'photo') {
    return pkg.serviceKind;
  }

  const hay = `${pkg.title} ${pkg.category}`.toLowerCase();
  if (hay.includes('invitation')) return 'invitation';

  return 'photo';
}

export function isInvitationService(pkg: ServiceItem): boolean {
  return inferServiceKind(pkg) === 'invitation';
}
