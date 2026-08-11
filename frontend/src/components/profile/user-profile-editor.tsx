'use client';

import React, { useEffect, useRef, useState } from 'react';
import { User, Lock, Save, CheckCircle2, Camera, Trash2, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ThemeSwitcher } from '@/components/theme/theme-switcher';
import { useTheme } from '@/components/providers/theme-provider';
import { THEME_MODE_LABELS } from '@/lib/theme';
import {
  changeUserPassword,
  fetchUserProfile,
  getProfileInitials,
  resolveAvatarUrl,
  roleLabel,
  updateUserProfile,
  uploadProfileAvatar,
  type UserProfile,
} from '@/lib/profile-api';
import { getApiErrorMessage } from '@/lib/api-error';

interface UserProfileEditorProps {
  title?: string;
  subtitle?: string;
  showTheme?: boolean;
  hideHeader?: boolean;
}

export function UserProfileEditor({
  title = 'Mon Profil',
  subtitle = 'Modifiez vos informations personnelles et votre mot de passe.',
  showTheme = true,
  hideHeader = false,
}: UserProfileEditorProps) {
  const { mode: themeMode } = useTheme();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const data = await fetchUserProfile();
        if (cancelled) return;
        setProfile(data);
        setFirstName(data.firstName || data.name.split(/\s+/)[0] || '');
        setLastName(data.lastName || data.name.split(/\s+/).slice(1).join(' ') || '');
        setPhone(data.phone || '');
        setAvatarUrl(data.avatarUrl || '');
      } catch (err) {
        if (!cancelled) {
          setLoadError(getApiErrorMessage(err, 'Impossible de charger votre profil.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileError('Veuillez sélectionner une image (PNG, JPG, WebP…).');
      return;
    }
    setAvatarUploading(true);
    setProfileError('');
    try {
      const url = await uploadProfileAvatar(file);
      setAvatarUrl(url);
    } catch (err) {
      setProfileError(getApiErrorMessage(err, 'Impossible de téléverser la photo.'));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setSavingProfile(true);
    try {
      const updated = await updateUserProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
      });
      setProfile(updated);
      setProfileSuccess('Profil enregistré avec succès.');
    } catch (err) {
      setProfileError(getApiErrorMessage(err, 'Impossible d\'enregistrer le profil.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 8) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSavingPassword(true);
    try {
      await changeUserPassword(currentPassword, newPassword);
      setPasswordSuccess('Mot de passe mis à jour avec succès.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(getApiErrorMessage(err, 'Impossible de modifier le mot de passe.'));
    } finally {
      setSavingPassword(false);
    }
  };

  const avatarPreview = resolveAvatarUrl(avatarUrl);
  const displayName = `${firstName} ${lastName}`.trim() || profile?.name || 'Utilisateur';

  if (loading) {
    return <p className="text-zinc-500 text-sm py-12 text-center">Chargement du profil…</p>;
  }

  if (loadError) {
    return (
      <p className="text-rose-400 text-sm rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
        {loadError}
      </p>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {!hideHeader && (
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
            <User className="h-7 w-7 text-amber-400" />
            {title.includes(' ') ? (
              <>
                {title.split(' ')[0]}{' '}
                <span className="gold-gradient-text">{title.split(' ').slice(1).join(' ')}</span>
              </>
            ) : (
              <span className="gold-gradient-text">{title}</span>
            )}
          </h1>
          <p className="text-zinc-400 text-sm mt-1">{subtitle}</p>
        </div>
      )}

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-lg">Identité & photo</CardTitle>
          <CardDescription>Nom affiché sur vos galeries, réservations et factures.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-5 text-xs">
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <div className="flex flex-col items-center gap-3 shrink-0">
                <div className="relative h-24 w-24 rounded-full border-2 border-zinc-700 bg-zinc-900 overflow-hidden flex items-center justify-center">
                  {avatarPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-amber-400">
                      {getProfileInitials(displayName)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                    aria-label="Changer la photo"
                  >
                    <Camera className="h-6 w-6" />
                  </button>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={avatarUploading}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    {avatarUploading ? 'Envoi…' : 'Changer la photo'}
                  </Button>
                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAvatarUrl('')}
                      className="text-zinc-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-4 w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-400 block mb-1 font-semibold">Prénom</label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1 font-semibold">Nom</label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Email
                  </label>
                  <Input value={profile?.email || ''} disabled className="opacity-70 cursor-not-allowed" />
                  <p className="text-[11px] text-zinc-500 mt-1">L&apos;email ne peut pas être modifié ici. Contactez l&apos;administrateur si besoin.</p>
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> Téléphone
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{roleLabel(profile?.role)}</Badge>
                  <Badge variant={profile?.status === 'active' ? 'success' : 'warning'} className="text-[10px]">
                    {profile?.status === 'active' ? 'Compte actif' : profile?.status || '—'}
                  </Badge>
                </div>
              </div>
            </div>

            {profileError && (
              <p className="text-rose-400 text-xs rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2">
                {profileError}
              </p>
            )}
            {profileSuccess && (
              <p className="text-emerald-300 text-xs rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {profileSuccess}
              </p>
            )}

            <Button type="submit" variant="gold" size="sm" disabled={savingProfile} className="space-x-2">
              <Save className="h-4 w-4" />
              <span>{savingProfile ? 'Enregistrement…' : 'Enregistrer le profil'}</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {showTheme && (
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-lg">Apparence</CardTitle>
            <CardDescription>
              Thème d&apos;affichage — actuellement : {THEME_MODE_LABELS[themeMode]}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeSwitcher />
          </CardContent>
        </Card>
      )}

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-400" />
            Changer le mot de passe
          </CardTitle>
          <CardDescription>Minimum 8 caractères recommandés.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
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

            {passwordError && (
              <p className="text-rose-400 text-xs rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2">
                {passwordError}
              </p>
            )}
            {passwordSuccess && (
              <p className="text-emerald-300 text-xs rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {passwordSuccess}
              </p>
            )}

            <Button type="submit" variant="outline" size="sm" disabled={savingPassword} className="space-x-2">
              <Lock className="h-4 w-4" />
              <span>{savingPassword ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
