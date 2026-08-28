'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Clock,
  Database,
  Download,
  Upload,
  ScrollText,
  Mail,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Save,
  Globe,
  KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { SystemSettings } from '@/lib/studio-defaults';
import { STUDIO_GMAIL_ADDRESS } from '@/lib/studio-defaults';
import { downloadAdminBackup } from '@/lib/admin-search';
import {
  fetchSecurityOverview,
  getLastBackupLabel,
  restoreAdminBackup,
  sendAdminTestEmail,
  type SecurityOverview,
} from '@/lib/admin-security-api';
import { getApiErrorMessage, isApiTimeout } from '@/lib/api-error';

interface SecuritySettingsFieldsProps {
  settings: SystemSettings;
  patchSettings: (patch: Partial<SystemSettings>) => void;
  onSyncLocal: () => void;
  syncStatus: string | null;
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Badge variant={ok ? 'success' : 'warning'} className="text-[10px]">
      {label}
    </Badge>
  );
}

export function SecuritySettingsFields({
  settings,
  patchSettings,
  onSyncLocal,
  syncStatus,
}: SecuritySettingsFieldsProps) {
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [lastBackupLabel, setLastBackupLabel] = useState<string | null>(null);
  const [backupTriggered, setBackupTriggered] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [restoreTriggered, setRestoreTriggered] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);
  const [testEmailTo, setTestEmailTo] = useState(settings.contactEmail || '');
  const [smtpPasswordInput, setSmtpPasswordInput] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailMessage, setTestEmailMessage] = useState<string | null>(null);
  const [testEmailError, setTestEmailError] = useState<string | null>(null);

  const smtpPasswordStored = Boolean(
    settings.smtpPasswordConfigured || overview?.smtpConfigured
  );

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const data = await fetchSecurityOverview();
      setOverview(data);
    } catch (err) {
      setOverviewError(getApiErrorMessage(err, 'Impossible de charger le tableau de bord sécurité.'));
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    setLastBackupLabel(getLastBackupLabel());
    void loadOverview();
  }, [loadOverview]);

  const handleTriggerBackup = async () => {
    setBackupTriggered(true);
    setBackupError(null);
    try {
      await downloadAdminBackup();
      setLastBackupLabel(getLastBackupLabel());
    } catch (e) {
      setBackupError(getApiErrorMessage(e, 'Échec de l\'export de sauvegarde.'));
    } finally {
      setBackupTriggered(false);
    }
  };

  const handleRestoreBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setRestoreError(null);
    setRestoreSuccess(null);

    const confirmed = window.confirm(
      'Restaurer cette sauvegarde ?\n\nLes données actuelles (paramètres, réservations, galeries, prestations, blog, FAQ…) seront remplacées par le contenu du fichier.\n\nLes clés secrètes masquées ([redacted]) ne seront pas écrasées.\n\nContinuer ?'
    );
    if (!confirmed) return;

    setRestoreTriggered(true);
    try {
      const result = await restoreAdminBackup(file);
      const counts = Object.entries(result.restored)
        .map(([key, count]) => `${key}: ${count}`)
        .join(', ');
      setRestoreSuccess(
        `${result.message}${counts ? ` (${counts})` : ''}${result.exportedAt ? ` — export du ${new Date(result.exportedAt).toLocaleString('fr-FR')}` : ''}`
      );
      setLastBackupLabel(getLastBackupLabel());
      await loadOverview();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('settings_updated'));
      }
    } catch (err) {
      setRestoreError(getApiErrorMessage(err, 'Échec de la restauration de sauvegarde.'));
    } finally {
      setRestoreTriggered(false);
    }
  };

  const handleTestEmail = async () => {
    const passwordForTest = smtpPasswordInput.trim();
    const gmailApiReady = Boolean(overview?.gmailApiConfigured);
    const isGmail = Boolean(
      settings.smtpHost?.includes('gmail.com') || settings.smtpUser?.includes('@gmail.com')
    );

    if (isGmail && !gmailApiReady) {
      const missing = overview?.gmailApiMissing?.length
        ? overview.gmailApiMissing.join(', ')
        : 'GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN';
      setTestEmailError(
        `Configuration Gmail API incomplète. Il manque dans .env : ${missing}.\n\n` +
          '1. Récupérez CLIENT_ID et CLIENT_SECRET dans Google Cloud → Identifiants → OAuth.\n' +
          '2. Lancez : python3 backend/scripts/gmail_oauth_setup.py\n' +
          '3. Collez les 3 valeurs dans .env → docker compose up -d backend'
      );
      setTestEmailMessage(null);
      return;
    }

    const needsPassword =
      isGmail &&
      !settings.gmailUseApi &&
      !gmailApiReady &&
      !passwordForTest &&
      !smtpPasswordStored;

    if (needsPassword) {
      setTestEmailError(
        'Gmail : saisissez le mot de passe d\'application Google (16 caractères), ou activez « API Gmail (HTTPS) » si les ports SMTP sont bloqués.'
      );
      setTestEmailMessage(null);
      return;
    }

    setTestEmailSending(true);
    setTestEmailMessage(null);
    setTestEmailError(null);
    try {
      const message = await sendAdminTestEmail(testEmailTo.trim(), {
        liveDelivery: true,
        smtpEnabled: true,
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser,
        smtpPassword: passwordForTest || undefined,
        smtpFrom: settings.smtpFrom || settings.smtpUser || settings.contactEmail,
        gmailUseApi: isGmail ? true : settings.gmailUseApi,
      });
      if (passwordForTest) {
        patchSettings({ smtpPasswordConfigured: true });
        setSmtpPasswordInput('');
      }
      setTestEmailMessage(message);
      void loadOverview();
    } catch (err) {
      const fallback = isApiTimeout(err)
        ? 'Délai dépassé — le serveur mail ne répond pas. Vérifiez hôte/port (587 = STARTTLS, 465 = SSL) et votre connexion réseau.'
        : 'Envoi du test SMTP impossible.';
      setTestEmailError(getApiErrorMessage(err, fallback));
    } finally {
      setTestEmailSending(false);
    }
  };

  const applyGmailPreset = () => {
    patchSettings({
      smtpEnabled: true,
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpUser: STUDIO_GMAIL_ADDRESS,
      smtpFrom: STUDIO_GMAIL_ADDRESS,
      gmailUseApi: true,
      smtpPasswordConfigured: false,
    });
    setSmtpPasswordInput('');
    setTestEmailTo((prev) => prev || STUDIO_GMAIL_ADDRESS);
    setTestEmailError(null);
    setTestEmailMessage(null);
  };

  const applyMailtrapPreset = () => {
    patchSettings({
      smtpEnabled: true,
      smtpHost: 'sandbox.smtp.mailtrap.io',
      smtpPort: 2525,
      smtpFrom: settings.contactEmail || 'contact@kswstudio.fr',
      smtpUser: '',
      smtpPasswordConfigured: false,
    });
    setSmtpPasswordInput('');
    setTestEmailError(null);
    setTestEmailMessage(null);
  };

  const applyMailtrapLivePreset = () => {
    patchSettings({
      smtpEnabled: true,
      smtpHost: 'live.smtp.mailtrap.io',
      smtpPort: 2525,
      smtpUser: 'api',
      smtpFrom: settings.contactEmail || 'contact@kswstudio.fr',
      smtpPasswordConfigured: false,
    });
    setSmtpPasswordInput('');
    setTestEmailError(null);
    setTestEmailMessage(null);
  };

  const backupCounts = overview?.backupPreview?.counts;

  return (
    <div className="space-y-6">
      <Card className="">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center">
              <Shield className="h-5 w-5 text-primary mr-2" /> Vue d&apos;ensemble sécurité
            </CardTitle>
            <CardDescription>
              État de l&apos;environnement, protections actives et recommandations.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadOverview()} disabled={overviewLoading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${overviewLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          {overviewError && <p className="text-danger">{overviewError}</p>}
          {overviewLoading && !overview ? (
            <p className="text-muted-foreground">Analyse en cours…</p>
          ) : overview ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-border bg-surface-muted">
                  <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Environnement</div>
                  <div className="font-bold text-foreground capitalize">{overview.environment}</div>
                  <StatusBadge ok={overview.environment === 'production'} label={overview.environment === 'production' ? 'Production' : 'Dev / local'} />
                </div>
                <div className="p-3 rounded-xl border border-border bg-surface-muted">
                  <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">HTTPS</div>
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-primary" />
                    {overview.httpsEnabled ? 'Actif' : 'Non détecté'}
                  </div>
                  <StatusBadge ok={overview.httpsEnabled} label={overview.httpsEnabled ? 'Chiffré' : 'À activer'} />
                </div>
                <div className="p-3 rounded-xl border border-border bg-surface-muted">
                  <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">JWT / Sessions</div>
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-primary" />
                    {overview.jwtConfigured ? 'Clé OK' : 'Clé par défaut'}
                  </div>
                  <StatusBadge ok={overview.jwtConfigured} label={overview.jwtConfigured ? 'Sécurisé' : 'À configurer'} />
                </div>
                <div className="p-3 rounded-xl border border-border bg-surface-muted">
                  <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Anti-bruteforce</div>
                  <div className="font-bold text-foreground">Rate limiting</div>
                  <StatusBadge ok={overview.rateLimitEnabled} label="8 essais / 15 min" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-border bg-surface-muted text-center">
                  <div className="text-lg font-black text-foreground">{overview.counts.staffUsers}</div>
                  <div className="text-[10px] text-muted-foreground">Comptes staff</div>
                </div>
                <div className="p-3 rounded-xl border border-border bg-surface-muted text-center">
                  <div className="text-lg font-black text-foreground">{overview.counts.clients}</div>
                  <div className="text-[10px] text-muted-foreground">Clients</div>
                </div>
                <div className="p-3 rounded-xl border border-border bg-surface-muted text-center">
                  <div className="text-lg font-black text-foreground">{overview.counts.privateGalleries}</div>
                  <div className="text-[10px] text-muted-foreground">Galeries privées</div>
                </div>
                <div className="p-3 rounded-xl border border-border bg-surface-muted text-center">
                  <div className="text-lg font-black text-foreground">{overview.counts.bookings}</div>
                  <div className="text-[10px] text-muted-foreground">Réservations</div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-primary/20 bg-primary-muted space-y-2">
                <div className="font-bold text-foreground flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  Recommandations
                </div>
                <ul className="space-y-1.5 text-foreground">
                  {overview.recommendations.map((tip) => (
                    <li key={tip} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card className="">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Lock className="h-5 w-5 text-primary mr-2" /> Authentification & sessions
          </CardTitle>
          <CardDescription>
            Contrôle d&apos;accès au backoffice admin, photographes et assistants.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="p-4 rounded-xl border border-border bg-surface-muted flex items-center justify-between gap-4">
            <div>
              <div className="font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Double authentification (2FA) obligatoire
              </div>
              <div className="text-muted-foreground text-[11px] mt-1">
                Code à 6 chiffres envoyé par email à chaque connexion staff (admin, photographe, assistant).
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.force2FAForAdmin}
              onChange={(e) => patchSettings({ force2FAForAdmin: e.target.checked })}
              className="h-4 w-4 rounded border-border bg-surface-muted text-primary focus:ring-ring cursor-pointer shrink-0"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-muted-foreground block mb-1 font-semibold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Durée de session staff (heures)
              </label>
              <Input
                type="number"
                min={1}
                max={168}
                value={settings.sessionLifetimeHours}
                onChange={(e) => patchSettings({ sessionLifetimeHours: Number(e.target.value) })}
                className="max-w-xs"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Appliquée aux comptes admin après enregistrement (1–168 h).</p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-surface-muted">
              <div className="font-semibold text-foreground mb-1">Protection connexion</div>
              <ul className="text-muted-foreground text-[11px] space-y-1">
                <li>• Limite : 8 tentatives login / 15 min par IP + email</li>
                <li>• Limite : 8 codes 2FA / 15 min par utilisateur</li>
                <li>• Comptes clients : validation admin si inscription</li>
              </ul>
              <Link href="/admin/users" className="inline-flex mt-3 text-primary hover:underline text-[11px] font-semibold">
                Gérer les utilisateurs →
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Mail className="h-5 w-5 text-primary mr-2" /> Emails transactionnels (SMTP)
          </CardTitle>
          <CardDescription>
            Requis pour la 2FA, les confirmations de réservation et les accès galeries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="p-4 rounded-xl border border-border bg-surface-muted flex items-center justify-between">
            <span className="text-foreground">Activer l&apos;envoi SMTP</span>
            <input
              type="checkbox"
              checked={Boolean(settings.smtpEnabled)}
              onChange={(e) => patchSettings({ smtpEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-border bg-surface-muted text-primary"
            />
          </div>
          {(settings.smtpHost?.includes('gmail.com') || settings.smtpUser?.includes('@gmail.com')) && (
            <div className="p-4 rounded-xl border border-primary/20 bg-primary-muted space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-foreground block">API Gmail (HTTPS) — ports SMTP bloqués</span>
                  <span className="text-[11px] text-muted-foreground">
                    Contourne le blocage FAI sur 587/465 via le port 443 (oauth2.googleapis.com).
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.gmailUseApi)}
                  onChange={(e) => patchSettings({ gmailUseApi: e.target.checked })}
                  className="h-4 w-4 rounded border-border bg-surface-muted text-primary shrink-0"
                />
              </div>
              {settings.gmailUseApi && (
                <div className="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-primary/10">
                  {overview?.gmailApiConfigured ? (
                    <p className="text-success flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Identifiants API détectés dans .env — prêt à envoyer.
                    </p>
                  ) : (
                    <>
                      <p className="text-primary mb-2">
                        Ajoutez dans <code className="text-primary">.env</code> puis{' '}
                        <code className="text-primary">docker compose up -d backend</code> :
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>
                          <a
                            href="https://console.cloud.google.com/apis/library/gmail.googleapis.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Activer l&apos;API Gmail
                          </a>{' '}
                          + client OAuth « Application de bureau »
                        </li>
                        <li>
                          <strong className="text-primary">Obligatoire</strong> —{' '}
                          <a
                            href="https://console.cloud.google.com/apis/credentials/consent"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Écran de consentement OAuth
                          </a>{' '}
                          → « Utilisateurs test » → ajoutez{' '}
                          <strong className="text-muted-foreground">{STUDIO_GMAIL_ADDRESS}</strong> (sinon erreur 403)
                        </li>
                        <li>
                          Script :{' '}
                          <code className="text-muted-foreground">python3 backend/scripts/gmail_oauth_setup.py</code>{' '}
                          (connectez-vous avec {STUDIO_GMAIL_ADDRESS} uniquement)
                        </li>
                        <li>
                          Copier le refresh token dans{' '}
                          <code className="text-muted-foreground">GMAIL_REFRESH_TOKEN</code> (+ CLIENT_ID, CLIENT_SECRET,
                          GMAIL_USE_API=true)
                        </li>
                      </ol>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="primary" size="sm" onClick={applyGmailPreset}>
              Gmail / Google (envoi réel)
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={applyMailtrapLivePreset}>
              Mailtrap production
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={applyMailtrapPreset}>
              Mailtrap sandbox
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-muted-foreground block mb-1">Serveur SMTP</label>
              <Input
                value={settings.smtpHost || ''}
                onChange={(e) => patchSettings({ smtpHost: e.target.value })}
                placeholder="smtp.example.com"
              />
            </div>
            <div>
              <label className="text-muted-foreground block mb-1">Port</label>
              <Input
                type="number"
                value={settings.smtpPort ?? 587}
                onChange={(e) => patchSettings({ smtpPort: Number(e.target.value) })}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Gmail : <strong className="text-muted-foreground">587</strong> (ou 465 si 587 bloqué). Mailtrap :{' '}
                <strong className="text-muted-foreground">2525</strong>.
              </p>
            </div>
            <div>
              <label className="text-muted-foreground block mb-1">Utilisateur</label>
              <Input
                value={settings.smtpUser || ''}
                onChange={(e) => patchSettings({ smtpUser: e.target.value })}
                placeholder={
                  settings.smtpHost?.includes('gmail.com')
                    ? STUDIO_GMAIL_ADDRESS
                    : settings.smtpHost?.includes('live.smtp.mailtrap.io')
                      ? 'api'
                      : settings.smtpHost?.includes('sandbox.smtp.mailtrap.io')
                        ? 'Username sandbox (ex. a1b2c3d4e5f6)'
                        : 'Identifiant SMTP'
                }
              />
            </div>
            <div>
              <label className="text-muted-foreground block mb-1">Mot de passe SMTP</label>
              <Input
                type="password"
                value={smtpPasswordInput}
                onChange={(e) => {
                  setSmtpPasswordInput(e.target.value);
                  patchSettings({ smtpPassword: e.target.value, smtpPasswordConfigured: false });
                }}
                placeholder={
                  smtpPasswordStored && !smtpPasswordInput
                    ? 'Déjà enregistré — ressaisir pour modifier'
                    : settings.smtpHost?.includes('gmail.com')
                      ? 'Mot de passe d\'application Google (16 car.)'
                      : settings.smtpHost?.includes('live.smtp.mailtrap.io')
                        ? 'Token API Mailtrap (Settings → API Tokens)'
                        : 'Obligatoire pour le premier test'
                }
                autoComplete="new-password"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {smtpPasswordStored && !smtpPasswordInput
                  ? 'Un mot de passe est déjà enregistré sur le serveur. Ressaisissez-le seulement pour le modifier.'
                  : 'Saisissez le mot de passe fourni par votre service SMTP (Mailtrap, Gmail, OVH…). Il sera enregistré lors du test.'}
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="text-muted-foreground block mb-1">Expéditeur (From)</label>
              <Input
                value={settings.smtpFrom || settings.contactEmail || ''}
                onChange={(e) => patchSettings({ smtpFrom: e.target.value })}
                placeholder="contact@kswstudio.fr"
              />
            </div>
          </div>
          <div className="p-3 rounded-xl border border-success/20 bg-success/5 text-[11px] text-muted-foreground leading-relaxed">
            <strong className="text-success">Gmail — {STUDIO_GMAIL_ADDRESS}</strong> — Cliquez « Gmail (envoi réel) »
            (compte + API HTTPS préactivés). Si vous voyez un timeout sur le port 465/587, cochez « API Gmail (HTTPS) »
            et configurez les variables <code className="text-primary">GMAIL_*</code> dans .env. Sinon : mot de passe
            d&apos;application via{' '}
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Google
            </a>{' '}
            (2FA requise).
          </div>
          <div className="p-3 rounded-xl border border-border bg-surface-muted text-[11px] text-muted-foreground leading-relaxed">
            <strong className="text-muted-foreground">Mailtrap</strong> — sandbox = tests sans livraison ; production = domaine
            vérifié + token API.
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1">
              <label className="text-muted-foreground block mb-1">Email de test</label>
              <Input
                value={testEmailTo}
                onChange={(e) => setTestEmailTo(e.target.value)}
                placeholder="admin@kswstudio.fr"
              />
            </div>
            <Button type="button" variant="outline" size="sm" disabled={testEmailSending || !testEmailTo.trim()} onClick={() => void handleTestEmail()}>
              {testEmailSending ? 'Envoi…' : 'Envoyer un test'}
            </Button>
          </div>
          {testEmailMessage && <p className="text-success text-[11px]">{testEmailMessage}</p>}
          {testEmailError && <p className="text-danger text-[11px]">{testEmailError}</p>}
          {overview && (
            <p className="text-[11px] text-muted-foreground">
              Statut SMTP détecté :{' '}
              <span className={overview.smtpConfigured ? 'text-success' : 'text-primary'}>
                {overview.smtpConfigured ? 'Configuré' : 'Incomplet — vérifiez hôte, identifiants et activation'}
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <ScrollText className="h-5 w-5 text-primary mr-2" /> Journal d&apos;audit
          </CardTitle>
          <CardDescription>
            Historique des actions admin, connexions API et événements sensibles.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <p className="text-muted-foreground text-[11px]">
            Consultez les logs détaillés (réservations, paiements, exports, modifications galeries…).
          </p>
          <Link href="/admin/logs">
            <Button type="button" variant="outline" size="sm">
              Ouvrir le journal →
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card className="">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Database className="h-5 w-5 text-primary mr-2" /> Sauvegardes
          </CardTitle>
          <CardDescription>
            Export JSON complet de la base applicative (secrets masqués) et restauration depuis un fichier exporté.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          {backupCounts && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(backupCounts).map(([key, count]) => (
                <div key={key} className="px-3 py-2 rounded-lg border border-border bg-surface-muted">
                  <div className="text-foreground font-bold">{count}</div>
                  <div className="text-[10px] text-muted-foreground capitalize">{key}</div>
                </div>
              ))}
            </div>
          )}

          <div className="p-4 rounded-xl border border-border bg-surface-muted space-y-2">
            <div className="font-semibold text-foreground">Contenu de l&apos;export</div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Paramètres studio, réservations, messages contact, galeries (clés d&apos;accès incluses), prestations,
              témoignages, blog, FAQ, utilisateurs (sans mots de passe). Clés Stripe et SMTP masquées à l&apos;export —
              elles ne sont pas écrasées lors d&apos;une restauration si marquées [redacted].
            </p>
            {lastBackupLabel ? (
              <p className="text-primary text-[11px]">Dernière sauvegarde locale : {lastBackupLabel}</p>
            ) : (
              <p className="text-muted-foreground text-[11px]">Aucune sauvegarde téléchargée depuis ce navigateur.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => void handleTriggerBackup()}
              disabled={backupTriggered || restoreTriggered}
              className="space-x-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{backupTriggered ? 'Export en cours…' : 'Télécharger la sauvegarde JSON'}</span>
            </Button>

            <input
              ref={restoreFileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => void handleRestoreBackupFile(event)}
              disabled={restoreTriggered}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={restoreTriggered || backupTriggered}
              onClick={() => restoreFileInputRef.current?.click()}
              className="space-x-1.5 border-primary/30 text-primary hover:bg-primary-muted"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{restoreTriggered ? 'Restauration…' : 'Restaurer une sauvegarde JSON'}</span>
            </Button>
          </div>
          {backupError && <p className="text-xs text-destructive">{backupError}</p>}
          {restoreError && <p className="text-xs text-destructive">{restoreError}</p>}
          {restoreSuccess && (
            <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-success text-xs flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-success" />
              <span>{restoreSuccess}</span>
            </div>
          )}

          <div className="p-4 rounded-xl border border-dashed border-border bg-surface-muted space-y-1">
            <div className="font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              Sauvegarde serveur complète (PostgreSQL + médias)
            </div>
            <p className="text-muted-foreground text-[11px]">
              Pour un dump SQL et les fichiers uploadés, exécutez sur le serveur :{' '}
              <code className="text-muted-foreground">./scripts/backup.sh</code> (voir DEPLOYMENT.md).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-danger/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center text-danger">
            <Sparkles className="h-5 w-5 text-danger mr-2" /> Zone sensible
          </CardTitle>
          <CardDescription>
            Opération destructive — à utiliser uniquement en migration ou récupération d&apos;urgence.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="font-bold text-foreground">Imposer les données locales sur le serveur</div>
              <div className="text-muted-foreground text-[11px] mt-1">
                Remplace le contenu distant par la version stockée dans ce navigateur (localStorage).
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSyncLocal}
              className="space-x-1.5 border-danger/30 text-danger hover:bg-danger/10 shrink-0"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Imposer mes données locales</span>
            </Button>
          </div>
          {syncStatus && (
            <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 text-primary text-xs flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              <span>{syncStatus}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
