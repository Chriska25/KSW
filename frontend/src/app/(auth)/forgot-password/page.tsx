'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    } catch {
      // Handled in hook
    }
  };

  return (
    <Card>
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-h1">Mot de passe oublié</CardTitle>
        <CardDescription>
          Entrez votre adresse email pour recevoir un lien de réinitialisation sécurisé.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="p-6 rounded-lg bg-primary-muted border border-primary/25 text-center space-y-3">
            <h3 className="font-medium text-foreground">Email envoyé</h3>
            <p className="text-small text-muted-foreground">
              Consultez votre boîte de réception pour réinitialiser votre mot de passe.
            </p>
            <Link href="/login">
              <Button variant="outline" size="sm" className="mt-2">
                Retour à la connexion
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div className="p-3 rounded-lg bg-danger-muted border border-danger/25 text-danger text-small" role="alert">
                {error}
              </div>
            )}

            <div>
              <Label htmlFor="forgot-email">Votre adresse email</Label>
              <Input
                id="forgot-email"
                required
                type="email"
                placeholder="client@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Envoi…' : 'Réinitialiser mon mot de passe'}
              {!loading && <Send className="h-4 w-4" aria-hidden />}
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
