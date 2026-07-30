'use client';

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { DashboardStats } from '@/lib/admin-dashboard';
import type { VisitAnalyticsSummary } from '@/lib/visit-analytics';

interface AnalyticsChartsProps {
  visits: VisitAnalyticsSummary | null;
  stats: DashboardStats;
  formatPrice: (amount: number) => string;
  currencySymbol: string;
}

export default function AnalyticsCharts({ visits, stats, formatPrice, currencySymbol }: AnalyticsChartsProps) {
  return (
    <>
      {visits && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Card className="lg:col-span-8 glass-panel p-6 space-y-4">
            <CardHeader className="p-0">
              <CardTitle className="text-lg">Visites — 30 derniers jours</CardTitle>
              <CardDescription>Pages vues et visiteurs uniques par jour.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={visits.dailyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="label" stroke="#71717a" fontSize={11} interval="preserveStartEnd" />
                  <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="views" stroke="#d4af37" strokeWidth={2} dot={false} name="Pages vues" />
                  <Line type="monotone" dataKey="uniqueVisitors" stroke="#10b981" strokeWidth={2} dot={false} name="Visiteurs uniques" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

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
    </>
  );
}
