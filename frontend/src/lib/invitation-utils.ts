export function invitationPublicUrl(token: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/invitation/${token}`;
  }
  return `/invitation/${token}`;
}

export function invitationWhatsAppShareUrl(publicUrl: string, organizerNames: string): string {
  const text = encodeURIComponent(
    `Vous êtes invité(e) — ${organizerNames}\n\nConsultez l'invitation et confirmez votre présence :\n${publicUrl}`
  );
  return `https://wa.me/?text=${text}`;
}

export function invitationStatusVariant(
  status: string
): 'default' | 'success' | 'warning' | 'outline' | 'gold' {
  switch (status) {
    case 'active':
    case 'validated':
    case 'yes':
      return 'success';
    case 'pending':
    case 'in_preparation':
    case 'maybe':
      return 'warning';
    case 'rejected':
    case 'no':
      return 'outline';
    default:
      return 'default';
  }
}

export function guestResponseLabel(response: string): string {
  switch (response) {
    case 'yes':
      return 'Présent(e)';
    case 'no':
      return 'Absent(e)';
    case 'maybe':
      return 'En attente';
    default:
      return response;
  }
}

export function qrCodeImageUrl(publicUrl: string, size = 280): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(publicUrl)}`;
}

/** Formulaire RSVP ouvert jusqu'à la date limite incluse (YYYY-MM-DD). */
export function isRsvpFormOpen(deadline?: string | null, explicit?: boolean): boolean {
  if (explicit === false) return false;
  if (!deadline?.trim()) return true;
  const today = new Date().toISOString().slice(0, 10);
  return today <= deadline.trim().slice(0, 10);
}

export function formatDisplayDate(isoDate: string): string {
  const raw = isoDate.trim().slice(0, 10);
  const [y, m, d] = raw.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
