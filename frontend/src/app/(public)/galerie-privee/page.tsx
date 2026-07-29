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
import { isDevMode } from '@/lib/session';

function GaleriePriveeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings } = useSettings();
  const [accessKey, setAccessKey] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const keyFromUrl = searchParams.get('key');
    if (keyFromUrl) setAccessKey(keyFromUrl.toUpperCase());
  }, [searchParams]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = accessKey.trim().toUpperCase();
    if (!key) {
      setError('Veuillez saisir votre clé d\'accès.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await unlockGallery(key, password || undefined);
      router.push(`/client/galeries/${key}`);
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
        <Badge variant="gold">Espace client sécurisé</Badge>
        <h1 className="text-3xl font-extrabold text-white">
          Déverrouiller votre <span className="gold-gradient-text">galerie privée</span>
        </h1>
        <p className="text-zinc-400 text-xs leading-relaxed">
          Saisissez la clé reçue par {settings.studioName}. Un mot de passe peut être requis selon la galerie.
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
            <label className="text-zinc-400 block mb-1 font-semibold">Mot de passe (si demandé)</label>
            <Input
              type="password"
              placeholder="Mot de passe de la galerie"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
            />
          </div>

          {error && <p className="text-rose-400 text-[11px] font-medium">{error}</p>}

          <Button type="submit" variant="gold" size="lg" className="w-full font-bold" disabled={loading}>
            {loading ? 'Vérification…' : 'Accéder à la galerie'}
            {!loading && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </form>
      </Card>

      <div className="text-center text-[11px] text-zinc-500 space-y-1">
        <p className="flex items-center justify-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-amber-400" /> Épreuves filigranées & téléchargement HD
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
    <Suspense fallback={<div className="pt-32 text-center text-zinc-500 text-sm">Chargement…</div>}>
      <GaleriePriveeForm />
    </Suspense>
  );
}
