'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, CreditCard, Download, Wallet, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/context/settings-context';
import { useAdminToast } from '@/components/admin/admin-toast';
import { LoadingState } from '@/components/common/loading-state';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { fetchAdminBookings, recordBalancePayment, deleteBookingPermanently } from '@/lib/admin-crm-api';
import { bookingsToInvoices, computeInvoiceSummary, type InvoiceRow } from '@/lib/admin-dashboard';
import { BALANCE_PAYMENT_METHODS, type PaymentMethodType } from '@/lib/invoice-utils';
import { getApiErrorMessage } from '@/lib/api-error';
import { exportInvoiceToPdf } from '@/lib/invoice-pdf';
import { buildInvoiceStudioInfo } from '@/lib/invoice-studio-info';
import { formatMoneyAmount, resolveStudioCurrency } from '@/lib/currency';
import { useSessionUser } from '@/hooks/use-session-user';
import { isSuperUser } from '@/lib/session';

export default function AdminDevisFacturesPage() {
  const { formatPrice, settings } = useSettings();
  const { toast } = useAdminToast();
  const { user } = useSessionUser();
  const superUser = isSuperUser(user);
  const [searchTerm, setSearchTerm] = useState('');
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [balanceInvoice, setBalanceInvoice] = useState<InvoiceRow | null>(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceMethod, setBalanceMethod] = useState<PaymentMethodType>('Virement');
  const [balanceReference, setBalanceReference] = useState('');
  const [balanceNotes, setBalanceNotes] = useState('');
  const [balanceError, setBalanceError] = useState('');
  const [recordingBalance, setRecordingBalance] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const bookings = await fetchAdminBookings();
      setInvoices(bookingsToInvoices(bookings, resolveStudioCurrency(settings.currency)));
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Impossible de charger les factures.'));
    } finally {
      setLoading(false);
    }
  }, [settings.currency]);

  useEffect(() => {
    load();
  }, [load]);

  const formatInvoiceAmount = useCallback(
    (amount: number, currency?: string) =>
      formatMoneyAmount(amount, resolveStudioCurrency(currency || settings.currency)),
    [settings.currency]
  );

  const summary = useMemo(() => computeInvoiceSummary(invoices), [invoices]);

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const studioInfo = buildInvoiceStudioInfo(settings);

  const handleDownloadPdf = (inv: InvoiceRow) => {
    exportInvoiceToPdf(inv, studioInfo);
  };

  const handleOpenBalanceModal = (inv: InvoiceRow) => {
    const remaining = inv.remainingAmount ?? Math.max(0, inv.totalAmount - inv.paidAmount);
    setBalanceInvoice(inv);
    setBalanceAmount(String(remaining));
    setBalanceMethod('Virement');
    setBalanceReference('');
    setBalanceNotes('');
    setBalanceError('');
  };

  const handleRecordBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceInvoice) return;
    setRecordingBalance(true);
    setBalanceError('');
    try {
      const { invoice } = await recordBalancePayment(balanceInvoice.id, {
        amount: Number(balanceAmount),
        paymentMethod: balanceMethod,
        transactionReference: balanceReference || undefined,
        notes: balanceNotes || undefined,
      });
      setInvoices((prev) => prev.map((inv) => (inv.id === invoice.id ? invoice : inv)));
      toast('Solde enregistré — facture mise à jour', 'success');
      setBalanceInvoice(null);
      exportInvoiceToPdf(invoice, studioInfo);
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, 'Impossible d\'enregistrer le solde.');
      setBalanceError(message);
      toast(message, 'error');
    } finally {
      setRecordingBalance(false);
    }
  };

  const handleDeleteInvoice = async (inv: InvoiceRow) => {
    if (
      !window.confirm(
        `Supprimer définitivement la facture ${inv.number} ?\nLa réservation associée sera également effacée.`
      )
    ) {
      return;
    }
    try {
      await deleteBookingPermanently(inv.id);
      setInvoices((prev) => prev.filter((row) => row.id !== inv.id));
      toast('Facture et réservation supprimées', 'success');
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Suppression impossible.'), 'error');
    }
  };

  if (loading) {
    return <LoadingState message="Chargement des factures…" />;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <AdminPageHeader
        title="Devis &"
        accent="Factures"
        description="Acomptes, soldes et factures imprimables par réservation."
        actions={
          <Button variant="outline" size="sm" onClick={load}>
            Actualiser
          </Button>
        }
      />

      {error && (
        <p className="text-rose-400 text-sm rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          {error}
        </p>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="glass-panel">
          <CardContent className="pt-6">
            <span className="text-xs text-zinc-400 font-semibold uppercase">Facturé</span>
            <div className="text-3xl font-extrabold text-white mt-1">{formatPrice(summary.totalInvoiced)}</div>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="pt-6">
            <span className="text-xs text-zinc-400 font-semibold uppercase">Encaissé</span>
            <div className="text-3xl font-extrabold text-emerald-400 mt-1">{formatPrice(summary.totalPaid)}</div>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="pt-6">
            <span className="text-xs text-zinc-400 font-semibold uppercase">Solde restant</span>
            <div className="text-3xl font-extrabold text-amber-400 mt-1">{formatPrice(summary.remaining)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Factures ({filteredInvoices.length})</CardTitle>
            <CardDescription>Acompte + solde — PDF imprimable avec détail des modes de paiement.</CardDescription>
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
                    <th className="py-3 px-4">Solde</th>
                    <th className="py-3 px-4">Paiement</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredInvoices.map((inv) => {
                    const remaining = inv.remainingAmount ?? Math.max(0, inv.totalAmount - inv.paidAmount);
                    const canRecordBalance =
                      inv.status === 'partially_paid' && remaining > 0.01 && (inv.paymentLines?.length || 0) <= 1;

                    return (
                      <tr key={inv.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-amber-400">{inv.number}</td>
                        <td className="py-3.5 px-4 font-semibold text-white">{inv.clientName}</td>
                        <td className="py-3.5 px-4 text-zinc-300 text-xs">{inv.serviceTitle}</td>
                        <td className="py-3.5 px-4 font-extrabold text-white">{formatInvoiceAmount(inv.totalAmount, inv.currency)}</td>
                        <td className="py-3.5 px-4 text-xs font-bold text-emerald-400">
                          {formatInvoiceAmount(inv.paidAmount, inv.currency)}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-bold text-amber-400">
                          {formatInvoiceAmount(remaining, inv.currency)}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-zinc-400">
                          <div className="flex items-start gap-1">
                            <CreditCard className="h-3.5 w-3.5 mr-0.5 text-amber-400 shrink-0 mt-0.5" />
                            <span>{inv.paymentSummary || inv.paymentMethod}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              inv.status === 'paid' ? 'success' : inv.status === 'partially_paid' ? 'gold' : 'warning'
                            }
                          >
                            {inv.status === 'paid'
                              ? 'Soldée'
                              : inv.status === 'partially_paid'
                                ? 'Acompte réglé'
                                : 'En attente'}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1">
                          {canRecordBalance && (
                            <Button
                              variant="gold"
                              size="sm"
                              className="text-xs h-8"
                              onClick={() => handleOpenBalanceModal(inv)}
                            >
                              <Wallet className="h-3.5 w-3.5 mr-1" />
                              Solde
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-400"
                            onClick={() => handleDownloadPdf(inv)}
                            title="Imprimer / PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {superUser && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-500 hover:text-rose-400"
                              onClick={() => handleDeleteInvoice(inv)}
                              title="Supprimer facture et réservation (super admin)"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {balanceInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="glass-panel max-w-md w-full border-amber-400/40">
            <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <CardTitle className="text-xl">Encaisser le solde</CardTitle>
                <CardDescription className="mt-1">
                  {balanceInvoice.number} — {balanceInvoice.clientName}
                </CardDescription>
              </div>
              <button
                type="button"
                onClick={() => setBalanceInvoice(null)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRecordBalance} className="space-y-4 text-sm">
                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-zinc-500 block">Total TTC</span>
                    <span className="text-white font-bold">{formatPrice(balanceInvoice.totalAmount)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Déjà réglé</span>
                    <span className="text-emerald-400 font-bold">{formatPrice(balanceInvoice.paidAmount)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-zinc-500 block">Solde restant</span>
                    <span className="text-amber-400 font-bold text-lg">
                      {formatPrice(balanceInvoice.remainingAmount ?? 0)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1 font-semibold">Montant encaissé</label>
                  <Input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1 font-semibold">Mode de paiement du solde</label>
                  <select
                    value={balanceMethod}
                    onChange={(e) => setBalanceMethod(e.target.value as PaymentMethodType)}
                    className="w-full h-10 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-white"
                  >
                    {BALANCE_PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1 font-semibold">
                    Référence transaction (optionnel)
                  </label>
                  <Input
                    placeholder="Ex: TXN-123456"
                    value={balanceReference}
                    onChange={(e) => setBalanceReference(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1 font-semibold">Notes internes (optionnel)</label>
                  <Input
                    value={balanceNotes}
                    onChange={(e) => setBalanceNotes(e.target.value)}
                    placeholder="Commentaire admin…"
                  />
                </div>

                {balanceError && (
                  <p className="text-rose-400 text-xs rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2">
                    {balanceError}
                  </p>
                )}

                <div className="flex justify-end gap-3 pt-1">
                  <Button type="button" variant="outline" onClick={() => setBalanceInvoice(null)}>
                    Annuler
                  </Button>
                  <Button type="submit" variant="gold" disabled={recordingBalance}>
                    {recordingBalance ? 'Enregistrement…' : 'Valider et imprimer la facture'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <p className="text-zinc-500 text-xs flex items-center gap-2">
        <Download className="h-3.5 w-3.5" />
        Cliquez sur l&apos;icône PDF pour imprimer ou enregistrer la facture (acompte + solde + modes de paiement).
      </p>
    </div>
  );
}
