'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  TrendingUp,
  Users,
  CalendarDays,
  DollarSign,
  FileSpreadsheet,
  CheckCircle2,
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
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function AdminAnalyticsPage() {
  const { formatPrice, currencySymbol } = useSettings();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await fetchDashboardData();
      setStats(data.stats);
      setBookings(data.bookings);
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
            KPIs calculés depuis les réservations et messages contact réels.
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

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-xs text-zinc-400">
        Le trafic visiteurs (Google Analytics) n&apos;est pas encore branché. Les graphiques ci-dessous
        reflètent uniquement les réservations et leads enregistrés en base.
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-8 glass-panel p-6 space-y-4">
          <CardHeader className="p-0">
            <CardTitle className="text-lg">Réservations par mois</CardTitle>
            <CardDescription>Nombre de demandes enregistrées.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyRevenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }} />
                <Bar dataKey="bookings" fill="#d4af37" radius={[6, 6, 0, 0]} name="Réservations" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 glass-panel p-6 space-y-4">
          <CardHeader className="p-0">
            <CardTitle className="text-lg">Répartition</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4 h-64">
            {stats.serviceDistribution.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center pt-16">Aucune donnée</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.serviceDistribution} innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value">
                    {stats.serviceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel space-y-4">
        <CardHeader>
          <CardTitle className="text-lg">CA mensuel ({currencySymbol})</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.monthlyRevenueChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" stroke="#71717a" />
              <YAxis stroke="#71717a" />
              <Tooltip formatter={(value) => formatPrice(Number(value ?? 0))} contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }} />
              <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} name="CA" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
