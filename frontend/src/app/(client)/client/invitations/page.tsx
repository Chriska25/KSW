'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { MailPlus, RefreshCw, ExternalLink, Users, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/common/loading-state';
import { ClientPageHeader } from '@/components/client/client-page-header';
import { fetchClientInvitations } from '@/lib/client-invitations-api';
import type { ElectronicInvitation } from '@/lib/invitation-types';
import { INVITATION_STATUS_OPTIONS } from '@/lib/invitation-types';
import { invitationPublicUrl, invitationStatusVariant } from '@/lib/invitation-utils';
import { getApiErrorMessage } from '@/lib/api-error';

export default function ClientInvitationsPage() {
  return <ClientInvitationsContent />;
}

function ClientInvitationsContent() {
  const [items, setItems] = useState<ElectronicInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setItems(await fetchClientInvitations());
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Impossible de charger vos invitations.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const statusLabel = (s: string) =>
    INVITATION_STATUS_OPTIONS.find((o) => o.value === s)?.label || s;

  if (loading) return <LoadingState message="Chargement de vos invitations…" />;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <ClientPageHeader
        title="Invitations"
        accent="électroniques"
        description="Souscrivez au service, suivez la validation studio et partagez votre lien aux invités."
        icon={MailPlus}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => { setLoading(true); load(); }}>
              <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
            </Button>
            <Link href="/client/invitations/nouvelle">
              <Button variant="gold" size="sm">Nouvelle demande</Button>
            </Link>
          </>
        }
      />

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm">{error}</div>
      )}

      {items.length === 0 ? (
        <Card className="glass-panel">
          <CardContent className="py-12 text-center text-zinc-500 text-sm">
            Aucune demande pour le moment.{' '}
            <Link href="/client/invitations/nouvelle" className="text-amber-400 hover:underline">
              Souscrire au service
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((inv) => (
            <Card key={inv.id} className="glass-panel">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg text-white">{inv.organizerNames}</CardTitle>
                    <CardDescription>
                      {inv.eventTypeLabel} — {inv.eventDate}
                      {inv.eventTime ? ` à ${inv.eventTime}` : ''}
                    </CardDescription>
                  </div>
                  <Badge variant={invitationStatusVariant(inv.status)}>{statusLabel(inv.status)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {inv.status === 'rejected' && inv.rejectionReason && (
                  <p className="text-rose-400 text-xs">{inv.rejectionReason}</p>
                )}
                {inv.stats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <StatPill icon={Users} label="Réponses" value={inv.stats.totalResponses} />
                    <StatPill icon={CheckCircle2} label="Présents" value={inv.stats.confirmed} />
                    <StatPill label="Absents" value={inv.stats.declined} />
                    <StatPill label="Personnes" value={inv.stats.expectedPeople} />
                  </div>
                )}
                {inv.publicToken && inv.linkActive && (
                  <a
                    href={invitationPublicUrl(inv.publicToken)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-amber-400 text-xs hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Voir l&apos;invitation publique
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </p>
      <p className="text-white font-semibold">{value}</p>
    </div>
  );
}
