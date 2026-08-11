'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Globe,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  User,
  Clock,
  CalendarDays,
  ImageIcon,
  MailPlus,
  CreditCard,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/common/loading-state';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import {
  activityTypeLabel,
  fetchAdminClientActivity,
  fetchAdminClientsOverview,
  formatClientPath,
  type AdminClientActivityPayload,
  type AdminClientOverviewItem,
} from '@/lib/admin-clients-api';
import { getApiErrorMessage } from '@/lib/api-error';

function formatDateTime(value?: string): string {
  if (!value || value === '—') return '—';
  const raw = value.replace('Z', '');
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function activityIcon(type: string) {
  switch (type) {
    case 'booking':
      return CalendarDays;
    case 'payment':
      return CreditCard;
    case 'gallery':
      return ImageIcon;
    case 'invitation':
      return MailPlus;
    case 'contact':
      return MessageSquare;
    default:
      return Activity;
  }
}

export default function AdminClientsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [clients, setClients] = useState<AdminClientOverviewItem[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminClientActivityPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadOverview = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const data = await fetchAdminClientsOverview();
      setClients(data.clients || []);
      setOnlineCount(data.onlineCount || 0);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Impossible de charger les clients.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
    const interval = window.setInterval(() => loadOverview(true), 60000);
    return () => window.clearInterval(interval);
  }, [loadOverview]);

  const loadDetail = useCallback(async (userId: string) => {
    setSelectedId(userId);
    setDetailLoading(true);
    try {
      setDetail(await fetchAdminClientActivity(userId));
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Impossible de charger l\'activité du client.'));
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((client) => {
      if (filter === 'online' && !client.isOnline) return false;
      if (filter === 'offline' && client.isOnline) return false;
      if (!q) return true;
      return (
        client.name.toLowerCase().includes(q) ||
        client.email.toLowerCase().includes(q) ||
        client.phone.toLowerCase().includes(q) ||
        client.location.city.toLowerCase().includes(q) ||
        client.location.country.toLowerCase().includes(q)
      );
    });
  }, [clients, search, filter]);

  if (loading) {
    return <LoadingState message="Chargement des clients connectés…" />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <AdminPageHeader
        title="Clients connectés"
        description="Comptes clients, localisation, sessions actives et historique d'activité."
        icon={Activity}
        actions={
          <Button variant="outline" size="sm" disabled={refreshing} onClick={() => loadOverview(true)}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        }
      />

      {error && (
        <p className="text-rose-400 text-sm rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          {error}
        </p>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="En ligne maintenant" value={onlineCount} accent="text-emerald-400" />
        <StatCard label="Comptes clients" value={clients.length} accent="text-amber-400" />
        <StatCard
          label="Hors ligne"
          value={Math.max(0, clients.length - onlineCount)}
          accent="text-zinc-400"
        />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom, email, ville…"
                className="pl-9 bg-zinc-900"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
            >
              <option value="all">Tous</option>
              <option value="online">En ligne</option>
              <option value="offline">Hors ligne</option>
            </select>
          </div>

          <div className="space-y-2 max-h-[72vh] overflow-y-auto pr-1">
            {filtered.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => void loadDetail(client.id)}
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  selectedId === client.id
                    ? 'border-amber-400/40 bg-amber-400/5'
                    : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-white font-medium text-sm truncate">{client.name}</p>
                    <p className="text-zinc-500 text-xs truncate">{client.email}</p>
                  </div>
                  <Badge variant={client.isOnline ? 'success' : 'outline'} className="text-[10px] shrink-0">
                    {client.isOnline ? 'En ligne' : 'Hors ligne'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {client.location.city}, {client.location.country}
                  </span>
                  {client.isOnline && client.currentPath && (
                    <span className="truncate">{formatClientPath(client.currentPath)}</span>
                  )}
                </div>
                <p className="text-zinc-600 text-[10px] mt-2 truncate">
                  {client.lastAction.action} · {formatDateTime(client.lastSeenAt)}
                </p>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-zinc-500 text-sm text-center py-10">Aucun client trouvé.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          {!selectedId ? (
            <Card className="glass-panel">
              <CardContent className="py-16 text-center text-zinc-500 text-sm">
                Sélectionnez un client pour voir son compte et son historique d&apos;activité.
              </CardContent>
            </Card>
          ) : detailLoading || !detail ? (
            <LoadingState message="Chargement de l'activité…" />
          ) : (
            <div className="space-y-4">
              <Card className="glass-panel">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <User className="h-5 w-5 text-amber-400" />
                    {detail.client.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
                  <InfoLine icon={Mail} label="Email" value={detail.client.email} />
                  <InfoLine icon={Phone} label="Téléphone" value={detail.client.phone || '—'} />
                  <InfoLine
                    icon={MapPin}
                    label="Dernière localisation"
                    value={`${detail.client.location.city}, ${detail.client.location.country}`}
                  />
                  <InfoLine icon={Globe} label="IP" value={detail.client.location.ip || '—'} />
                  <InfoLine icon={Clock} label="Dernière connexion" value={formatDateTime(detail.client.lastLoginAt)} />
                  <InfoLine icon={Activity} label="Dernière activité" value={formatDateTime(detail.client.lastSeenAt)} />
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <MiniStat label="Réservations" value={detail.stats.bookings} />
                <MiniStat label="Galeries" value={detail.stats.galleries} />
                <MiniStat label="Invitations" value={detail.stats.invitations} />
                <MiniStat label="Messages" value={detail.stats.messages} />
                <MiniStat label="Navigation" value={detail.stats.presenceEvents} />
              </div>

              <Card className="glass-panel">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white">Historique d&apos;activité</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[50vh] overflow-y-auto space-y-3">
                  {detail.timeline.length === 0 ? (
                    <p className="text-zinc-500 text-sm">Aucune activité enregistrée pour ce client.</p>
                  ) : (
                    detail.timeline.map((item, index) => {
                      const Icon = activityIcon(item.type);
                      return (
                        <div
                          key={`${item.type}-${item.createdAt}-${index}`}
                          className="flex gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-950/50"
                        >
                          <div className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                            <Icon className="h-4 w-4 text-amber-400/80" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-white text-sm font-medium">{item.title}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {activityTypeLabel(item.type)}
                              </Badge>
                            </div>
                            <p className="text-zinc-400 text-xs leading-relaxed">{item.description}</p>
                            <div className="flex flex-wrap gap-3 text-[10px] text-zinc-600 mt-2">
                              <span>{formatDateTime(item.createdAt)}</span>
                              {item.path && <span>{formatClientPath(item.path)}</span>}
                              {item.location && item.location !== 'Inconnue, Inconnu' && (
                                <span>{item.location}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <Card className="glass-panel">
      <CardContent className="p-4">
        <p className="text-zinc-500 text-xs">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${accent}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-center">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] text-zinc-500">{label}</p>
    </div>
  );
}

function InfoLine({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-zinc-500 text-xs mb-1 flex items-center gap-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="text-zinc-200 text-sm break-all">{value}</p>
    </div>
  );
}
