'use client';

import React, { useCallback, useEffect, useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/context/settings-context';
import { LoadingState } from '@/components/common/loading-state';
import {
  fetchDashboardData,
  exportBookingsCsv,
  type DashboardStats,
} from '@/lib/admin-dashboard';
import type { ApiBooking } from '@/lib/admin-crm-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { fetchVisitAnalytics, type VisitAnalyticsSummary } from '@/lib/visit-analytics';

const AnalyticsCharts = dynamic(() => import('@/components/admin/analytics-charts'), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-xl bg-zinc-900/40" />,
});

export default function AdminAnalyticsPage() {
  const { formatPrice, currencySymbol } = useSettings();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [visits, setVisits] = useState<VisitAnalyticsSummary | null>(null);
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

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
    load();
  }, [load]);

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">
            Statistiques & <span className="gold-gradient-text">Analytics</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Trafic visiteurs du site public + KPIs réservations et CRM.
          </p>
        </div>
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
      </div>

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
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-amber-400" />
                Visites récentes — IP &amp; localisation
              </CardTitle>
              <CardDescription>
                Dernières pages consultées avec adresse IP, ville et pays du visiteur.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-2 overflow-x-auto">
              {(visits.recentVisits ?? []).length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-8">Aucune visite récente.</p>
              ) : (
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="text-zinc-500 uppercase tracking-wide border-b border-zinc-800">
                    <tr>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Page</th>
                      <th className="py-2 pr-4">IP</th>
                      <th className="py-2 pr-4">Ville</th>
                      <th className="py-2 pr-4">Pays</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {(visits.recentVisits ?? []).map((visit) => (
                      <tr key={visit.id} className="hover:bg-zinc-900/40">
                        <td className="py-2.5 pr-4 whitespace-nowrap text-zinc-500">{visit.createdAt}</td>
                        <td className="py-2.5 pr-4">
                          <code className="text-amber-400/90">{visit.path}</code>
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-zinc-400">{visit.ip}</td>
                        <td className="py-2.5 pr-4">{visit.city}{visit.region ? ` (${visit.region})` : ''}</td>
                        <td className="py-2.5 pr-4">{visit.country}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
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
