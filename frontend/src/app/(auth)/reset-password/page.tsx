'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { resetPassword, loading, error, clearError } = useAuth();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    if (!token) {
      setLocalError('Lien invalide. Demandez une nouvelle réinitialisation.');
      return;
    }
    if (password.length < 8) {
      setLocalError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      setLocalError('Les mots de passe ne correspondent pas.');
      return;
    }

    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch {
      // error handled in hook
    }
  };

  const displayError = localError || error;

  if (!token && !done) {
    return (
      <Card className="glass-panel border-amber-400/30">
        <CardContent className="pt-8 text-center space-y-4">
          <p className="text-sm text-zinc-300">Ce lien de réinitialisation est invalide ou incomplet.</p>
          <Link href="/forgot-password">
            <Button variant="gold" size="sm">
              Demander un nouveau lien
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-panel border-amber-400/30">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl font-bold">Nouveau mot de passe</CardTitle>
        <CardDescription>Choisissez un mot de passe sécurisé pour votre compte.</CardDescription>
      </CardHeader>
      <CardContent>
        {done ? (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
            <h3 className="font-bold text-white">Mot de passe mis à jour</h3>
            <p className="text-xs text-zinc-300">Redirection vers la connexion…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {displayError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                {displayError}
              </div>
            )}

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Nouveau mot de passe</label>
              <Input
                required
                type="password"
                minLength={8}
                placeholder="8 caractères minimum"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Confirmer le mot de passe</label>
              <Input
                required
                type="password"
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>

            <Button type="submit" variant="gold" size="lg" className="w-full justify-center" disabled={loading}>
              {loading ? 'Enregistrement…' : 'Enregistrer'} <Lock className="h-4 w-4 ml-2" />
            </Button>

            <div className="pt-4 border-t border-zinc-800 text-center">
              <Link href="/login" className="text-xs text-zinc-400 hover:text-white flex items-center justify-center">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Retour à la connexion
              </Link>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center text-zinc-400 text-sm py-12">Chargement…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
