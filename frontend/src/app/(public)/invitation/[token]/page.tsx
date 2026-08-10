'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { LoadingState } from '@/components/common/loading-state';
import { ErrorState } from '@/components/common/error-state';
import { PublicInvitationView } from '@/components/invitations/public-invitation-view';
import { fetchPublicInvitation } from '@/lib/invitation-public-api';
import type { PublicInvitation } from '@/lib/invitation-types';
import { getApiErrorMessage } from '@/lib/api-error';

export default function PublicInvitationPage() {
  const params = useParams();
  const token = String(params?.token || '');
  const [invitation, setInvitation] = useState<PublicInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetchPublicInvitation(token)
      .then(setInvitation)
      .catch((err) => setError(getApiErrorMessage(err, 'Invitation introuvable ou lien désactivé.')))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return <LoadingState message="Chargement de l'invitation…" />;
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <ErrorState title="Invitation indisponible" message={error || 'Lien invalide.'} />
      </div>
    );
  }

  return <PublicInvitationView token={token} invitation={invitation} />;
}
