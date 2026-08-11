'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Settings,
  CreditCard,
  Shield,
  Save,
  CheckCircle2,
  Image as ImageIcon,
  Key,
  Globe,
  Phone,
  Clock,
  Sliders,
  DollarSign,
  Sparkles,
  Plug,
  ExternalLink,
  Copy,
  Activity,
  Sun,
  Home,
  Share2,
  Scale,
  MapPin,
  Clapperboard,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/context/settings-context';
import { StudioLogo } from '@/components/brand/studio-logo';
import apiClient from '@/lib/api-client';
import { buildWatermarkLabel, resolveWatermarkLogoUrl, watermarkPositionClass, WATERMARK_POSITION_OPTIONS } from '@/lib/watermark-text';
import { getApiErrorMessage } from '@/lib/api-error';
import { CURRENCY_OPTIONS, resolveStudioCurrency } from '@/lib/currency';
import { resolveInvoiceLogoUrl } from '@/lib/invoice-studio-info';
import { mergeSocialLinks, SOCIAL_NETWORK_META, type SocialNetworkId } from '@/lib/social-links';
import { SocialLinksRow } from '@/components/common/social-links-row';
import { geocodeStudioAddress, resolveStudioMap, type StudioMapCoords } from '@/lib/studio-map-utils';
import type { MapPersistStatus } from '@/components/admin/studio-map-picker';
import { ThemeSwitcher } from '@/components/theme/theme-switcher';
import { useTheme } from '@/components/providers/theme-provider';
import { THEME_MODE_LABELS } from '@/lib/theme';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminStickyActions } from '@/components/admin/admin-sticky-actions';

