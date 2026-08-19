'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { safeRedirect } from '@/lib/safe-redirect';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground text-sm text-center py-8">Chargement…</div>}>
      <RegisterPageContent />
    </Suspense>
  );
}

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const { register, loading, error } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [successMessage, setSuccessMessage] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    try {
      const res = await register(formData);
      if (res?.user?.status === 'pending') {
        setSuccessMessage(
          res.message ||"Compte créé. Votre accès sera activé après validation par l'administrateur."
        );
        return;
      }
      router.push(safeRedirect(redirect, '/client/dashboard'));
    } catch {
      // Handled in hook
    }
  };

  return (
    <Card>
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-h1">Créer un compte client</CardTitle>
        <CardDescription>
          Créez votre espace personnel pour retrouver vos galeries et devis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister} className="space-y-4" noValidate>
          {successMessage && (
            <div className="p-3 rounded-lg bg-success-muted border border-success/25 text-success text-small" role="status">
              {successMessage}{' '}
              <Link href="/login" className="underline font-medium">
                Se connecter
              </Link>
            </div>
          )}
          {error && (
            <div className="p-3 rounded-lg bg-danger-muted border border-danger/25 text-danger text-small" role="alert">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="register-first">Prénom</Label>
              <Input
                id="register-first"
                required
                placeholder="Sophie"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="register-last">Nom</Label>
              <Input
                id="register-last"
                required
                placeholder="Dupont"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="register-email">Adresse email</Label>
            <Input
              id="register-email"
              required
              type="email"
              placeholder="sophie.dupont@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="register-password">Mot de passe</Label>
            <Input
              id="register-password"
              required
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Création…' :"S'inscrire"}
            {!loading && <ArrowRight className="h-4 w-4" aria-hidden />}
          </Button>

          <div className="pt-2 border-t border-border text-center text-small text-muted-foreground">
            Déjà un compte ?{' '}
            <Link
              href={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'}
              className="text-primary font-medium hover:underline"
            >
              Se connecter
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
