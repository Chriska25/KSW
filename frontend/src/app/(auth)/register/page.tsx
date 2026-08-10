'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { safeRedirect } from '@/lib/safe-redirect';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="text-zinc-400 text-sm text-center py-8">Chargement…</div>}>
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
          res.message || 'Compte créé. Votre accès sera activé après validation par l\'administrateur.'
        );
        return;
      }
      router.push(safeRedirect(redirect, '/client/dashboard'));
    } catch {
      // Handled in hook
    }
  };

  return (
    <Card className="glass-panel border-amber-400/30 gold-border-glow">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl font-bold">Créer un Compte Client</CardTitle>
        <CardDescription>
          Créez votre espace personnel pour retrouver vos galeries et devis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister} className="space-y-4">
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
              {successMessage}{' '}
              <Link href="/login" className="underline font-semibold">
                Se connecter
              </Link>
            </div>
          )}
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Prénom</label>
              <Input
                required
                placeholder="Sophie"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Nom</label>
              <Input
                required
                placeholder="Dupont"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">Adresse Email</label>
            <Input
              required
              type="email"
              placeholder="sophie.dupont@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">Mot de passe</label>
            <Input
              required
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <Button type="submit" variant="gold" size="lg" className="w-full justify-center" disabled={loading}>
            {loading ? 'Création...' : 'S\'inscrire'} <ArrowRight className="h-4 w-4 ml-2" />
          </Button>

          <div className="pt-4 border-t border-zinc-800 text-center text-xs text-zinc-400">
            Déjà un compte ?{' '}
            <Link
              href={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'}
              className="text-amber-400 font-semibold hover:underline"
            >
              Se connecter
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