const StudioMapPicker = dynamic(
  () => import('@/components/admin/studio-map-picker').then((m) => ({ default: m.StudioMapPicker })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-xl bg-zinc-900/40" /> }
);
const HomePageSettingsFields = dynamic(
  () =>
    import('@/components/admin/home-page-settings-fields').then((m) => ({
      default: m.HomePageSettingsFields,
    })),
  { loading: () => <div className="h-40 animate-pulse rounded-xl bg-zinc-900/40" /> }
);
const PortfolioSettingsFields = dynamic(
  () =>
    import('@/components/admin/portfolio-settings-fields').then((m) => ({
      default: m.PortfolioSettingsFields,
    })),
  { loading: () => <div className="h-40 animate-pulse rounded-xl bg-zinc-900/40" /> }
);
const PrestationsSettingsFields = dynamic(
  () =>
    import('@/components/admin/prestations-settings-fields').then((m) => ({
      default: m.PrestationsSettingsFields,
    })),
  { loading: () => <div className="h-40 animate-pulse rounded-xl bg-zinc-900/40" /> }
);
const LegalPagesSettingsFields = dynamic(
  () =>
    import('@/components/admin/legal-pages-settings-fields').then((m) => ({
      default: m.LegalPagesSettingsFields,
    })),
  { loading: () => <div className="h-40 animate-pulse rounded-xl bg-zinc-900/40" /> }
);
const SecuritySettingsFields = dynamic(
  () =>
    import('@/components/admin/security-settings-fields').then((m) => ({
      default: m.SecuritySettingsFields,
    })),
  { loading: () => <div className="h-32 animate-pulse rounded-xl bg-zinc-900/40" /> }
);

type SettingsTabId =
  | 'appearance'
  | 'home'
  | 'portfolio'
  | 'prestations'
  | 'legal'
  | 'general'
  | 'booking'
  | 'payments'
  | 'watermark'
  | 'security'
  | 'integrations';

export default function AdminSettingsPage() {
  const { settings: globalSettings, updateSettings } = useSettings();
  const { mode: themeMode } = useTheme();

  const [activeTab, setActiveTab] = useState<SettingsTabId>('general');
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [watermarkLogoUploading, setWatermarkLogoUploading] = useState(false);
  const [watermarkLogoUploadError, setWatermarkLogoUploadError] = useState<string | null>(null);
  const watermarkLogoFileInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState(globalSettings);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  const [geocodingMap, setGeocodingMap] = useState(false);
  const [mapPersistStatus, setMapPersistStatus] = useState<MapPersistStatus>('idle');
  const studioMap = resolveStudioMap(settings);

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
      setSaveError(getApiErrorMessage(err, 'Impossible de sauvegarder les paramètres. Reconnectez-vous via ngrok si la session a expiré.'));
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

  const handleInvoiceLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoUploadError('Veuillez sélectionner une image (PNG, JPG, WebP…).');
      return;
    }

    setLogoUploading(true);
    setLogoUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/upload?skip_watermark=1', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.url as string | undefined;
      if (!url) {
        throw new Error('Réponse upload invalide.');
      }
      patchSettings({ invoiceLogoUrl: url, showLogoOnInvoice: true });
    } catch (err: unknown) {
      setLogoUploadError(getApiErrorMessage(err, 'Impossible de téléverser le logo.'));
    } finally {
      setLogoUploading(false);
    }
  };

  const handleWatermarkLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setWatermarkLogoUploadError('Veuillez sélectionner une image (PNG avec transparence recommandé).');
      return;
    }

    setWatermarkLogoUploading(true);
    setWatermarkLogoUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/upload?skip_watermark=1', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.url as string | undefined;
      if (!url) {
        throw new Error('Réponse upload invalide.');
      }
      patchSettings({ watermarkLogoUrl: url, watermarkLogoEnabled: true });
    } catch (err: unknown) {
      setWatermarkLogoUploadError(getApiErrorMessage(err, 'Impossible de téléverser le logo filigrane.'));
    } finally {
      setWatermarkLogoUploading(false);
    }
  };

  const invoiceLogoPreview = resolveInvoiceLogoUrl(settings.invoiceLogoUrl);
  const watermarkLogoPreview = resolveWatermarkLogoUrl(settings);
  const socialLinks = mergeSocialLinks(settings);

  const patchSocialLink = (id: SocialNetworkId, url: string) => {
    patchSettings({
      socialLinks: {
        ...socialLinks,
        [id]: url,
      },
    });
  };

  const handleGeocodeStudioMap = async () => {
    setGeocodingMap(true);
    try {
      const coords = await geocodeStudioAddress(settings.address || '');
      if (!coords) {
        setSaveError('Adresse introuvable pour le géocodage. Placez le marqueur manuellement sur la carte.');
        return;
      }
      patchSettings({
        studioMapLat: coords.lat,
        studioMapLng: coords.lng,
        studioMapZoom: coords.zoom,
      });
      await persistStudioMapCoords(coords);
    } finally {
      setGeocodingMap(false);
    }
  };

  const persistStudioMapCoords = async (coords: StudioMapCoords) => {
    setMapPersistStatus('saving');
    setSaveError(null);
    const payload = {
      ...settingsRef.current,
      studioMapLat: coords.lat,
      studioMapLng: coords.lng,
      studioMapZoom: coords.zoom,
    };
    try {
      await updateSettings(payload);
      setIsDirty(false);
      setMapPersistStatus('saved');
      setTimeout(() => setMapPersistStatus('idle'), 3000);
    } catch (err: unknown) {
      setMapPersistStatus('error');
      setSaveError(getApiErrorMessage(err, 'Impossible d\'enregistrer le point sur la carte. Reconnectez-vous si vous utilisez ngrok.'));
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
    } catch (e: unknown) {
      setSyncStatus(`Erreur de synchronisation : ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <AdminPageHeader
        title="Paramètres &"
        accent="Configuration Système"
        description="Gérer les termes du titre bicolore, coordonnées, taux d'acompte, clés Stripe/PayPal et filigranes."
        badges={
          <>
            {saved && (
              <Badge variant="success" className="px-3.5 py-2 text-xs font-bold animate-in fade-in shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Modifications prises en compte !
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
          </>
        }
      />

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
          { id: 'home', label: 'Page d\'accueil', icon: Home },
          { id: 'portfolio', label: 'Portfolio & Vidéos', icon: Clapperboard },
          { id: 'prestations', label: 'Page Prestations', icon: Package },
          { id: 'legal', label: 'Mentions & RGPD', icon: Scale },
          { id: 'general', label: '1. Titre & Infos Studio', icon: Settings },
          { id: 'booking', label: '2. Réservation & Acomptes', icon: Clock },
          { id: 'payments', label: '3. Clés Stripe & PayPal', icon: CreditCard },
          { id: 'integrations', label: '4. Intégrations', icon: Plug },
          { id: 'watermark', label: '5. Filigrane Photo', icon: ImageIcon },
          { id: 'security', label: '6. Sécurité & Sauvegardes', icon: Shield },
        ].map((tab) => {
          const IconComp = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTabId)}
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

      {activeTab === 'home' && (
        <form onSubmit={handleSave} className="space-y-6">
          <HomePageSettingsFields
            settings={settings}
            onChange={(homePageContent) => patchSettings({ homePageContent })}
          />
          <AdminStickyActions>
            <Button type="submit" variant="gold" size="lg" className="w-full sm:w-auto px-6 sm:px-8 space-x-2 font-bold shadow-lg shadow-amber-400/20">
              <Save className="h-4 w-4" />
              <span>Enregistrer la page d&apos;accueil</span>
            </Button>
          </AdminStickyActions>
        </form>
      )}

      {activeTab === 'portfolio' && (
        <form onSubmit={handleSave} className="space-y-6">
          <PortfolioSettingsFields
            settings={settings}
            onChange={(portfolioContent) => patchSettings({ portfolioContent })}
          />
          <AdminStickyActions>
            <Button type="submit" variant="gold" size="lg" className="w-full sm:w-auto px-6 sm:px-8 space-x-2 font-bold shadow-lg shadow-amber-400/20">
              <Save className="h-4 w-4" />
              <span>Enregistrer le portfolio & la vidéothèque</span>
            </Button>
          </AdminStickyActions>
        </form>
      )}

      {activeTab === 'prestations' && (
        <form onSubmit={handleSave} className="space-y-6">
          <PrestationsSettingsFields
            settings={settings}
            onChange={(prestationsContent) => patchSettings({ prestationsContent })}
          />
          <AdminStickyActions>
            <Button type="submit" variant="gold" size="lg" className="w-full sm:w-auto px-6 sm:px-8 space-x-2 font-bold shadow-lg shadow-amber-400/20">
              <Save className="h-4 w-4" />
              <span>Enregistrer la page prestations</span>
            </Button>
          </AdminStickyActions>
        </form>
      )}

      {activeTab === 'legal' && (
        <form onSubmit={handleSave} className="space-y-6">
          <LegalPagesSettingsFields
            settings={settings}
            onChange={(legalPagesContent) => patchSettings({ legalPagesContent })}
          />
          <AdminStickyActions>
            <Button type="submit" variant="gold" size="lg" className="w-full sm:w-auto px-6 sm:px-8 space-x-2 font-bold shadow-lg shadow-amber-400/20">
              <Save className="h-4 w-4" />
              <span>Enregistrer les pages légales</span>
            </Button>
          </AdminStickyActions>
        </form>
      )}

      {activeTab !== 'appearance' && activeTab !== 'home' && activeTab !== 'portfolio' && activeTab !== 'prestations' && activeTab !== 'legal' && (
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

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-4">
                <div className="font-bold text-white flex items-center text-sm">
                  <ImageIcon className="h-4 w-4 mr-1.5 text-amber-400" /> Logo sur les factures
                </div>
                <p className="text-[11px] text-zinc-500">
                  Ce logo apparaît en en-tête des factures PDF (admin et espace client).
                </p>

                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <div className="w-full sm:w-48 h-28 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/60 flex items-center justify-center overflow-hidden shrink-0">
                    {invoiceLogoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={invoiceLogoPreview}
                        alt="Logo facture"
                        className="max-h-24 max-w-full object-contain p-2"
                      />
                    ) : (
                      <span className="text-[11px] text-zinc-500 text-center px-3">Aucun logo</span>
                    )}
                  </div>

                  <div className="flex-1 space-y-3 w-full">
                    <div>
                      <label className="text-zinc-400 block mb-1 font-semibold">URL du logo (optionnel)</label>
                      <Input
                        value={settings.invoiceLogoUrl || ''}
                        onChange={(e) => patchSettings({ invoiceLogoUrl: e.target.value })}
                        placeholder="/uploads/logo.webp ou https://…"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={logoFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={handleInvoiceLogoUpload}
                        disabled={logoUploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        disabled={logoUploading}
                        onClick={() => logoFileInputRef.current?.click()}
                      >
                        {logoUploading ? 'Envoi…' : 'Téléverser une image'}
                      </Button>
                      {settings.invoiceLogoUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => patchSettings({ invoiceLogoUrl: '', showLogoOnInvoice: true })}
                        >
                          Supprimer
                        </Button>
                      )}
                    </div>
                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.showLogoOnInvoice !== false}
                        onChange={(e) => patchSettings({ showLogoOnInvoice: e.target.checked })}
                        className="rounded border-zinc-600"
                      />
                      Afficher le logo sur les factures
                    </label>
                    {logoUploadError && (
                      <p className="text-rose-400 text-[11px]">{logoUploadError}</p>
                    )}
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

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-4">
                <div>
                  <label className="text-zinc-200 block font-semibold flex items-center text-sm">
                    <Share2 className="h-4 w-4 text-amber-400 mr-2" />
                    Réseaux sociaux (footer)
                  </label>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Liens affichés sous le logo et dans la barre du bas du site. Laissez vide pour masquer un réseau.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {SOCIAL_NETWORK_META.map((network) => (
                    <div key={network.id}>
                      <label className="text-zinc-400 block mb-1 font-semibold">{network.label}</label>
                      <Input
                        value={socialLinks[network.id]}
                        onChange={(e) => patchSocialLink(network.id, e.target.value)}
                        placeholder={network.placeholder}
                      />
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono block mb-2">
                    Aperçu icônes footer
                  </span>
                  <SocialLinksRow linksOverride={socialLinks} />
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

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-4">
                <div className="font-bold text-white flex items-center text-sm">
                  <MapPin className="h-4 w-4 mr-1.5 text-amber-400" /> Carte « Contact & Conciergerie »
                </div>
                <p className="text-[11px] text-zinc-500">
                  Le point affiché sur la page Contact correspond exactement aux coordonnées sélectionnées ci-dessous.
                </p>
                <StudioMapPicker
                  value={studioMap}
                  onChange={(coords) =>
                    patchSettings({
                      studioMapLat: coords.lat,
                      studioMapLng: coords.lng,
                      studioMapZoom: coords.zoom,
                    })
                  }
                  onPersist={persistStudioMapCoords}
                  persistStatus={mapPersistStatus}
                  onGeocodeAddress={handleGeocodeStudioMap}
                  geocoding={geocodingMap}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">Devise officielle</label>
                  <select
                    value={resolveStudioCurrency(settings.currency)}
                    onChange={(e) => patchSettings({ currency: e.target.value })}
                    className="flex h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-100 focus:border-amber-400/80 focus:outline-none focus:ring-1 focus:ring-amber-400/80 transition-colors"
                  >
                    {!CURRENCY_OPTIONS.some((option) => option.value === resolveStudioCurrency(settings.currency)) && (
                      <option value={resolveStudioCurrency(settings.currency)} className="bg-zinc-950">
                        {resolveStudioCurrency(settings.currency)} (actuelle)
                      </option>
                    )}
                    {CURRENCY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-zinc-950">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Devise par défaut pour prix, réservations et factures ({resolveStudioCurrency(settings.currency)}).
                  </p>
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

              <div className="pt-2 border-t border-zinc-800 space-y-4">
                <div className="font-bold text-white text-sm">Mobile Money</div>
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">Activer le paiement Mobile Money</div>
                    <div className="text-zinc-400 text-[11px]">
                      Permet aux clients de régler l&apos;acompte par transfert (Orange Money, MTN, Wave…).
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.mobileMoneyEnabled}
                    onChange={(e) => patchSettings({ mobileMoneyEnabled: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-amber-400 focus:ring-amber-400 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">Opérateur / libellé</label>
                  <Input
                    value={settings.mobileMoneyProvider}
                    onChange={(e) => patchSettings({ mobileMoneyProvider: e.target.value })}
                    placeholder="Orange Money"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">Numéro Mobile Money à créditer</label>
                  <Input
                    value={settings.mobileMoneyNumber}
                    onChange={(e) => patchSettings({ mobileMoneyNumber: e.target.value })}
                    placeholder="+225 07 00 00 00 00"
                    className="font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">Instructions affichées au client</label>
                  <Input
                    value={settings.mobileMoneyInstructions}
                    onChange={(e) => patchSettings({ mobileMoneyInstructions: e.target.value })}
                    placeholder="Indiquez la référence de réservation dans le motif du transfert."
                  />
                </div>
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
                Protection des épreuves web : texte, logo (ou les deux), position et opacité configurables.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-xs">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-950">
                    <div>
                      <div className="font-bold text-white">Filigrane texte</div>
                      <div className="text-zinc-500 text-[11px]">Bandeau © studio + mention légale</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.watermarkShowText !== false}
                      onChange={(e) => patchSettings({ watermarkShowText: e.target.checked })}
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-amber-400 focus:ring-amber-400 cursor-pointer"
                    />
                  </div>

                  {settings.watermarkShowText !== false && (
                    <>
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-zinc-400 block mb-1 font-semibold">Position du texte</label>
                          <select
                            value={settings.watermarkPosition}
                            onChange={(e) => patchSettings({ watermarkPosition: e.target.value })}
                            className="w-full h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100"
                          >
                            {WATERMARK_POSITION_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                            <option value="diagonal">Répétition diagonale</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-zinc-400 block mb-1 font-semibold">Opacité texte (%)</label>
                          <Input
                            type="number"
                            min={5}
                            max={100}
                            value={settings.watermarkOpacity}
                            onChange={(e) => patchSettings({ watermarkOpacity: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-950">
                    <div>
                      <div className="font-bold text-white">Filigrane logo</div>
                      <div className="text-zinc-500 text-[11px]">PNG transparent recommandé</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(settings.watermarkLogoEnabled)}
                      onChange={(e) => patchSettings({ watermarkLogoEnabled: e.target.checked })}
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-amber-400 focus:ring-amber-400 cursor-pointer"
                    />
                  </div>

                  {settings.watermarkLogoEnabled && (
                    <>
                      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-16 w-16 rounded-lg border border-zinc-700 bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0">
                            {watermarkLogoPreview ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={watermarkLogoPreview} alt="Logo filigrane" className="max-h-full max-w-full object-contain p-1" />
                            ) : (
                              <span className="text-[10px] text-zinc-500 text-center px-1">Aucun logo</span>
                            )}
                          </div>
                          <div className="flex-1 space-y-2 min-w-0">
                            <Input
                              value={settings.watermarkLogoUrl || ''}
                              onChange={(e) => patchSettings({ watermarkLogoUrl: e.target.value })}
                              placeholder="/uploads/logo.png ou https://…"
                            />
                            <input
                              ref={watermarkLogoFileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleWatermarkLogoUpload}
                              disabled={watermarkLogoUploading}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={watermarkLogoUploading}
                              onClick={() => watermarkLogoFileInputRef.current?.click()}
                            >
                              {watermarkLogoUploading ? 'Envoi…' : 'Téléverser un logo'}
                            </Button>
                            {!settings.watermarkLogoUrl?.trim() && settings.invoiceLogoUrl && (
                              <p className="text-[10px] text-zinc-500">
                                Sans logo dédié, le logo facture sera utilisé.
                              </p>
                            )}
                            {watermarkLogoUploadError && (
                              <p className="text-rose-400 text-[11px]">{watermarkLogoUploadError}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="text-zinc-400 block mb-1 font-semibold">Position du logo</label>
                          <select
                            value={settings.watermarkLogoPosition}
                            onChange={(e) => patchSettings({ watermarkLogoPosition: e.target.value })}
                            className="w-full h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100"
                          >
                            {WATERMARK_POSITION_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-zinc-400 block mb-1 font-semibold">Taille (% largeur)</label>
                          <Input
                            type="number"
                            min={5}
                            max={50}
                            value={settings.watermarkLogoSize}
                            onChange={(e) => patchSettings({ watermarkLogoSize: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <label className="text-zinc-400 block mb-1 font-semibold">Opacité logo (%)</label>
                          <Input
                            type="number"
                            min={5}
                            max={100}
                            value={settings.watermarkLogoOpacity}
                            onChange={(e) => patchSettings({ watermarkLogoOpacity: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono block mb-3">Aperçu filigrane</span>
                <div
                  className="relative mx-auto aspect-[4/3] max-w-md rounded-xl overflow-hidden border border-zinc-800"
                  style={{
                    backgroundImage:
                      'linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(9,9,11,1) 45%, rgba(39,39,42,1) 100%)',
                  }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(251,191,36,0.12),transparent_45%)]" />
                  {settings.watermarkLogoEnabled && watermarkLogoPreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={watermarkLogoPreview}
                      alt=""
                      className={`absolute pointer-events-none select-none object-contain ${watermarkPositionClass(settings.watermarkLogoPosition)}`}
                      style={{
                        opacity: Math.max(0.1, Math.min(1, (settings.watermarkLogoOpacity || 40) / 100)),
                        width: `${Math.max(5, Math.min(50, settings.watermarkLogoSize || 18))}%`,
                        maxHeight: '40%',
                      }}
                    />
                  )}
                  {settings.watermarkShowText !== false && (
                    <div
                      className={`absolute text-[9px] font-mono tracking-widest text-white uppercase bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-sm select-none pointer-events-none whitespace-nowrap ${watermarkPositionClass(
                        settings.watermarkPosition === 'diagonal' ? 'center' : settings.watermarkPosition
                      )}`}
                      style={{ opacity: Math.max(0.2, Math.min(1, (settings.watermarkOpacity || 40) / 100)) }}
                    >
                      {buildWatermarkLabel(settings)}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-semibold">Qualité WebP (%)</label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={settings.webpQuality}
                  onChange={(e) => patchSettings({ webpQuality: Number(e.target.value) })}
                  className="max-w-xs"
                />
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
          <SecuritySettingsFields
            settings={settings}
            patchSettings={patchSettings}
            onSyncLocal={handleSyncLocalToDatabase}
            syncStatus={syncStatus}
          />
        )}

        <AdminStickyActions>
          <Button type="submit" variant="gold" size="lg" className="w-full sm:w-auto px-6 sm:px-8 space-x-2 font-bold shadow-lg shadow-amber-400/20">
            <Save className="h-4 w-4" />
            <span>Enregistrer la configuration</span>
          </Button>
        </AdminStickyActions>
      </form>
      )}
    </div>
  );
}
