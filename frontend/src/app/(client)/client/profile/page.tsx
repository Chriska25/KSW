'use client';

import React, { useState } from 'react';
import { User, Lock, Save, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getClientInitials, normalizeClientEmail } from '@/lib/client-session';
import { useSessionUser } from '@/hooks/use-session-user';
import { changeClientPassword } from '@/lib/client-api';
import { getApiErrorMessage } from '@/lib/api-error';

export default function ClientProfilePage() {
  return <ClientProfileContent />;
}

function ClientProfileContent() {
  const { user, ready } = useSessionUser();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  if (!ready || !user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSaving(true);
    try {
      await changeClientPassword(currentPassword, newPassword);
      setSuccess('Mot de passe mis à jour avec succès.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Impossible de modifier le mot de passe.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
          <User className="h-7 w-7 text-amber-400" />
          Mon <span className="gold-gradient-text">Profil</span>
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Informations de votre compte client et sécurité.
        </p>
      </div>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-lg">Compte</CardTitle>
          <CardDescription>Identité liée à vos galeries et réservations.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-950/60">
            <div className="h-14 w-14 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-amber-400 text-lg shrink-0">
              {getClientInitials(user.name)}
            </div>
            <div className="min-w-0 space-y-1">
              <p className="font-bold text-white text-lg">{user.name}</p>
              <p className="text-sm text-zinc-400">{normalizeClientEmail(user.email)}</p>
              <Badge variant="outline" className="text-[10px] mt-1">Client actif</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-400" />
            Changer le mot de passe
          </CardTitle>
          <CardDescription>Minimum 8 caractères recommandés.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-zinc-400 block mb-1 font-semibold">Mot de passe actuel</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="text-zinc-400 block mb-1 font-semibold">Nouveau mot de passe</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="text-zinc-400 block mb-1 font-semibold">Confirmer le nouveau mot de passe</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            {error && (
              <p className="text-rose-400 text-xs rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2">
                {error}
              </p>
            )}
            {success && (
              <p className="text-emerald-300 text-xs rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {success}
              </p>
            )}

            <Button type="submit" variant="gold" size="sm" disabled={saving} className="space-x-2">
              <Save className="h-4 w-4" />
              <span>{saving ? 'Enregistrement…' : 'Mettre à jour'}</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
