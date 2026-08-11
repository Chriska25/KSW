'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { PrivateGalleryView } from '@/components/gallery/private-gallery-view';
import { normalizeGalleryAccessKey } from '@/lib/gallery-access-path';

export default function ClientPrivateGalleryPage() {
  const params = useParams();
  const accessKey = normalizeGalleryAccessKey(params.accessKey as string);

  return (
    <PrivateGalleryView
      accessKey={accessKey}
      backHref="/client/dashboard"
      backLabel="Retour au tableau de bord"
    />
  );
}
