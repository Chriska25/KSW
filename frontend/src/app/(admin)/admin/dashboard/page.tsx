'use client';

import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  ArrowUpRight,
  Eye,
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
import { fetchDashboardData, type DashboardStats } from '@/lib/admin-dashboard';
import { fetchVisitAnalytics } from '@/lib/visit-analytics';
import { getApiErrorMessage } from '@/lib/api-error';

const DashboardCharts = dynamic(() => import('@/components/admin/dashboard-charts'), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-lg bg-surface-muted" />,
});

export default function AdminDashboardPage() {
  const { formatPrice, currencySymbol } = useSettings();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayViews, setTodayViews] = useState<number | null>(null);
  const [todayUniqueVisitors, setTodayUniqueVisitors] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [data, visitData] = await Promise.all([
        fetchDashboardData(),
        fetchVisitAnalytics().catch(() => null),
      ]);
      setStats(data.stats);
      setTodayViews(visitData?.todayViews ?? null);
      setTodayUniqueVisitors(visitData?.todayUniqueVisitors ?? null);
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
      <p className="text-danger text-sm">{error || 'Données indisponibles.'}</p>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <AdminPageHeader
        title="Tableau de bord"
        accent="Studio"
        description={`Données live depuis réservations, paiements Stripe et CRM (${currencySymbol}).`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={load}>
              Actualiser
            </Button>
            <Link href="/admin/reservations">
              <Button variant="primary" size="sm">Voir réservations</Button>
            </Link>
          </>
        }
      />

      {error && (
        <p className="text-small text-warning rounded-lg border border-warning/30 bg-warning-muted px-4 py-3">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-caption font-semibold uppercase">CA du mois</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground tabular-nums">{formatPrice(stats.monthlyRevenue)}</div>
            <div className="text-caption mt-1">{stats.confirmedBookingsCount} réservation(s) confirmée(s)</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-caption font-semibold uppercase">Acomptes encaissés</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground tabular-nums">{formatPrice(stats.depositsCollected)}</div>
            <div className="text-caption mt-1 text-success">Via Stripe Checkout</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-caption font-semibold uppercase">Séances à venir</CardTitle>
            <Calendar className="h-4 w-4 text-primary" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground tabular-nums">{stats.upcomingBookingsCount}</div>
            <div className="text-caption mt-1">{stats.pendingBookingsCount} en attente</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-caption font-semibold uppercase">Clients & leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground tabular-nums">{stats.activeClientsCount}</div>
            <div className="text-caption mt-1">+{stats.newLeadsCount} message(s) contact (30 j)</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-caption font-semibold uppercase">Visites aujourd&apos;hui</CardTitle>
            <Eye className="h-4 w-4 text-success" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground tabular-nums">{todayViews ?? '—'}</div>
            <div className="text-caption mt-1">
              {todayUniqueVisitors != null
                ? `${todayUniqueVisitors} visiteur(s) unique(s)`
                : 'Compteur site public'}
            </div>
            <Link href="/admin/analytics" className="text-caption text-primary hover:underline mt-2 inline-block">
              Voir le trafic →
            </Link>
          </CardContent>
        </Card>
      </div>

      {stats && (
        <DashboardCharts stats={stats} formatPrice={formatPrice} currencySymbol={currencySymbol} />
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Dernières réservations</CardTitle>
            <CardDescription>Flux entrant depuis le tunnel public.</CardDescription>
          </div>
          <Badge variant="accent">Live API</Badge>
        </CardHeader>
        <CardContent>
          {stats.recentBookings.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">Aucune réservation.</p>
          ) : (
            <div className="responsive-table-wrap -mx-5 sm:-mx-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Prestation</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Montant / Acompte</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentBookings.length === 0 ? (
                    <TableEmpty colSpan={7} message="Aucune réservation." />
                  ) : (
                    stats.recentBookings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-xs text-primary">{b.reference}</TableCell>
                        <TableCell className="font-medium">{b.client}</TableCell>
                        <TableCell className="text-muted-foreground">{b.service}</TableCell>
                        <TableCell className="text-muted-foreground">{b.date}</TableCell>
                        <TableCell>
                          <div className="font-medium tabular-nums">{formatPrice(b.amount)}</div>
                          <div className="text-caption">
                            Acompte: {formatPrice(b.depositPaid)}
                            {b.paymentStatus === 'paid' ? ' ✓' : ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={b.status === 'Confirmé' ? 'success' : 'warning'}>{b.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href="/admin/reservations">
                            <Button variant="ghost" size="sm" className="text-xs">
                              Gérer <ArrowUpRight className="h-3.5 w-3.5 ml-1" aria-hidden />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
