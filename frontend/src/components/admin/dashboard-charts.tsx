'use client';

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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { DashboardStats } from '@/lib/admin-dashboard';

interface DashboardChartsProps {
  stats: DashboardStats;
  formatPrice: (amount: number) => string;
  currencySymbol: string;
}

export default function DashboardCharts({ stats, formatPrice, currencySymbol }: DashboardChartsProps) {
  return (
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
  );
}
