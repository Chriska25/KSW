'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/common/loading-state';
import { useAuth, isAdminUser } from '@/hooks/use-auth';

function Verify2FAForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId') || '';
  const redirect = searchParams.get('redirect');
  const { verify2FA, loading, error } = useAuth();
  const [code, setCode] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    try {
      const res = await verify2FA(userId, code);
      if (isAdminUser(res.user)) {
        router.replace(redirect || '/admin/dashboard');
      } else {
        router.replace(redirect || '/client/dashboard');
      }
    } catch {
      // Erreur gérée dans le hook
    }
  };

  if (!userId) {
    return (
      <Card className="glass-panel p-6 text-center text-sm text-zinc-400">
        Session 2FA invalide.{' '}
        <button type="button" onClick={() => router.replace('/login')} className="text-amber-400 underline">
          Retour à la connexion
        </button>
      </Card>
    );
  }

  return (
    <Card className="glass-panel border-amber-400/50 gold-border-glow text-center">
      <CardHeader className="space-y-3">
        <div className="h-12 w-12 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center mx-auto">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold">Double authentification</CardTitle>
        <CardDescription>
          Entrez le code à 6 chiffres reçu ou affiché en console serveur (dev : 123456).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVerify} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              {error}
            </div>
          )}

          <Input
            required
            maxLength={6}
            inputMode="numeric"
            className="text-center font-mono text-xl tracking-widest"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />

          <Button type="submit" variant="gold" size="lg" className="w-full justify-center" disabled={loading}>
            {loading ? 'Vérification…' : 'Valider le code'}
            {!loading && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function Verify2FAPage() {
  return (
    <Suspense fallback={<LoadingState message="Chargement de la vérification 2FA…" className="py-8" />}>
      <Verify2FAForm />
    </Suspense>
  );
}
