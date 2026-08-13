'use client';

import React, { Suspense } from 'react';
import { InvitationSubscribeWizard } from '@/components/invitations/invitation-subscribe-wizard';

function InvitationSubscribePageContent() {
  return (
    <div className="pt-28 px-4 sm:px-6 lg:px-8">
      <InvitationSubscribeWizard backHref="/prestations" successHref="/client/invitations" />
    </div>
  );
}

export default function PublicInvitationSubscribePage() {
  return (
    <Suspense fallback={<div className="pt-8 sm:pt-12 text-center text-zinc-500 text-sm">Chargement…</div>}>
      <InvitationSubscribePageContent />
    </Suspense>
  );
}
