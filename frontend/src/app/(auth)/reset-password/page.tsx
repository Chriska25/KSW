'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/common/loading-state';
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
      <Card>
        <CardContent className="pt-8 text-center space-y-4">
          <p className="text-small text-muted-foreground">
            Ce lien de réinitialisation est invalide ou incomplet.
          </p>
          <Link href="/forgot-password">
            <Button variant="primary" size="sm">
              Demander un nouveau lien
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-h1">Nouveau mot de passe</CardTitle>
        <CardDescription>Choisissez un mot de passe sécurisé pour votre compte.</CardDescription>
      </CardHeader>
      <CardContent>
        {done ? (
          <div className="p-6 rounded-lg bg-success-muted border border-success/25 text-center space-y-3" role="status">
            <CheckCircle2 className="h-8 w-8 text-success mx-auto" aria-hidden />
            <h3 className="font-medium text-foreground">Mot de passe mis à jour</h3>
            <p className="text-small text-muted-foreground">Redirection vers la connexion…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {displayError && (
              <div className="p-3 rounded-lg bg-danger-muted border border-danger/25 text-danger text-small" role="alert">
                {displayError}
              </div>
            )}

            <div>
              <Label htmlFor="reset-password">Nouveau mot de passe</Label>
              <Input
                id="reset-password"
                required
                type="password"
                minLength={8}
                placeholder="8 caractères minimum"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="reset-confirm">Confirmer le mot de passe</Label>
              <Input
                id="reset-confirm"
                required
                type="password"
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Enregistrement…' : 'Enregistrer'}
              {!loading && <Lock className="h-4 w-4" aria-hidden />}
            </Button>

            <div className="pt-2 border-t border-border text-center">
              <Link href="/login" className="text-small text-muted-foreground hover:text-foreground inline-flex items-center">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" aria-hidden /> Retour à la connexion
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
    <Suspense fallback={<LoadingState message="Chargement…" className="py-8" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
