'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';

export default function ForgotPasswordPage() {
  const { forgotPassword, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      // Handled in hook
    }
  };

  return (
    <Card className="glass-panel border-amber-400/30">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl font-bold">Mot de Passe Oublié</CardTitle>
        <CardDescription>
          Entrez votre adresse email pour recevoir un lien de réinitialisation sécurisé.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="p-6 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-center space-y-3">
            <h3 className="font-bold text-white">Email Envoyé !</h3>
            <p className="text-xs text-zinc-300">
              Consultez votre boîte de réception pour réinitialiser votre mot de passe.
            </p>
            <Link href="/login">
              <Button variant="outline" size="sm" className="mt-2">
                Retour à la connexion
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Votre Adresse Email</label>
              <Input
                required
                type="email"
                placeholder="client@studiolumiere.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button type="submit" variant="gold" size="lg" className="w-full justify-center" disabled={loading}>
              {loading ? 'Envoi...' : 'Réinitialiser mon mot de passe'} <Send className="h-4 w-4 ml-2" />
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
