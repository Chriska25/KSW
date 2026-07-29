'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, CreditCard, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/context/settings-context';
import { LoadingState } from '@/components/common/loading-state';
import { fetchAdminBookings } from '@/lib/admin-crm-api';
import {
  bookingsToInvoices,
  computeInvoiceSummary,
  type InvoiceRow,
} from '@/lib/admin-dashboard';
import { getApiErrorMessage } from '@/lib/api-error';
import { exportInvoiceToPdf } from '@/lib/invoice-pdf';

export default function AdminDevisFacturesPage() {
  const { formatPrice, settings } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const bookings = await fetchAdminBookings();
      setInvoices(bookingsToInvoices(bookings));
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Impossible de charger les factures.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => computeInvoiceSummary(invoices), [invoices]);

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadPdf = (inv: InvoiceRow) => {
    exportInvoiceToPdf(inv, {
      studioName: settings.studioName,
      address: settings.address,
      phone: settings.phone,
      contactEmail: settings.contactEmail,
    });
  };

  if (loading) {
    return <LoadingState message="Chargement des factures…" />;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">
            Devis & <span className="gold-gradient-text">Factures</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Factures générées automatiquement depuis les réservations et paiements Stripe.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          Actualiser
        </Button>
      </div>

      {error && (
        <p className="text-rose-400 text-sm rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="glass-panel p-6 space-y-2">
          <span className="text-xs text-zinc-400 font-semibold uppercase">Total facturé</span>
          <div className="text-3xl font-extrabold text-white">{formatPrice(summary.totalInvoiced)}</div>
        </Card>
        <Card className="glass-panel p-6 space-y-2">
          <span className="text-xs text-zinc-400 font-semibold uppercase">Encaissé (acomptes Stripe)</span>
          <div className="text-3xl font-extrabold text-amber-400">{formatPrice(summary.totalPaid)}</div>
        </Card>
        <Card className="glass-panel p-6 space-y-2">
          <span className="text-xs text-zinc-400 font-semibold uppercase">Reste à encaisser</span>
          <div className="text-3xl font-extrabold text-emerald-400">{formatPrice(summary.remaining)}</div>
        </Card>
      </div>

      <Card className="glass-panel space-y-4">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Factures ({filteredInvoices.length})</CardTitle>
            <CardDescription>Une facture par réservation — numéro attribué au paiement Stripe.</CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-3 text-zinc-500" />
            <Input
              placeholder="N° facture, client…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>
        </CardHeader>

        <CardContent>
          {filteredInvoices.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-8">Aucune facture — les réservations apparaîtront ici.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950/80 text-xs font-semibold uppercase text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">N° Facture</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Prestation</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Réglé</th>
                    <th className="py-3 px-4">Paiement</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-amber-400">{inv.number}</td>
                      <td className="py-3.5 px-4 font-semibold text-white">{inv.clientName}</td>
                      <td className="py-3.5 px-4 text-zinc-300 text-xs">{inv.serviceTitle}</td>
                      <td className="py-3.5 px-4 font-extrabold text-white">{formatPrice(inv.totalAmount)}</td>
                      <td className="py-3.5 px-4 text-xs font-bold text-emerald-400">
                        {formatPrice(inv.paidAmount)}
                        {inv.totalAmount > 0 && ` (${Math.round((inv.paidAmount / inv.totalAmount) * 100)}%)`}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-zinc-400 flex items-center">
                        <CreditCard className="h-3.5 w-3.5 mr-1 text-amber-400" />
                        {inv.paymentMethod}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            inv.status === 'paid' ? 'success' : inv.status === 'partially_paid' ? 'gold' : 'warning'
                          }
                        >
                          {inv.status === 'paid'
                            ? 'Payée'
                            : inv.status === 'partially_paid'
                              ? 'Acompte réglé'
                              : 'En attente'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-400"
                          onClick={() => handleDownloadPdf(inv)}
                          title="Télécharger / imprimer PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-zinc-500 text-xs flex items-center gap-2">
        <Download className="h-3.5 w-3.5" />
        Cliquez sur l&apos;icône PDF pour ouvrir la facture et l&apos;enregistrer via Imprimer → Enregistrer au format PDF.
      </p>
    </div>
  );
}
