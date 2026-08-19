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
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
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
        <p className="text-danger text-sm rounded-lg border border-danger/30 bg-danger/10 px-4 py-3">
          {error}
        </p>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="En ligne maintenant" value={onlineCount} valueClassName="text-success" />
        <StatCard label="Comptes clients" value={clients.length} valueClassName="text-primary" />
        <StatCard
          label="Hors ligne"
          value={Math.max(0, clients.length - onlineCount)}
          valueClassName="text-muted-foreground"
        />
      </div>

      <div className="grid md:grid-cols-5 gap-4 md:gap-6">
        <div className={`md:col-span-2 space-y-4 ${selectedId ? 'hidden md:block' : ''}`}>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom, email, ville…"
                className="pl-9"
              />
            </div>
            <Select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="w-full sm:w-auto"
            >
              <option value="all">Tous</option>
              <option value="online">En ligne</option>
              <option value="offline">Hors ligne</option>
            </Select>
          </div>

          <div className="space-y-2 max-h-[72vh] overflow-y-auto pr-1">
            {filtered.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => void loadDetail(client.id)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selectedId === client.id
                    ? 'border-primary bg-primary-muted'
                    : 'border-border bg-surface hover:border-muted-foreground/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-foreground font-medium text-sm truncate">{client.name}</p>
                    <p className="text-caption truncate">{client.email}</p>
                  </div>
                  <Badge variant={client.isOnline ? 'success' : 'outline'} className="text-[10px] shrink-0">
                    {client.isOnline ? 'En ligne' : 'Hors ligne'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-caption">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {client.location.city}, {client.location.country}
                  </span>
                  {client.isOnline && client.currentPath && (
                    <span className="truncate">{formatClientPath(client.currentPath)}</span>
                  )}
                </div>
                <p className="text-caption text-muted-foreground mt-2 truncate">
                  {client.lastAction.action} · {formatDateTime(client.lastSeenAt)}
                </p>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-10">Aucun client trouvé.</p>
            )}
          </div>
        </div>

        <div className={`md:col-span-3 ${!selectedId ? 'hidden md:block' : ''}`}>
          {!selectedId ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground text-sm">
                Sélectionnez un client pour voir son compte et son historique d&apos;activité.
              </CardContent>
            </Card>
          ) : detailLoading || !detail ? (
            <LoadingState message="Chargement de l'activité…" />
          ) : (
            <div className="space-y-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="md:hidden text-muted-foreground -ml-2"
                onClick={() => setSelectedId(null)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Retour à la liste
              </Button>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-foreground flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
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

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                <MiniStat label="Réservations" value={detail.stats.bookings} />
                <MiniStat label="Galeries" value={detail.stats.galleries} />
                <MiniStat label="Invitations" value={detail.stats.invitations} />
                <MiniStat label="Messages" value={detail.stats.messages} />
                <MiniStat label="Navigation" value={detail.stats.presenceEvents} />
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-foreground">Historique d&apos;activité</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[50vh] overflow-y-auto space-y-3">
                  {detail.timeline.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Aucune activité enregistrée pour ce client.</p>
                  ) : (
                    detail.timeline.map((item, index) => {
                      const Icon = activityIcon(item.type);
                      return (
                        <div
                          key={`${item.type}-${item.createdAt}-${index}`}
                          className="flex gap-3 p-3 rounded-lg border border-border bg-surface-muted"
                        >
                          <div className="h-8 w-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-foreground text-sm font-medium">{item.title}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {activityTypeLabel(item.type)}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground text-xs leading-relaxed">{item.description}</p>
                            <div className="flex flex-wrap gap-3 text-caption mt-2">
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

function StatCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: number;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-caption">{label}</p>
        <p className={`text-2xl font-semibold mt-1 tabular-nums text-foreground ${valueClassName || ''}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted p-3 text-center">
      <p className="text-lg font-semibold text-foreground tabular-nums">{value}</p>
      <p className="text-caption">{label}</p>
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
      <p className="text-caption mb-1 flex items-center gap-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="text-foreground text-sm break-all">{value}</p>
    </div>
  );
}
