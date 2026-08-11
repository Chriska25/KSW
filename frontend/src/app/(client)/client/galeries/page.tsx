'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { FolderHeart } from 'lucide-react';
import { ClientGalleriesList } from '@/components/client/client-galleries-list';
import { ClientPageHeader } from '@/components/client/client-page-header';
import { fetchClientGalleries } from '@/lib/gallery-client';
import type { GalleryAdminItem } from '@/lib/gallery-types';
import { getApiErrorMessage } from '@/lib/api-error';

export default function ClientGaleriesPage() {
  const [galleries, setGalleries] = useState<GalleryAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const data = await fetchClientGalleries();
      setGalleries(data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Impossible de charger vos galeries.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <ClientPageHeader
        title="Mes"
        accent="Galeries"
        description="Toutes les galeries privées liées à votre compte client."
        icon={FolderHeart}
      />

      <ClientGalleriesList
        galleries={galleries}
        loading={loading}
        error={error}
        onRetry={load}
        showHeader={false}
      />
    </div>
  );
}
