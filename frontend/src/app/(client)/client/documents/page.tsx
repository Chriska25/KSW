'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { FileSpreadsheet, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/common/loading-state';
import { useSettings } from '@/context/settings-context';
import { fetchClientInvoices } from '@/lib/client-api';
import { exportInvoiceToPdf } from '@/lib/invoice-pdf';
import type { InvoiceRow } from '@/lib/admin-dashboard';
import { getApiErrorMessage } from '@/lib/api-error';

function formatEuro(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

function statusLabel(status: InvoiceRow['status']) {
  switch (status) {
    case 'paid':
      return 'Payée';
    case 'partially_paid':
      return 'Acompte réglé';
    default:
      return 'En attente';
  }
}

function statusVariant(status: InvoiceRow['status']): 'success' | 'gold' | 'warning' {
  if (status === 'paid') return 'success';
  if (status === 'partially_paid') return 'gold';
  return 'warning';
}

export default function ClientDocumentsPage() {
  return <ClientDocumentsContent />;
}

function ClientDocumentsContent() {
  const { settings } = useSettings();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [summary, setSummary] = useState({ totalInvoiced: 0, totalPaid: 0, remaining: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await fetchClientInvoices();
      setInvoices(res.data);
      setSummary(res.summary);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Impossible de charger vos documents.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handlePdf = (invoice: InvoiceRow) => {
    exportInvoiceToPdf(invoice, {
      studioName: settings.studioName,
      address: settings.address,
      phone: settings.phone,
      contactEmail: settings.contactEmail,
    });
  };

  if (loading) {
    return <LoadingState message="Chargement de vos factures…" />;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
          <FileSpreadsheet className="h-7 w-7 text-amber-400" />
          Devis & <span className="gold-gradient-text">Factures</span>
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Consultez et téléchargez vos documents liés à vos réservations.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="glass-panel">
          <CardContent className="pt-5 pb-5">
            <p className="text-[11px] text-zinc-500">Total facturé</p>
            <p className="text-xl font-bold text-white mt-1">{formatEuro(summary.totalInvoiced)}</p>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="pt-5 pb-5">
            <p className="text-[11px] text-zinc-500">Montant réglé</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">{formatEuro(summary.totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="pt-5 pb-5">
            <p className="text-[11px] text-zinc-500">Solde restant</p>
            <p className="text-xl font-bold text-amber-400 mt-1">{formatEuro(summary.remaining)}</p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <p className="text-rose-400 text-sm rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          {error}
        </p>
      )}

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-lg">Mes documents</CardTitle>
          <CardDescription>
            Cliquez sur PDF pour ouvrir la facture et l&apos;enregistrer via Imprimer → Enregistrer au format PDF.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {invoices.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-10">
              Aucun document — vos factures apparaîtront après une réservation.
            </p>
          ) : (
            invoices.map((inv) => (
              <div
                key={inv.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white font-mono text-sm">{inv.number}</span>
                    <Badge variant={statusVariant(inv.status)}>{statusLabel(inv.status)}</Badge>
                  </div>
                  <p className="text-xs text-zinc-400 truncate">{inv.serviceTitle}</p>
                  <p className="text-[11px] text-zinc-500">
                    Séance : {inv.dueDate} • Émission : {inv.issueDate}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right text-xs">
                    <p className="text-zinc-500">Total</p>
                    <p className="font-bold text-white">{formatEuro(inv.totalAmount)}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handlePdf(inv)} className="text-xs space-x-1.5">
                    <FileDown className="h-3.5 w-3.5" />
                    <span>PDF</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
