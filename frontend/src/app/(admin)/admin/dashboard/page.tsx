'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/context/settings-context';
import { LoadingState } from '@/components/common/loading-state';
import { fetchDashboardData, type DashboardStats } from '@/lib/admin-dashboard';
import { getApiErrorMessage } from '@/lib/api-error';

export default function AdminDashboardPage() {
  const { formatPrice, currencySymbol } = useSettings();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await fetchDashboardData();
      setStats(data.stats);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Impossible de charger le tableau de bord.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <LoadingState message="Chargement du tableau de bord…" />;
  }

  if (!stats) {
    return (
      <p className="text-rose-400 text-sm">{error || 'Données indisponibles.'}</p>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">
            Tableau de Bord <span className="gold-gradient-text">Studio</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Données live depuis réservations, paiements Stripe et CRM ({currencySymbol}).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={load}>
            Actualiser
          </Button>
          <Link href="/admin/reservations">
            <Button variant="gold" size="sm">Voir réservations</Button>
          </Link>
        </div>
      </div>

      {error && (
        <p className="text-amber-400 text-xs rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-panel border-amber-400/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-zinc-400 uppercase">CA du mois</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-white">{formatPrice(stats.monthlyRevenue)}</div>
            <div className="text-xs text-zinc-400 mt-1">{stats.confirmedBookingsCount} réservation(s) confirmée(s)</div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-zinc-400 uppercase">Acomptes encaissés</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-white">{formatPrice(stats.depositsCollected)}</div>
            <div className="text-xs text-emerald-400 mt-1">Via Stripe Checkout</div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-zinc-400 uppercase">Séances à venir</CardTitle>
            <Calendar className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-white">{stats.upcomingBookingsCount}</div>
            <div className="text-xs text-amber-400/90 font-medium mt-1">{stats.pendingBookingsCount} en attente</div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-zinc-400 uppercase">Clients & leads</CardTitle>
            <Users className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-white">{stats.activeClientsCount}</div>
            <div className="text-xs text-zinc-400 mt-1">+{stats.newLeadsCount} message(s) contact (30 j)</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 glass-panel space-y-4">
          <CardHeader>
            <CardTitle className="text-lg">Volume d&apos;affaires mensuel</CardTitle>
            <CardDescription>Réservations enregistrées par mois ({currencySymbol}).</CardDescription>
          </CardHeader>
          <CardContent className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyRevenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip
                  formatter={(value) => formatPrice(Number(value ?? 0))}
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }}
                />
                <Bar dataKey="revenue" fill="#d4af37" radius={[6, 6, 0, 0]} name="CA" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-panel space-y-4">
          <CardHeader>
            <CardTitle className="text-lg">Répartition prestations</CardTitle>
            <CardDescription>Part des réservations par catégorie.</CardDescription>
          </CardHeader>
          <CardContent className="h-72 flex items-center justify-center">
            {stats.serviceDistribution.length === 0 ? (
              <p className="text-zinc-500 text-sm">Aucune donnée</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.serviceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.serviceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel space-y-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">Dernières réservations</CardTitle>
            <CardDescription>Flux entrant depuis le tunnel public.</CardDescription>
          </div>
          <Badge variant="gold">Live API</Badge>
        </CardHeader>
        <CardContent>
          {stats.recentBookings.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-6">Aucune réservation.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950/80 text-xs font-semibold uppercase text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Référence</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Prestation</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Montant / Acompte</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {stats.recentBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-amber-400">{b.reference}</td>
                      <td className="py-3.5 px-4 font-semibold text-white">{b.client}</td>
                      <td className="py-3.5 px-4 text-zinc-300">{b.service}</td>
                      <td className="py-3.5 px-4 text-zinc-400">{b.date}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{formatPrice(b.amount)}</div>
                        <div className="text-xs text-amber-400/80">
                          Acompte: {formatPrice(b.depositPaid)}
                          {b.paymentStatus === 'paid' ? ' ✓' : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={b.status === 'Confirmé' ? 'success' : 'warning'}>{b.status}</Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link href="/admin/reservations">
                          <Button variant="ghost" size="sm" className="text-xs">
                            Gérer <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
