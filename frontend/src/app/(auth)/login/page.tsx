'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, isAdminUser } from '@/hooks/use-auth';
import { safeRedirect } from '@/lib/safe-redirect';
import { useSettings } from '@/context/settings-context';
import { clearSession } from '@/lib/session';
import { buildLoginUrl, isAdminLoginContext } from '@/lib/auth-login-url';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground text-sm text-center py-8">Chargement…</div>}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loading, error, clearError } = useAuth();
  const { settings } = useSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const redirect = searchParams.get('redirect');
  const isAdminLogin = isAdminLoginContext(searchParams);

  const displayError = localError || error;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim() || !password) {
      setLocalError('Email et mot de passe requis.');
      return;
    }

    try {
      const res = await login(email.trim(), password);

      if (res.requires_2fa) {
        router.replace(
          `/verify-2fa?userId=${encodeURIComponent(res.user_id || res.user.id)}${
            redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''
          }${isAdminLogin ? '&admin=1' : ''}`
        );
        return;
      }

      if (isAdminUser(res.user)) {
        const adminTarget = safeRedirect(
          redirect && redirect.startsWith('/admin') ? redirect : null,
          '/admin/dashboard'
        );
        router.replace(adminTarget);
        return;
      }

      if (isAdminLogin) {
        clearSession();
        setLocalError('Accès réservé aux comptes administrateur.');
        return;
      }

      router.replace(safeRedirect(redirect, '/client/dashboard'));
    } catch (err: unknown) {
      if (err instanceof Error && err.message) {
        setLocalError(err.message);
      }
    }
  };

  return (
    <Card>
      <CardHeader className="text-center space-y-2">
        {isAdminLogin && (
          <div className="inline-flex items-center gap-2 mx-auto px-3 py-1 rounded-md bg-primary-muted border border-primary/25 text-primary text-caption font-medium uppercase tracking-wider">
            <Shield className="h-3.5 w-3.5" aria-hidden />
            Espace administrateur
          </div>
        )}
        <CardTitle className="text-h1">
          Connexion à <span className="gold-gradient-text">{settings.studioName || 'KSW Studio'}</span>
        </CardTitle>
        <CardDescription>
          {isAdminLogin
            ? 'Identifiez-vous pour accéder au back-office studio.'
            : 'Accédez à vos galeries privées, devis et espace membre.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          {displayError && (
            <div className="p-3 rounded-lg bg-danger-muted border border-danger/25 text-danger text-small" role="alert">
              {displayError}
            </div>
          )}

          <div>
            <Label htmlFor="login-email">Adresse email</Label>
            <Input
              id="login-email"
              required
              type="email"
              autoComplete="email"
              placeholder="vous@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <Label htmlFor="login-password" className="mb-0">
                Mot de passe
              </Label>
              <Link href="/forgot-password" className="text-caption text-primary hover:underline">
                Oublié ?
              </Link>
            </div>
            <Input
              id="login-password"
              required
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Connexion en cours…' : 'Se connecter'}
            {!loading && <ArrowRight className="h-4 w-4" aria-hidden />}
          </Button>

          <div className="pt-2 border-t border-border text-center text-small text-muted-foreground space-y-2">
            {isAdminLogin ? (
              <>
                {process.env.NODE_ENV === 'development' && (
                  <p className="text-caption text-left rounded-lg border border-border bg-surface-muted px-3 py-2">
                    Comptes staff de démo : <strong className="text-foreground">admin@kswstudio.fr</strong> /{' '}
                    <strong className="text-foreground font-mono">Password123!</strong> — puis code 2FA{' '}
                    <strong className="text-foreground font-mono">123456</strong> si l&apos;email ne part pas.
                  </p>
                )}
                <Link href="/" className="text-primary font-medium hover:underline block">
                  Retour au site public
                </Link>
                <Link href="/login" className="hover:text-foreground block">
                  Connexion client →
                </Link>
              </>
            ) : (
              <>
                Nouveau client ?{' '}
                <Link
                  href={redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : '/register'}
                  className="text-primary font-medium hover:underline"
                >
                  Créer un compte
                </Link>
                <span className="block pt-1">
                  Personnel du studio ?{' '}
                  <Link href={buildLoginUrl({ admin: true })} className="text-primary font-medium hover:underline">
                    Accès administrateur
                  </Link>
                </span>
              </>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
