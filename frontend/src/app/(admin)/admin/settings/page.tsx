'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  CreditCard,
  Shield,
  Save,
  CheckCircle2,
  Image as ImageIcon,
  Key,
  Database,
  Lock,
  Globe,
  Mail,
  Phone,
  Clock,
  Sliders,
  DollarSign,
  Download,
  Sparkles,
  Plug,
  ExternalLink,
  Copy,
  Activity,
  Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/context/settings-context';
import { StudioLogo } from '@/components/brand/studio-logo';
import apiClient from '@/lib/api-client';
import { buildWatermarkLabel } from '@/lib/watermark-text';
import { downloadAdminBackup } from '@/lib/admin-search';
import { getApiErrorMessage } from '@/lib/api-error';
import { ThemeSwitcher } from '@/components/theme/theme-switcher';
import { useTheme } from '@/components/providers/theme-provider';
import { THEME_MODE_LABELS } from '@/lib/theme';

export default function AdminSettingsPage() {
  const { settings: globalSettings, updateSettings } = useSettings();
  const { mode: themeMode } = useTheme();

  const [activeTab, setActiveTab] = useState<'appearance' | 'general' | 'booking' | 'payments' | 'watermark' | 'security' | 'integrations'>('general');
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [backupTriggered, setBackupTriggered] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [settings, setSettings] = useState(globalSettings);

  const patchSettings = (patch: Partial<typeof globalSettings>) => {
    setIsDirty(true);
    setSaveError(null);
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  useEffect(() => {
    if (!isDirty && globalSettings && Object.keys(globalSettings).length > 0) {
      setSettings(globalSettings);
    }
  }, [globalSettings, isDirty]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    try {
      await updateSettings(settings);
      setIsDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Impossible de sauvegarder les paramètres.';
      setSaveError(message);
      console.error('Erreur enregistrement paramètres:', err);
    }
  };

  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('/api/v1/webhooks/stripe');

  useEffect(() => {
    setWebhookUrl(`${window.location.origin}/api/v1/webhooks/stripe`);
  }, []);

  const stripeDashboardUrl = settings.stripeTestMode
    ? 'https://dashboard.stripe.com/test/dashboard'
    : 'https://dashboard.stripe.com/dashboard';
  const stripeWebhooksUrl = settings.stripeTestMode
    ? 'https://dashboard.stripe.com/test/webhooks'
    : 'https://dashboard.stripe.com/webhooks';
  const backendDocsUrl = process.env.NEXT_PUBLIC_BACKEND_DOCS_URL || 'http://localhost:8050/docs';

  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setWebhookCopied(true);
      setTimeout(() => setWebhookCopied(false), 2500);
    } catch {
      setWebhookCopied(false);
    }
  };

  const handleSyncLocalToDatabase = async () => {
    setSyncStatus('Synchronisation en cours...');
    try {
      const storedSettings = localStorage.getItem('studio_settings');
      const storedServices = localStorage.getItem('studio_services');
      const storedGalleries = localStorage.getItem('studio_galleries');

      const payload = {
        settings: storedSettings ? JSON.parse(storedSettings) : globalSettings,
        services: storedServices ? JSON.parse(storedServices) : undefined,
        galleries: storedGalleries ? JSON.parse(storedGalleries) : undefined,
      };

      const res = await apiClient.post('/admin/sync-from-local', payload);
      if (res.data && res.data.status === 'success') {
        setSyncStatus('Succès : Toutes les données publiques ont été réinitialisées et remplacées par votre contenu local !');
      } else {
        setSyncStatus('Synchronisation terminée.');
      }
    } catch (e: any) {
      setSyncStatus(`Erreur de synchronisation : ${e.message || e}`);
    }
  };

  const handleTriggerBackup = async () => {
    setBackupTriggered(true);
    setBackupError(null);
    try {
      await downloadAdminBackup();
    } catch (e) {
      setBackupError(getApiErrorMessage(e, 'Échec de l\'export de sauvegarde.'));
    } finally {
      setBackupTriggered(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">
            Paramètres & <span className="gold-gradient-text">Configuration Système</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Gérer les termes du titre bicolore, coordonnées, taux d'acompte, clés Stripe/PayPal et filigranes.
          </p>
        </div>

        {saved && (
          <Badge variant="success" className="px-3.5 py-2 text-xs font-bold animate-in fade-in shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Modifications Prises en Compte dans Tout le Système !
          </Badge>
        )}
        {saveError && (
          <Badge variant="warning" className="px-3.5 py-2 text-xs font-bold">
            {saveError}
          </Badge>
        )}
        {isDirty && !saved && (
          <Badge variant="outline" className="px-3.5 py-2 text-xs font-bold border-amber-400/50 text-amber-300">
            Modifications non enregistrées
          </Badge>
        )}
      </div>

      {/* Live Logo Preview Widget */}
      <div className="glass-panel p-6 rounded-2xl border-amber-400/40 gold-border-glow flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <Badge variant="gold" className="text-[10px]">Aperçu en Temps Réel du Logo du Site</Badge>
          <div className="text-xs text-zinc-400">Voici le rendu bicolore du titre tel qu'il apparaît sur tout le site :</div>
        </div>

        <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
          <StudioLogo size="md" />
        </div>
      </div>

      {/* Sub-Tabs Navigation Bar */}
      <div className="flex items-center space-x-2 border-b border-zinc-800 pb-2 overflow-x-auto">
        {[
          { id: 'appearance', label: 'Apparence', icon: Sun },
          { id: 'general', label: '1. Titre & Infos Studio', icon: Settings },
          { id: 'booking', label: '2. Réservation & Acomptes', icon: Clock },
          { id: 'payments', label: '3. Clés Stripe & PayPal', icon: CreditCard },
          { id: 'integrations', label: '4. Intégrations', icon: Plug },
          { id: 'watermark', label: '5. Filigrane Photo', icon: ImageIcon },
          { id: 'security', label: '6. Sécurité & Backup', icon: Shield },
        ].map((tab) => {
          const IconComp = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/20'
                  : 'text-zinc-400 hover:text-white glass-panel'
              }`}
            >
              <IconComp className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'appearance' && (
        <Card className="glass-panel space-y-4">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Sun className="h-5 w-5 text-amber-400 mr-2" /> Apparence de l&apos;interface
            </CardTitle>
            <CardDescription>
              Préférence personnelle enregistrée dans ce navigateur. Mode actuel :{' '}
              <span className="text-amber-400 font-semibold">{THEME_MODE_LABELS[themeMode]}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeSwitcher />
          </CardContent>
        </Card>
      )}

      {/* Master Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Tab 1: General Studio Info & Dual-Color Title Customization */}
        {activeTab === 'general' && (
          <Card className="glass-panel space-y-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Settings className="h-5 w-5 text-amber-400 mr-2" /> Titre Bicolore du Site & Coordonnées
              </CardTitle>
              <CardDescription>
                Personnalisez chaque mot du titre du site (Mot Blanc + Mot Or) et le sous-titre.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-xs">
              {/* Browser Tab Title Customization Field */}
              <div className="p-4 rounded-xl border border-amber-400/40 bg-amber-400/10 space-y-2">
                <label className="text-zinc-200 block font-semibold flex items-center text-sm">
                  <Globe className="h-4 w-4 text-amber-400 mr-2" />
                  Titre du Site dans l'Onglet du Navigateur (HTML & SEO Title) *
                </label>
                <Input
                  value={settings.siteTitle || ''}
                  placeholder="STUDIO LUMIÈRE - Photographie d'Art & Studio Photo d'Exception"
                  onChange={(e) => patchSettings({siteTitle: e.target.value })}
                  className="bg-zinc-950 text-white font-medium"
                />
                <p className="text-[11px] text-zinc-400">
                  Ce titre s'affichera directement dans l'onglet de votre navigateur web et sur les moteurs de recherche.
                </p>
              </div>

              {/* Dual-Color Title Customization Fields */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-4">
                <div className="font-bold text-white flex items-center text-sm">
                  <Sparkles className="h-4 w-4 mr-1.5 text-amber-400" /> Personnalisation des Termes du Titre Bicolore
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-zinc-300 block mb-1 font-semibold">
                      Titre - 1ère Partie <span className="text-white font-bold">(Mot Blanc)</span>
                    </label>
                    <Input
                      value={settings.studioNameFirstPart || ''}
                      placeholder="STUDIO"
                      onChange={(e) => patchSettings({studioNameFirstPart: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-zinc-300 block mb-1 font-semibold">
                      Titre - 2ème Partie <span className="text-amber-400 font-bold">(Mot Doré)</span>
                    </label>
                    <Input
                      value={settings.studioNameSecondPart || ''}
                      placeholder="LUMIÈRE"
                      onChange={(e) => patchSettings({studioNameSecondPart: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-zinc-300 block mb-1 font-semibold">
                      Sous-Titre <span className="text-zinc-400 font-bold">(Slogan Gris)</span>
                    </label>
                    <Input
                      value={settings.studioSubtitle || ''}
                      placeholder="HAUTE PHOTOGRAPHIE"
                      onChange={(e) => patchSettings({studioSubtitle: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Description footer (texte sous le logo) */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-2">
                <label className="text-zinc-200 block font-semibold flex items-center text-sm">
                  <Globe className="h-4 w-4 text-amber-400 mr-2" />
                  Description du Studio (Pied de page)
                </label>
                <textarea
                  value={settings.studioDescription || ''}
                  onChange={(e) => patchSettings({ studioDescription: e.target.value })}
                  rows={4}
                  placeholder="Présentation courte du studio affichée dans le footer du site..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/60 resize-y min-h-[96px]"
                />
                <p className="text-[11px] text-zinc-500">
                  {(settings.studioDescription || '').length} caractères — visible sur toutes les pages publiques.
                </p>
                <div className="mt-3 p-3 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono block mb-1.5">Aperçu footer</span>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {settings.studioDescription || 'Votre description apparaîtra ici…'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">Adresse Email Officielle</label>
                  <Input
                    value={settings.contactEmail || ''}
                    onChange={(e) => patchSettings({contactEmail: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">Téléphone de Contact</label>
                  <Input
                    value={settings.phone || ''}
                    onChange={(e) => patchSettings({phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-semibold">Adresse du Studio Photo</label>
                <Input
                  value={settings.address || ''}
                  onChange={(e) => patchSettings({address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">Devise Officielle</label>
                  <Input
                    value={settings.currency || ''}
                    onChange={(e) => patchSettings({currency: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">Fuseau Horaire</label>
                  <Input
                    value={settings.timezone || ''}
                    onChange={(e) => patchSettings({timezone: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 2: Booking & Deposit Settings */}
        {activeTab === 'booking' && (
          <Card className="glass-panel space-y-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Clock className="h-5 w-5 text-amber-400 mr-2" /> Règles de Réservation & Acomptes
              </CardTitle>
              <CardDescription>
                Pourcentage d'acompte exigé lors de la réservation en ligne et délais.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">Taux d'Acompte Exigé (%)</label>
                  <Input
                    type="number"
                    value={settings.depositRate}
                    onChange={(e) => patchSettings({depositRate: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">Préavis d'Annulation Sans Frais (Jours)</label>
                  <Input
                    type="number"
                    value={settings.cancellationNoticeDays}
                    onChange={(e) => patchSettings({cancellationNoticeDays: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Validation Automatique des Séances</div>
                  <div className="text-zinc-400 text-[11px]">Confirme immédiatement le créneau dès réception de l'acompte.</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoApproveBookings}
                  onChange={(e) => patchSettings({autoApproveBookings: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-amber-400 focus:ring-amber-400 cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 3: Payments & Stripe / PayPal Credentials */}
        {activeTab === 'payments' && (
          <Card className="glass-panel space-y-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <CreditCard className="h-5 w-5 text-amber-400 mr-2" /> Passerelles Stripe & PayPal
              </CardTitle>
              <CardDescription>
                Configuration des clés API de paiement sécurisé pour cartes et PayPal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Mode Test Stripe (Sandbox)</div>
                  <div className="text-zinc-400 text-[11px]">Permet de simuler des paiements par carte sans débit réel.</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.stripeTestMode}
                  onChange={(e) => patchSettings({stripeTestMode: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-amber-400 focus:ring-amber-400 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-semibold">Clé Publique Stripe (Publishable Key)</label>
                <Input
                  value={settings.stripePublicKey}
                  onChange={(e) => patchSettings({stripePublicKey: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-semibold">Clé Secrète Stripe (Secret Key)</label>
                <Input
                  type="password"
                  value={settings.stripeSecretKey}
                  onChange={(e) => patchSettings({stripeSecretKey: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-semibold">Secret Webhook Stripe</label>
                <Input
                  type="password"
                  value={settings.stripeWebhookSecret}
                  onChange={(e) => patchSettings({stripeWebhookSecret: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Activer le Règlement par PayPal</div>
                  <div className="text-zinc-400 text-[11px]">Proposer l'option d'acompte via compte PayPal.</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.payPalEnabled}
                  onChange={(e) => patchSettings({payPalEnabled: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-amber-400 focus:ring-amber-400 cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 4: Integrations & external dashboards */}
        {activeTab === 'integrations' && (
          <Card className="glass-panel space-y-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Plug className="h-5 w-5 text-amber-400 mr-2" /> Intégrations & tableaux de bord
              </CardTitle>
              <CardDescription>
                Accès rapide aux services externes, URL webhook Stripe et documentation API backend.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid sm:grid-cols-2 gap-3">
                <a
                  href={stripeDashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-amber-400/40 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-amber-400" />
                      Stripe Dashboard
                    </div>
                    <div className="text-zinc-400 text-[11px] mt-1">
                      Mode {settings.stripeTestMode ? 'test (sandbox)' : 'production (live)'}
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-zinc-500 group-hover:text-amber-400" />
                </a>

                <a
                  href={stripeWebhooksUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-amber-400/40 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-white">Webhooks Stripe</div>
                    <div className="text-zinc-400 text-[11px] mt-1">Configurer checkout.session.completed</div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-zinc-500 group-hover:text-amber-400" />
                </a>

                <a
                  href="https://www.paypal.com/businessmanage/account/home"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-amber-400/40 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-white">PayPal Business</div>
                    <div className="text-zinc-400 text-[11px] mt-1">Gestion du compte marchand PayPal</div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-zinc-500 group-hover:text-amber-400" />
                </a>

                <a
                  href="/api/v1/health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-amber-400/40 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <Activity className="h-4 w-4 text-emerald-400" />
                      Santé API
                    </div>
                    <div className="text-zinc-400 text-[11px] mt-1">GET /api/v1/health</div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-zinc-500 group-hover:text-amber-400" />
                </a>
              </div>

              <div className="p-4 rounded-xl border border-amber-400/30 bg-amber-400/5 space-y-2">
                <div className="font-bold text-white">URL webhook Stripe (à coller dans le dashboard)</div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-amber-200 font-mono text-[11px] break-all">
                    {webhookUrl}
                  </code>
                  <Button type="button" variant="outline" size="sm" onClick={copyWebhookUrl} className="shrink-0 space-x-1.5">
                    <Copy className="h-3.5 w-3.5" />
                    <span>{webhookCopied ? 'Copié !' : 'Copier'}</span>
                  </Button>
                </div>
                <p className="text-zinc-500 text-[11px]">
                  Événement recommandé : <code className="text-zinc-400">checkout.session.completed</code>. Secret dans{' '}
                  <code className="text-zinc-400">STRIPE_WEBHOOK_SECRET</code>.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-2">
                <div className="font-bold text-white">Documentation OpenAPI (backend FastAPI)</div>
                <p className="text-zinc-400 text-[11px]">
                  Swagger UI sur le serveur Python — en local :{' '}
                  <a href={backendDocsUrl} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                    {backendDocsUrl}
                  </a>
                </p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950">
                <div className="font-bold text-white">SMS / WhatsApp</div>
                <p className="text-zinc-400 text-[11px] mt-1">
                  Non configurés pour l&apos;instant. Les notifications admin restent en journal interne + email SMTP.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 5: Watermark & Media Settings */}
        {activeTab === 'watermark' && (
          <Card className="glass-panel space-y-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <ImageIcon className="h-5 w-5 text-amber-400 mr-2" /> Filigrane & Compression WebP
              </CardTitle>
              <CardDescription>
                Protection des épreuves de prévisualisation web contre la copie.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1 font-semibold">Texte du filigrane</label>
                <Input
                  value={settings.watermarkText}
                  onChange={(e) => patchSettings({ watermarkText: e.target.value })}
                  placeholder="Épreuve sécurisée"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Le nom du studio ({settings.studioNameFirstPart} {settings.studioNameSecondPart}) est ajouté automatiquement.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 flex flex-col items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Aperçu filigrane</span>
                <div
                  className="text-[10px] font-mono tracking-widest text-white uppercase bg-black/50 px-3 py-1.5 rounded-full"
                  style={{ opacity: Math.max(0.2, Math.min(1, (settings.watermarkOpacity || 40) / 100)) }}
                >
                  {buildWatermarkLabel(settings)}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">Position du Filigrane</label>
                  <select
                    value={settings.watermarkPosition}
                    onChange={(e) => patchSettings({ watermarkPosition: e.target.value })}
                    className="w-full h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100"
                  >
                    <option value="bottom_center">En Bas au Centre</option>
                    <option value="bottom_right">En Bas à Droite</option>
                    <option value="center">Au Centre</option>
                    <option value="diagonal">Répétition Diagonale</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">Opacité (%)</label>
                  <Input
                    type="number"
                    value={settings.watermarkOpacity}
                    onChange={(e) => patchSettings({watermarkOpacity: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">Qualité WebP (%)</label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={settings.webpQuality}
                    onChange={(e) => patchSettings({webpQuality: Number(e.target.value) })}
                  />
                </div>
              </div>
              <p className="text-[11px] text-zinc-500 border-t border-zinc-800 pt-3">
                Appliqué automatiquement à chaque téléversement (galeries, prestations, blog). Les images sont converties en WebP avec filigrane.
                Re-téléversez les photos déjà en ligne pour appliquer de nouveaux réglages.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tab 6: Security & Backup Trigger */}
        {activeTab === 'security' && (
          <Card className="glass-panel space-y-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Shield className="h-5 w-5 text-amber-400 mr-2" /> Sécurité & Sauvegardes
              </CardTitle>
              <CardDescription>
                Exigence de double authentification et déclenchement de sauvegarde PostgreSQL.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Double Authentification (2FA) Obligatoire</div>
                  <div className="text-zinc-400 text-[11px]">Exige un code SMS/TOTP à 6 chiffres pour accéder au backoffice admin.</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.force2FAForAdmin}
                  onChange={(e) => patchSettings({force2FAForAdmin: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-amber-400 focus:ring-amber-400 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-semibold">Durée de Session Admin (Heures)</label>
                <Input
                  type="number"
                  value={settings.sessionLifetimeHours}
                  onChange={(e) => patchSettings({sessionLifetimeHours: Number(e.target.value) })}
                  className="w-32"
                />
              </div>

              <div className="pt-4 border-t border-zinc-800 space-y-4">
                <div className="font-bold text-white flex items-center">
                  <Mail className="h-4 w-4 mr-1.5 text-amber-400" /> Emails transactionnels (SMTP)
                </div>
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-between">
                  <span className="text-zinc-300">Activer l&apos;envoi SMTP</span>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.smtpEnabled)}
                    onChange={(e) => patchSettings({ smtpEnabled: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-amber-400"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-400 block mb-1">Serveur SMTP</label>
                    <Input
                      value={settings.smtpHost || ''}
                      onChange={(e) => patchSettings({ smtpHost: e.target.value })}
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Port</label>
                    <Input
                      type="number"
                      value={settings.smtpPort ?? 587}
                      onChange={(e) => patchSettings({ smtpPort: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Utilisateur</label>
                    <Input
                      value={settings.smtpUser || ''}
                      onChange={(e) => patchSettings({ smtpUser: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Mot de passe SMTP</label>
                    <Input
                      type="password"
                      value={settings.smtpPassword || ''}
                      onChange={(e) => patchSettings({ smtpPassword: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-zinc-400 block mb-1">Expéditeur (From)</label>
                    <Input
                      value={settings.smtpFrom || settings.contactEmail || ''}
                      onChange={(e) => patchSettings({ smtpFrom: e.target.value })}
                      placeholder="contact@kswstudio.fr"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white flex items-center">
                    <Database className="h-4 w-4 mr-1.5 text-amber-400" /> Backup PostgreSQL 17 Immédiat
                  </div>
                  <div className="text-zinc-400 text-[11px]">Export JSON : paramètres, réservations, contacts, blog et galeries (secrets masqués).</div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTriggerBackup}
                  disabled={backupTriggered}
                  className="space-x-1.5 border-zinc-800"
                >
                  <Download className="h-3.5 w-3.5 text-amber-400" />
                  <span>{backupTriggered ? 'Exportation en cours...' : 'Lancer une Sauvegarde'}</span>
                </Button>
              </div>
              {backupError && (
                <p className="text-xs text-red-400">{backupError}</p>
              )}

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white flex items-center">
                    <Sparkles className="h-4 w-4 mr-1.5 text-amber-400" /> Effacer BDD Publique & Imposer mes Données Locales
                  </div>
                  <div className="text-zinc-400 text-[11px]">Efface le contenu distant et le remplace par la version exacte affichée sur votre navigateur local.</div>
                </div>

                <Button
                  type="button"
                  variant="gold"
                  size="sm"
                  onClick={handleSyncLocalToDatabase}
                  className="space-x-1.5 font-bold shadow-md shadow-amber-400/20 shrink-0"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Imposer mes Données Locales</span>
                </Button>
              </div>

              {syncStatus && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>{syncStatus}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab !== 'appearance' && (
        <div className="sticky bottom-0 -mx-2 px-2 py-4 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800 flex justify-end z-10">
          <Button type="submit" variant="gold" size="lg" className="px-8 space-x-2 font-bold shadow-lg shadow-amber-400/20">
            <Save className="h-4 w-4" />
            <span>Enregistrer la configuration</span>
          </Button>
        </div>
        )}
      </form>
    </div>
  );
}
