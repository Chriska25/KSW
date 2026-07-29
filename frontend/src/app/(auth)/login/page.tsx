'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth, isAdminUser } from '@/hooks/use-auth';
import { useSettings } from '@/context/settings-context';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error, clearError } = useAuth();
  const { settings } = useSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

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
      const redirect =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('redirect')
          : null;

      if (res.requires_2fa) {
        router.replace(
          `/verify-2fa?userId=${encodeURIComponent(res.user_id || res.user.id)}${
            redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''
          }`
        );
        return;
      }

      if (isAdminUser(res.user)) {
        router.replace('/admin/dashboard');
        return;
      }

      router.replace(redirect || '/client/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error && err.message) {
        setLocalError(err.message);
      }
    }
  };

  return (
    <Card className="glass-panel border-amber-400/30 gold-border-glow">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl font-bold">
          Connexion à <span className="gold-gradient-text">{settings.studioName || 'KSW Studio'}</span>
        </CardTitle>
        <CardDescription>
          Accédez à vos galeries privées, devis et espace membre.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          {displayError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              {displayError}
            </div>
          )}

          <div>
            <label htmlFor="login-email" className="text-xs text-zinc-400 block mb-1">
              Adresse email
            </label>
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
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="login-password" className="text-xs text-zinc-400">
                Mot de passe
              </label>
              <Link href="/forgot-password" className="text-xs text-amber-400 hover:underline">
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

          <Button
            type="submit"
            variant="gold"
            size="lg"
            className="w-full justify-center font-bold"
            disabled={loading}
          >
            {loading ? 'Connexion en cours…' : 'Se connecter'}
            {!loading && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>

          <div className="pt-2 border-t border-zinc-800 text-center text-xs text-zinc-400">
            Nouveau client ?{' '}
            <Link href="/register" className="text-amber-400 font-semibold hover:underline">
              Créer un compte
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
