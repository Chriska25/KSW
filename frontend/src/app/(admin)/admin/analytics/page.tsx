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
    return <p className="text-rose-400 text-sm">{error || 'Données indisponibles.'}</p>;
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
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-xs text-zinc-300 flex items-center gap-2">
            <Globe className="h-4 w-4 text-amber-400 shrink-0" />
            Compteur de visites actif sur le site public
            {visits.lastTrackedAt ? ` — dernière visite : ${visits.lastTrackedAt}` : ''}.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="glass-panel p-6 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold uppercase">
                <span>Aujourd&apos;hui</span>
                <Eye className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">{visits.todayViews}</div>
              <div className="text-xs text-zinc-400">{visits.todayUniqueVisitors} visiteur(s) unique(s)</div>
            </Card>

            <Card className="glass-panel p-6 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold uppercase">
                <span>7 derniers jours</span>
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-extrabold text-emerald-400">{visits.weekViews}</div>
              <div className="text-xs text-zinc-400">{visits.weekUniqueVisitors} uniques</div>
            </Card>

            <Card className="glass-panel p-6 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold uppercase">
                <span>30 derniers jours</span>
                <Globe className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">{visits.monthViews}</div>
              <div className="text-xs text-zinc-400">{visits.monthUniqueVisitors} uniques</div>
            </Card>

            <Card className="glass-panel p-6 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold uppercase">
                <span>Total pages vues</span>
                <Eye className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-3xl font-extrabold text-amber-400">{visits.totalPageViews}</div>
              <div className="text-xs text-zinc-400">{visits.totalUniqueVisitors} sessions enregistrées</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <Card className="lg:col-span-4 glass-panel p-6 space-y-4">
              <CardHeader className="p-0">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-emerald-400" />
                  Top villes
                </CardTitle>
                <CardDescription>Localisation des visiteurs (IP).</CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-2 space-y-2 max-h-72 overflow-y-auto">
                {(visits.topCities ?? []).length === 0 ? (
                  <p className="text-zinc-500 text-sm text-center py-8">Aucune donnée géo.</p>
                ) : (
                  (visits.topCities ?? []).map((item) => (
                    <div
                      key={item.location}
                      className="flex items-center justify-between gap-2 py-2 border-b border-zinc-800/80 text-xs"
                    >
                      <span className="text-zinc-300 truncate">{item.location}</span>
                      <Badge variant="outline" className="shrink-0">{item.views}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-4 glass-panel p-6 space-y-4">
              <CardHeader className="p-0">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="h-5 w-5 text-amber-400" />
                  Top pays
                </CardTitle>
                <CardDescription>Répartition par pays.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-2 space-y-2 max-h-72 overflow-y-auto">
                {(visits.topCountries ?? []).length === 0 ? (
                  <p className="text-zinc-500 text-sm text-center py-8">Aucune donnée géo.</p>
                ) : (
                  (visits.topCountries ?? []).map((item) => (
                    <div
                      key={item.country}
                      className="flex items-center justify-between gap-2 py-2 border-b border-zinc-800/80 text-xs"
                    >
                      <span className="text-zinc-300 truncate">{item.country}</span>
                      <Badge variant="outline" className="shrink-0">{item.views}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-4 glass-panel p-6 space-y-4">
              <CardHeader className="p-0">
                <CardTitle className="text-lg">Pages les plus vues</CardTitle>
                <CardDescription>Top pages du site public.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-2 space-y-2 max-h-72 overflow-y-auto">
                {visits.topPages.length === 0 ? (
                  <p className="text-zinc-500 text-sm text-center py-8">Aucune visite enregistrée.</p>
                ) : (
                  visits.topPages.map((page) => (
                    <div
                      key={page.path}
                      className="flex items-center justify-between gap-2 py-2 border-b border-zinc-800/80 text-xs"
                    >
                      <code className="text-zinc-300 truncate">{page.path}</code>
                      <Badge variant="outline" className="shrink-0">{page.views}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="glass-panel p-6 space-y-4">
            <CardHeader className="p-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-amber-400" />
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
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
                        connectionFilter === value
                          ? 'border-amber-400/70 bg-amber-400/10 text-amber-300'
                          : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 pt-2 overflow-x-auto max-h-[70vh] overflow-y-auto">
              {filteredConnections.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-8">Aucune connexion enregistrée.</p>
              ) : (
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="text-zinc-500 uppercase tracking-wide border-b border-zinc-800 sticky top-0 bg-zinc-950/95 backdrop-blur-sm z-10">
                    <tr>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2 pr-4">Utilisateur</th>
                      <th className="py-2 pr-4">Page / action</th>
                      <th className="py-2 pr-4">IP</th>
                      <th className="py-2 pr-4">Ville</th>
                      <th className="py-2 pr-4">Pays</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {paginatedConnections.map((entry) => (
                      <tr key={entry.id} className="hover:bg-zinc-900/40">
                        <td className="py-2.5 pr-4 whitespace-nowrap text-zinc-500">{entry.createdAt}</td>
                        <td className="py-2.5 pr-4">
                          <Badge variant={entry.kind === 'client' ? 'gold' : 'outline'} className="text-[10px]">
                            {entry.kind === 'client' ? 'Client' : 'Public'}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4">
                          {entry.kind === 'client' ? (
                            <div className="min-w-[120px]">
                              <p className="text-zinc-200">{entry.userName || '—'}</p>
                              {entry.email && <p className="text-zinc-500 text-[10px] truncate max-w-[180px]">{entry.email}</p>}
                            </div>
                          ) : (
                            <span className="text-zinc-600">Visiteur anonyme</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4">
                          <div>
                            <p className="text-zinc-400 text-[10px] mb-0.5">{entry.label}</p>
                            <code className="text-amber-400/90">
                              {entry.kind === 'client' ? formatClientPath(entry.path) : entry.path}
                            </code>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-zinc-400">{entry.ip || '—'}</td>
                        <td className="py-2.5 pr-4">
                          {entry.city}
                          {entry.region ? ` (${entry.region})` : ''}
                        </td>
                        <td className="py-2.5 pr-4">{entry.country}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
            {filteredConnections.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-800">
                <p className="text-zinc-500 text-xs">
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

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-xs text-zinc-400">
        KPIs métier ci-dessous : réservations, leads CRM et chiffre d&apos;affaires.
      </div>

      {exporting && (
        <Badge variant="success" className="px-3 py-1.5 text-xs">
          <CheckCircle2 className="h-4 w-4 mr-1.5" /> Export CSV téléchargé.
        </Badge>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-panel p-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold uppercase">
            <span>Clients / leads</span>
            <Users className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{stats.activeClientsCount}</div>
          <div className="text-xs text-zinc-400">Emails uniques CRM</div>
        </Card>

        <Card className="glass-panel p-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold uppercase">
            <span>Taux conversion leads</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">{conversionRate} %</div>
          <div className="text-xs text-zinc-400">Confirmées / contacts totaux</div>
        </Card>

        <Card className="glass-panel p-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold uppercase">
            <span>Réservations confirmées</span>
            <CalendarDays className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{stats.confirmedBookingsCount}</div>
          <div className="text-xs text-amber-400">{stats.upcomingBookingsCount} à venir</div>
        </Card>

        <Card className="glass-panel p-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold uppercase">
            <span>Encaissé (acomptes)</span>
            <DollarSign className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400">{formatPrice(stats.depositsCollected)}</div>
          <div className="text-xs text-zinc-400">Stripe validés</div>
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
