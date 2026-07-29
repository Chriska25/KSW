'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { FolderHeart } from 'lucide-react';
import { ClientGalleriesList } from '@/components/client/client-galleries-list';
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
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
          <FolderHeart className="h-7 w-7 text-amber-400" />
          Mes <span className="gold-gradient-text">Galeries</span>
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Toutes les galeries privées liées à votre compte client.
        </p>
      </div>

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
