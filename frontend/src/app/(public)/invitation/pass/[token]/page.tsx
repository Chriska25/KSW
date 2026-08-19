'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, QrCode, Users, Calendar, MapPin, Loader2 } from 'lucide-react';
import { LoadingState } from '@/components/common/loading-state';
import { ErrorState } from '@/components/common/error-state';
import { Badge } from '@/components/ui/badge';
import { checkInGuestPass, fetchGuestPass } from '@/lib/invitation-public-api';
import type { GuestPass } from '@/lib/invitation-types';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatDisplayDate, qrCodeImageUrl } from '@/lib/invitation-utils';

export default function GuestPassPage() {
  const params = useParams();
  const token = String(params?.token || '').toUpperCase();
  const [pass, setPass] = useState<GuestPass | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [error, setError] = useState('');
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchGuestPass(token);
        if (cancelled) return;
        setPass(data);
        if (data.checkedInAt) {
          setAlreadyCheckedIn(true);
          return;
        }
        setCheckingIn(true);
        const result = await checkInGuestPass(token);
        if (cancelled) return;
        setPass(result.data);
        setAlreadyCheckedIn(result.alreadyCheckedIn);
      } catch (err: unknown) {
        if (!cancelled) setError(getApiErrorMessage(err, 'Billet invalide ou expiré.'));
      } finally {
        if (!cancelled) {
          setLoading(false);
          setCheckingIn(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return <LoadingState message="Vérification du billet…" />;
  }

  if (error || !pass) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center p-6">
        <ErrorState title="Billet indisponible" message={error || 'QR code invalide.'} />
      </div>
    );
  }

  const passUrl = pass.passUrl || (typeof window !== 'undefined' ? `${window.location.origin}/invitation/pass/${token}` : '');

  return (
    <div className="min-h-screen bg-surface-muted text-zinc-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface-muted/90 shadow-2xl overflow-hidden">
        <div className="px-6 pt-8 pb-4 text-center space-y-3 border-b border-border/80">
          {checkingIn ? (
            <Loader2 className="h-14 w-14 mx-auto text-primary animate-spin" />
          ) : (
            <CheckCircle2 className={`h-14 w-14 mx-auto ${alreadyCheckedIn ? 'text-muted-foreground' : 'text-emerald-400'}`} />
          )}
          <Badge variant={alreadyCheckedIn && pass.checkedInAt ? 'outline' : 'success'} className="text-[10px]">
            {checkingIn
              ? 'Validation en cours…'
              : alreadyCheckedIn && pass.checkedInAt
                ? 'Entrée déjà enregistrée'
                : 'Entrée validée'}
          </Badge>
          <h1 className="text-2xl font-bold text-foreground">{pass.fullName}</h1>
          <p className="text-sm text-muted-foreground">{pass.organizerNames}</p>
          {pass.eventTypeLabel && (
            <p className="text-xs text-primary/90 uppercase tracking-wider">{pass.eventTypeLabel}</p>
          )}
        </div>

        <div className="px-6 py-5 space-y-4 text-sm">
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-muted-foreground text-xs">Date</p>
              <p className="text-foreground">{formatDisplayDate(pass.eventDate)}{pass.eventTime ? ` · ${pass.eventTime}` : ''}</p>
            </div>
          </div>
          {pass.venue && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-muted-foreground text-xs">Lieu</p>
                <p className="text-foreground">{pass.venue}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3">
            <Users className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-muted-foreground text-xs">Personnes</p>
              <p className="text-foreground">
                {pass.guestCount} personne{pass.guestCount > 1 ? 's' : ''}
                {pass.companions?.length ? ` · ${pass.companions.join(', ')}` : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-8 flex flex-col items-center gap-3 border-t border-border/80 pt-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <QrCode className="h-3.5 w-3.5" />
            QR personnel
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrCodeImageUrl(passUrl, 180)}
            alt="QR code billet"
            className="rounded-xl border border-border bg-white p-2"
            width={180}
            height={180}
          />
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed max-w-xs">
            Ce QR code est unique à cette acceptation. Imprimez-le sur l&apos;invitation papier pour le contrôle à l&apos;entrée.
          </p>
        </div>
      </div>
    </div>
  );
}
