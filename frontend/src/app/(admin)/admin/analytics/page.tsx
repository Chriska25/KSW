'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  TrendingUp,
  Users,
  CalendarDays,
  DollarSign,
  FileSpreadsheet,
  CheckCircle2,
  Eye,
  Globe,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmpty,
} from '@/components/ui/table';
import { useSettings } from '@/context/settings-context';
import { LoadingState } from '@/components/common/loading-state';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import {
  fetchDashboardData,
  exportBookingsCsv,
  type DashboardStats,
} from '@/lib/admin-dashboard';
import type { ApiBooking } from '@/lib/admin-crm-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { fetchVisitAnalytics, type VisitAnalyticsSummary, type ConnectionLogEntry } from '@/lib/visit-analytics';
import { formatClientPath } from '@/lib/admin-clients-api';

const AnalyticsCharts = dynamic(() => import('@/components/admin/analytics-charts'), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-xl bg-zinc-900/40" />,
});

const CONNECTIONS_PAGE_SIZE = 100;

export default function AdminAnalyticsPage() {
  const { formatPrice, currencySymbol } = useSettings();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [visits, setVisits] = useState<VisitAnalyticsSummary | null>(null);
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [connectionFilter, setConnectionFilter] = useState<'all' | 'public' | 'client'>('all');
  const [connectionPage, setConnectionPage] = useState(1);

  const load = useCallback(async () => {
    setError('');
    try {
      const [data, visitData] = await Promise.all([
        fetchDashboardData(),
        fetchVisitAnalytics().catch(() => null),
      ]);
      setStats(data.stats);
      setBookings(data.bookings);
      setVisits(visitData);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Impossible de charger les analytics.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const allConnections = useMemo(() => {
    if (!visits) return [] as ConnectionLogEntry[];
    if (visits.allConnections?.length) return visits.allConnections;
    return (visits.recentVisits ?? []).map((visit) => ({
      id: visit.id,
      kind: 'public' as const,
      label: 'Visite site public',
      path: visit.path,
      ip: visit.ip,
      city: visit.city,
      country: visit.country,
      region: visit.region,
      countryCode: visit.countryCode,
      userName: '',
      email: '',
      sessionId: visit.sessionId,
      referrer: visit.referrer,
      createdAt: visit.createdAt,
    }));
  }, [visits]);

  const filteredConnections = useMemo(() => {
    if (connectionFilter === 'all') return allConnections;
    return allConnections.filter((entry) => entry.kind === connectionFilter);
  }, [allConnections, connectionFilter]);

  const connectionPageCount = Math.max(1, Math.ceil(filteredConnections.length / CONNECTIONS_PAGE_SIZE));
  const safeConnectionPage = Math.min(connectionPage, connectionPageCount);

  const paginatedConnections = useMemo(() => {
    const start = (safeConnectionPage - 1) * CONNECTIONS_PAGE_SIZE;
    return filteredConnections.slice(start, start + CONNECTIONS_PAGE_SIZE);
  }, [filteredConnections, safeConnectionPage]);

  const handleExport = () => {
    setExporting(true);
    exportBookingsCsv(bookings);
    setTimeout(() => setExporting(false), 1500);
  };

  if (loading) {
    return <LoadingState message="Chargement des analytics…" />;
  }

  if (!stats) {
    return <p className="text-danger text-sm">{error || 'Données indisponibles.'}</p>;
  }

  const conversionRate =
    stats.activeClientsCount > 0
      ? ((stats.confirmedBookingsCount / stats.activeClientsCount) * 100).toFixed(1)
      : '0';

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <AdminPageHeader
        title="Statistiques &"
        accent="Analytics"
        description="Trafic visiteurs du site public + KPIs réservations et CRM."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting || bookings.length === 0}
            className="space-x-2"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            <span>{exporting ? 'Export…' : 'Exporter CSV'}</span>
          </Button>
        }
      />

      {visits && (
        <>
          <div className="rounded-lg border border-primary/20 bg-primary-muted px-4 py-3 text-xs text-muted-foreground flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary shrink-0" />
            Compteur de visites actif sur le site public
            {visits.lastTrackedAt ? ` — dernière visite : ${visits.lastTrackedAt}` : ''}.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-caption font-semibold uppercase">Aujourd&apos;hui</CardTitle>
                <Eye className="h-4 w-4 text-primary" aria-hidden />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-foreground tabular-nums">{visits.todayViews}</div>
                <div className="text-caption mt-1">{visits.todayUniqueVisitors} visiteur(s) unique(s)</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-caption font-semibold uppercase">7 derniers jours</CardTitle>
                <TrendingUp className="h-4 w-4 text-success" aria-hidden />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-success tabular-nums">{visits.weekViews}</div>
                <div className="text-caption mt-1">{visits.weekUniqueVisitors} uniques</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-caption font-semibold uppercase">30 derniers jours</CardTitle>
                <Globe className="h-4 w-4 text-primary" aria-hidden />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-foreground tabular-nums">{visits.monthViews}</div>
                <div className="text-caption mt-1">{visits.monthUniqueVisitors} uniques</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-caption font-semibold uppercase">Total pages vues</CardTitle>
                <Eye className="h-4 w-4 text-primary" aria-hidden />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-primary tabular-nums">{visits.totalPageViews}</div>
                <div className="text-caption mt-1">{visits.totalUniqueVisitors} sessions enregistrées</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle className="text-h2 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-success" />
                  Top villes
                </CardTitle>
                <CardDescription>Localisation des visiteurs (IP).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-72 overflow-y-auto">
                {(visits.topCities ?? []).length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Aucune donnée géo.</p>
                ) : (
                  (visits.topCities ?? []).map((item) => (
                    <div
                      key={item.location}
                      className="flex items-center justify-between gap-2 py-2 border-b border-border text-xs"
                    >
                      <span className="text-foreground truncate">{item.location}</span>
                      <Badge variant="outline" className="shrink-0">{item.views}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle className="text-h2 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Top pays
                </CardTitle>
                <CardDescription>Répartition par pays.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-72 overflow-y-auto">
                {(visits.topCountries ?? []).length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Aucune donnée géo.</p>
                ) : (
                  (visits.topCountries ?? []).map((item) => (
                    <div
                      key={item.country}
                      className="flex items-center justify-between gap-2 py-2 border-b border-border text-xs"
                    >
                      <span className="text-foreground truncate">{item.country}</span>
                      <Badge variant="outline" className="shrink-0">{item.views}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle className="text-h2">Pages les plus vues</CardTitle>
                <CardDescription>Top pages du site public.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-72 overflow-y-auto">
                {visits.topPages.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Aucune visite enregistrée.</p>
                ) : (
                  visits.topPages.map((page) => (
                    <div
                      key={page.path}
                      className="flex items-center justify-between gap-2 py-2 border-b border-border text-xs"
                    >
                      <code className="text-muted-foreground truncate">{page.path}</code>
                      <Badge variant="outline" className="shrink-0">{page.views}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-h2 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Toutes les connexions — IP &amp; localisation
                  </CardTitle>
                  <CardDescription>
                    Liste complète des visites du site public et des connexions clients ({filteredConnections.length} entrée{filteredConnections.length > 1 ? 's' : ''}, {CONNECTIONS_PAGE_SIZE} par page).
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {([
                    ['all', 'Toutes'],
                    ['public', 'Site public'],
                    ['client', 'Clients'],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setConnectionFilter(value);
                        setConnectionPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-full text-caption font-semibold border transition-colors ${
                        connectionFilter === value
                          ? 'border-primary bg-primary-muted text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="max-h-[70vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Page / action</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Pays</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedConnections.length === 0 ? (
                    <TableEmpty colSpan={7} message="Aucune connexion enregistrée." />
                  ) : (
                    paginatedConnections.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground text-xs">{entry.createdAt}</TableCell>
                        <TableCell>
                          <Badge variant={entry.kind === 'client' ? 'accent' : 'outline'} className="text-[10px]">
                            {entry.kind === 'client' ? 'Client' : 'Public'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {entry.kind === 'client' ? (
                            <div className="min-w-[120px]">
                              <p className="text-foreground">{entry.userName || '—'}</p>
                              {entry.email && <p className="text-muted-foreground text-caption truncate max-w-[180px]">{entry.email}</p>}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Visiteur anonyme</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <p className="text-muted-foreground text-caption mb-0.5">{entry.label}</p>
                          <code className="text-primary">
                            {entry.kind === 'client' ? formatClientPath(entry.path) : entry.path}
                          </code>
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground text-xs">{entry.ip || '—'}</TableCell>
                        <TableCell className="text-xs">
                          {entry.city}
                          {entry.region ? ` (${entry.region})` : ''}
                        </TableCell>
                        <TableCell className="text-xs">{entry.country}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
            {filteredConnections.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-border">
                <p className="text-muted-foreground text-caption">
                  Page {connectionPage} sur {connectionPageCount}
                  {' · '}
                  {(connectionPage - 1) * CONNECTIONS_PAGE_SIZE + 1}–
                  {Math.min(connectionPage * CONNECTIONS_PAGE_SIZE, filteredConnections.length)} sur{' '}
                  {filteredConnections.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={connectionPage <= 1}
                    onClick={() => setConnectionPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Précédent
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={connectionPage >= connectionPageCount}
                    onClick={() => setConnectionPage((p) => Math.min(connectionPageCount, p + 1))}
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      <div className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-xs text-muted-foreground">
        KPIs métier ci-dessous : réservations, leads CRM et chiffre d&apos;affaires.
      </div>

      {exporting && (
        <Badge variant="success" className="px-3 py-1.5 text-xs">
          <CheckCircle2 className="h-4 w-4 mr-1.5" /> Export CSV téléchargé.
        </Badge>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-caption font-semibold uppercase">Clients / leads</CardTitle>
            <Users className="h-4 w-4 text-primary" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground tabular-nums">{stats.activeClientsCount}</div>
            <div className="text-caption mt-1">Emails uniques CRM</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-caption font-semibold uppercase">Taux conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-success tabular-nums">{conversionRate} %</div>
            <div className="text-caption mt-1">Confirmées / contacts totaux</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-caption font-semibold uppercase">Réservations confirmées</CardTitle>
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground tabular-nums">{stats.confirmedBookingsCount}</div>
            <div className="text-caption mt-1 text-primary">{stats.upcomingBookingsCount} à venir</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-caption font-semibold uppercase">Encaissé (acomptes)</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-primary tabular-nums">{formatPrice(stats.depositsCollected)}</div>
            <div className="text-caption mt-1">Stripe validés</div>
          </CardContent>
        </Card>
      </div>

      {stats && (
        <AnalyticsCharts
          visits={visits}
          stats={stats}
          formatPrice={formatPrice}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  );
}
