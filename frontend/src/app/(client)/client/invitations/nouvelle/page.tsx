'use client';

import React, { Suspense } from 'react';
import { InvitationSubscribeWizard } from '@/components/invitations/invitation-subscribe-wizard';

function ClientNewInvitationContent() {
  return <InvitationSubscribeWizard backHref="/client/invitations" successHref="/client/invitations" />;
}

export default function NewClientInvitationPage() {
  return (
    <Suspense fallback={<div className="text-zinc-500 text-sm py-8">Chargement…</div>}>
      <ClientNewInvitationContent />
    </Suspense>
  );
}
