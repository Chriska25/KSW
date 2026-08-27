'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/common/loading-state';
import { useAuth, isAdminUser } from '@/hooks/use-auth';
import { safeRedirect } from '@/lib/safe-redirect';

function Verify2FAForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId') || '';
  const redirect = searchParams.get('redirect');
  const { verify2FA, resend2FA, loading, error, clearError } = useAuth();
  const [code, setCode] = useState('');
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [deliveryEmail, setDeliveryEmail] = useState<string | null>(null);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored =
      sessionStorage.getItem('studio_two_fa_email') ||
      (() => {
        try {
          const raw = sessionStorage.getItem('studio_pending_2fa_user');
          if (!raw) return null;
          const parsed = JSON.parse(raw) as { email?: string };
          return parsed.email || null;
        } catch {
          return null;
        }
      })();
    setDeliveryEmail(stored);
    setLoginMessage(sessionStorage.getItem('studio_2fa_message'));
    setEmailError(sessionStorage.getItem('studio_2fa_email_error'));
    const sentFlag = sessionStorage.getItem('studio_2fa_email_sent');
    setEmailSent(sentFlag === '1' ? true : sentFlag === '0' ? false : null);
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    try {
      const res = await verify2FA(userId, code);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('studio_2fa_message');
        sessionStorage.removeItem('studio_2fa_email_sent');
        sessionStorage.removeItem('studio_2fa_email_error');
      }
      const target = isAdminUser(res.user)
        ? safeRedirect(redirect, '/admin/dashboard')
        : safeRedirect(redirect, '/client/dashboard');
      router.replace(target);
      router.refresh();
    } catch {
      // Erreur gérée dans le hook
    }
  };

  const handleResend = async () => {
    if (!userId) return;
    setResendMessage(null);
    clearError();
    try {
      const message = await resend2FA(userId);
      setResendMessage(message || 'Nouveau code envoyé par email.');
    } catch {
      // Erreur gérée dans le hook
    }
  };

  if (!userId) {
    return (
      <Card className="p-6 text-center text-small text-muted-foreground">
        Session 2FA invalide.{' '}
        <button type="button" onClick={() => router.replace('/login')} className="text-primary underline">
          Retour à la connexion
        </button>
      </Card>
    );
  }

  return (
    <Card className="text-center">
      <CardHeader className="space-y-3">
        <div className="h-12 w-12 rounded-lg bg-primary-muted text-primary flex items-center justify-center mx-auto">
          <ShieldCheck className="h-6 w-6" aria-hidden />
        </div>
        <CardTitle className="text-h1">Double authentification</CardTitle>
        <CardDescription className="text-left sm:text-center space-y-2">
          {deliveryEmail ? (
            <span className="block">
              {emailSent === false ? (
                <>
                  L&apos;email n&apos;a pas pu être envoyé à{' '}
                  <strong className="text-foreground">{deliveryEmail}</strong> (SMTP / Gmail OAuth à configurer).
                </>
              ) : (
                <>
                  Entrez le code à 6 chiffres envoyé à{' '}
                  <strong className="text-foreground">{deliveryEmail}</strong> (vérifiez aussi les spams).
                </>
              )}
            </span>
          ) : (
            <span className="block">Entrez le code à 6 chiffres envoyé à votre adresse email.</span>
          )}
          {loginMessage && (
            <span className="block text-warning text-caption">{loginMessage}</span>
          )}
          {emailError && emailSent === false && (
            <span className="block text-caption text-danger text-left rounded-lg border border-danger/25 bg-danger-muted px-3 py-2">
              {emailError}
              <span className="block mt-2 text-muted-foreground">
                Pour rétablir l&apos;envoi réel : regénérez le token Gmail avec{' '}
                <code className="text-primary">python3 backend/scripts/gmail_oauth_setup.py</code>{' '}
                puis mettez à jour <code className="text-primary">GMAIL_REFRESH_TOKEN</code> dans{' '}
                <code className="text-primary">.env</code> et redémarrez le backend.
              </span>
            </span>
          )}
          {process.env.NODE_ENV === 'development' && (
            <span className="block text-caption rounded-lg border border-primary/25 bg-primary-muted px-3 py-2">
              Mode test local : saisissez <strong className="text-foreground font-mono">123456</strong> puis
              cliquez « Valider le code » — même si l&apos;email n&apos;a pas été envoyé.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVerify} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-danger-muted border border-danger/25 text-danger text-small text-left" role="alert">
              {error}
            </div>
          )}

          {resendMessage && (
            <div className="p-3 rounded-lg bg-success-muted border border-success/25 text-success text-small text-left" role="status">
              {resendMessage}
            </div>
          )}

          <div>
            <Label htmlFor="verify-2fa-code" className="sr-only">
              Code à 6 chiffres
            </Label>
            <Input
              id="verify-2fa-code"
              required
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="text-center font-mono text-lg tracking-widest"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Vérification…' : 'Valider le code'}
            {!loading && <ArrowRight className="h-4 w-4" aria-hidden />}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            disabled={loading}
            onClick={handleResend}
          >
            Renvoyer le code par email
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
