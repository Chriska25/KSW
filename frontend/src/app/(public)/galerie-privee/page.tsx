'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Key, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/context/settings-context';
import { unlockGallery } from '@/lib/gallery-client';
import { getApiErrorMessage } from '@/lib/api-error';
import { galleryAccessPath, normalizeGalleryAccessKey } from '@/lib/gallery-access-path';
import { isDevMode } from '@/lib/session';

function GaleriePriveeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings } = useSettings();
  const [accessKey, setAccessKey] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoTried, setAutoTried] = useState(false);

  useEffect(() => {
    const keyFromUrl = searchParams.get('key');
    if (keyFromUrl) setAccessKey(normalizeGalleryAccessKey(keyFromUrl));
  }, [searchParams]);

  useEffect(() => {
    const keyFromUrl = searchParams.get('key');
    if (!keyFromUrl || autoTried) return;

    const key = normalizeGalleryAccessKey(keyFromUrl);
    if (!key) return;

    setAutoTried(true);
    setLoading(true);
    unlockGallery(key)
      .then(() => {
        router.replace(galleryAccessPath(key));
      })
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 403) {
          setError('Cette galerie nécessite un mot de passe.');
        } else {
          setError(getApiErrorMessage(err, 'Clé invalide ou galerie introuvable.'));
        }
      })
      .finally(() => setLoading(false));
  }, [searchParams, autoTried, router]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = normalizeGalleryAccessKey(accessKey);
    if (!key) {
      setError('Veuillez saisir votre clé d\'accès.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await unlockGallery(key, password || undefined);
      router.push(galleryAccessPath(key));
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Clé ou mot de passe incorrect.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-28 pb-20 max-w-md mx-auto w-full px-4 space-y-8">
      <div className="text-center space-y-3">
        <div className="h-16 w-16 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center mx-auto gold-border-glow">
          <Lock className="h-8 w-8" />
        </div>
        <Badge variant="gold">Accès par clé</Badge>
        <h1 className="text-3xl font-extrabold text-white">
          Ouvrir votre <span className="gold-gradient-text">galerie privée</span>
        </h1>
        <p className="text-zinc-400 text-xs leading-relaxed">
          Entrez la clé reçue par {settings.studioName}. Aucune connexion requise — le mot de passe n&apos;est demandé que si la galerie en possède un.
        </p>
      </div>

      <Card className="glass-panel border-amber-400/30 p-6">
        <form onSubmit={handleUnlock} className="space-y-4 text-xs">
          <div>
            <label className="text-zinc-400 block mb-1 font-semibold">Clé d&apos;accès</label>
            <div className="relative">
              <Key className="h-4 w-4 absolute left-3 top-3.5 text-zinc-500" />
              <Input
                required
                placeholder="Ex: SOPHIE-ALEX-2026"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
                className="pl-9 h-11 uppercase font-mono tracking-wider"
              />
            </div>
          </div>

          <div>
            <label className="text-zinc-400 block mb-1 font-semibold">Mot de passe (optionnel)</label>
            <Input
              type="password"
              placeholder="Uniquement si indiqué par le studio"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
            />
          </div>

          {error && <p className="text-rose-400 text-[11px] font-medium">{error}</p>}

          <Button type="submit" variant="gold" size="lg" className="w-full font-bold" disabled={loading}>
            {loading ? 'Ouverture…' : 'Accéder à la galerie'}
            {!loading && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </form>
      </Card>

      <div className="text-center text-[11px] text-zinc-500 space-y-1">
        <p className="flex items-center justify-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-amber-400" /> Lien direct : <code className="text-amber-400/80">/galerie/VOTRE-CLE</code>
        </p>
        {isDevMode() && (
          <p>Démo : clé <code className="text-amber-400/80">SOPHIE-ALEX-2026</code> — mot de passe <code className="text-amber-400/80">Love2026!</code></p>
        )}
      </div>
    </div>
  );
}

export default function GaleriePriveeUnlockPage() {
  return (
    <Suspense fallback={<div className="pt-8 sm:pt-12 text-center text-zinc-500 text-sm">Chargement…</div>}>
      <GaleriePriveeForm />
    </Suspense>
  );
}
