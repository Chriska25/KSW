'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Download,
  FolderHeart,
  ExternalLink,
  Lock,
  CheckCircle2,
  Copy,
  ImageIcon,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/context/settings-context';
import { ClientAuthGuard } from '@/components/client/client-auth-guard';
import { getClientSession, normalizeClientEmail } from '@/lib/client-session';
import { fetchClientGalleries, downloadGalleryPhotos } from '@/lib/gallery-client';
import { fetchClientNotifications } from '@/lib/client-notifications';
import { DEFAULT_GALLERY_COVER } from '@/lib/gallery-defaults';
import type { GalleryAdminItem } from '@/lib/gallery-types';
import type { AuthUser } from '@/hooks/use-auth';
import { LoadingState } from '@/components/common/loading-state';

export default function ClientDashboardPage() {
  return (
    <ClientAuthGuard>
      <ClientDashboardContent />
    </ClientAuthGuard>
  );
}

function ClientDashboardContent() {
  const { settings } = useSettings();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [clientGalleries, setClientGalleries] = useState<GalleryAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [notifPreview, setNotifPreview] = useState<{ unread: number; latest?: string }>({ unread: 0 });

  useEffect(() => {
    const user = getClientSession();
    setCurrentUser(user);

    const load = async () => {
      if (!user) return;
      try {
        const fromApi = await fetchClientGalleries();
        setClientGalleries(fromApi);
      } catch {
        setClientGalleries([]);
      } finally {
        setLoading(false);
      }
    };
    load();
    fetchClientNotifications()
      .then((r) =>
        setNotifPreview({
          unread: r.unreadCount,
          latest: r.data[0]?.title,
        })
      )
      .catch(() => {});
  }, []);

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownloadGallery = async (gal: GalleryAdminItem) => {
    const photos = gal.photos || [];
    if (photos.length === 0) return;
    setDownloadMsg(`Téléchargement de ${photos.length} photo(s)…`);
    try {
      await downloadGalleryPhotos(photos);
      setDownloadMsg('Téléchargements lancés dans votre navigateur.');
    } catch {
      setDownloadMsg('Erreur lors du téléchargement.');
    }
    setTimeout(() => setDownloadMsg(null), 4000);
  };

  if (!currentUser) return null;

  const totalPhotos = clientGalleries.reduce((acc, g) => acc + (g.photos?.length || 0), 0);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {downloadMsg && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-medium shadow-2xl">
          <CheckCircle2 className="h-4 w-4 inline mr-2" />
          {downloadMsg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Bonjour, <span className="gold-gradient-text">{currentUser.name.split(' ')[0]}</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Espace client {settings.studioName} — {normalizeClientEmail(currentUser.email)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/galerie-privee">
            <Button variant="outline" size="sm">
              <Lock className="h-4 w-4 mr-1.5" /> Accès par clé
            </Button>
          </Link>
          <Link href="/reservation">
            <Button variant="gold" size="sm">
              <Calendar className="h-4 w-4 mr-1.5" /> Réserver
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-panel">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-white">{clientGalleries.length}</div>
            <p className="text-xs text-zinc-400 mt-1">Galerie(s) privée(s)</p>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-400">{totalPhotos}</div>
            <p className="text-xs text-zinc-400 mt-1">Photos disponibles</p>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-white">{settings.depositRate}%</div>
            <p className="text-xs text-zinc-400 mt-1">Acompte standard studio</p>
          </CardContent>
        </Card>
      </div>

      {notifPreview.unread > 0 && (
        <Link href="/client/notifications">
          <Card className="glass-panel border-amber-400/30 hover:border-amber-400/50 transition-colors cursor-pointer">
            <CardContent className="py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    {notifPreview.unread} notification(s) non lue(s)
                  </p>
                  {notifPreview.latest && (
                    <p className="text-xs text-zinc-400 truncate">{notifPreview.latest}</p>
                  )}
                </div>
              </div>
              <Badge variant="gold">{notifPreview.unread}</Badge>
            </CardContent>
          </Card>
        </Link>
      )}

      <Card className="glass-panel" id="galleries">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderHeart className="h-5 w-5 text-amber-400" /> Vos galeries photos
          </CardTitle>
          <CardDescription>
            Ouvrez une galerie, marquez vos favoris et téléchargez vos épreuves HD.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <LoadingState message="Chargement de vos galeries…" />
          ) : clientGalleries.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <ImageIcon className="h-12 w-12 text-zinc-600 mx-auto" />
              <p className="text-sm text-zinc-400">Aucune galerie associée à votre compte pour le moment.</p>
              <Link href="/galerie-privee">
                <Button variant="gold" size="sm">Entrer une clé d&apos;accès</Button>
              </Link>
            </div>
          ) : (
            clientGalleries.map((gal) => (
              <div
                key={gal.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 flex flex-col lg:flex-row gap-5 lg:items-center lg:justify-between"
              >
                <div className="flex gap-4 min-w-0">
                  <img
                    src={gal.coverUrl || DEFAULT_GALLERY_COVER}
                    alt=""
                    className="h-20 w-28 object-cover rounded-xl border border-zinc-800 shrink-0"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_GALLERY_COVER;
                    }}
                  />
                  <div className="min-w-0 space-y-1">
                    <h3 className="font-bold text-white truncate">{gal.title}</h3>
                    <p className="text-xs text-zinc-400">
                      {gal.photos?.length || 0} photos
                      {gal.expiresAt ? ` • Expire le ${gal.expiresAt}` : ''}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-[11px] text-amber-400 font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                        {gal.accessKey}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyKey(gal.accessKey)}
                        className="text-[11px] text-zinc-500 hover:text-amber-400 flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        {copiedKey === gal.accessKey ? 'Copié !' : 'Copier'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadGallery(gal)}
                    disabled={!gal.photos?.length}
                    className="text-xs"
                  >
                    <Download className="h-4 w-4 mr-1" /> Télécharger
                  </Button>
                  <Link href={`/client/galeries/${gal.accessKey}`}>
                    <Button variant="gold" size="sm" className="text-xs font-bold">
                      Ouvrir <ExternalLink className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
