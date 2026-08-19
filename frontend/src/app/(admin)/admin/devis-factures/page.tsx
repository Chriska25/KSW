'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, CreditCard, Download, Wallet, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { Select } from '@/components/ui/select';
import { useSettings } from '@/context/settings-context';
import { useAdminToast } from '@/components/admin/admin-toast';
import { LoadingState } from '@/components/common/loading-state';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminModal } from '@/components/admin/admin-modal';
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
        <p className="text-danger text-sm rounded-lg border border-danger/30 bg-danger-muted px-4 py-3">
          {error}
        </p>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2 space-y-0">
            <CardTitle className="text-caption font-semibold uppercase">Facturé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground tabular-nums">{formatPrice(summary.totalInvoiced)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 space-y-0">
            <CardTitle className="text-caption font-semibold uppercase">Encaissé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-success tabular-nums">{formatPrice(summary.totalPaid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 space-y-0">
            <CardTitle className="text-caption font-semibold uppercase">Solde restant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-primary tabular-nums">{formatPrice(summary.remaining)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-h2">Factures ({filteredInvoices.length})</CardTitle>
            <CardDescription>Acompte + solde — PDF imprimable avec détail des modes de paiement.</CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="N° facture, client…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° facture</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Prestation</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Réglé</TableHead>
                <TableHead>Solde</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableEmpty colSpan={9} message="Aucune facture — les réservations apparaîtront ici." />
              ) : (
                filteredInvoices.map((inv) => {
                  const remaining = inv.remainingAmount ?? Math.max(0, inv.totalAmount - inv.paidAmount);
                  const canRecordBalance =
                    inv.status === 'partially_paid' && remaining > 0.01 && (inv.paymentLines?.length || 0) <= 1;

                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs font-semibold text-primary">{inv.number}</TableCell>
                      <TableCell className="font-medium">{inv.clientName}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{inv.serviceTitle}</TableCell>
                      <TableCell className="font-semibold tabular-nums">{formatInvoiceAmount(inv.totalAmount, inv.currency)}</TableCell>
                      <TableCell className="text-xs font-semibold text-success tabular-nums">
                        {formatInvoiceAmount(inv.paidAmount, inv.currency)}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-primary tabular-nums">
                        {formatInvoiceAmount(remaining, inv.currency)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-start gap-1">
                          <CreditCard className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <span>{inv.paymentSummary || inv.paymentMethod}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            inv.status === 'paid' ? 'success' : inv.status === 'partially_paid' ? 'accent' : 'warning'
                          }
                        >
                          {inv.status === 'paid'
                            ? 'Soldée'
                            : inv.status === 'partially_paid'
                              ? 'Acompte réglé'
                              : 'En attente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          {canRecordBalance && (
                            <Button
                              variant="primary"
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
                            className="h-8 w-8 text-primary"
                            onClick={() => handleDownloadPdf(inv)}
                            title="Imprimer / PDF"
                            aria-label="Télécharger PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {superUser && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive/80"
                              onClick={() => handleDeleteInvoice(inv)}
                              title="Supprimer facture et réservation (super admin)"
                              aria-label="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AdminModal
        open={!!balanceInvoice}
        onClose={() => setBalanceInvoice(null)}
        title="Encaisser le solde"
        size="md"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setBalanceInvoice(null)}>
              Annuler
            </Button>
            <Button type="submit" form="balance-form" variant="primary" disabled={recordingBalance}>
              {recordingBalance ? 'Enregistrement…' : 'Valider et imprimer'}
            </Button>
          </>
        }
      >
        {balanceInvoice && (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {balanceInvoice.number} — {balanceInvoice.clientName}
            </p>
            <form id="balance-form" onSubmit={handleRecordBalance} className="space-y-4 text-sm">
              <div className="p-3 rounded-lg border border-border bg-surface-muted grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block">Total TTC</span>
                  <span className="text-foreground font-semibold">{formatPrice(balanceInvoice.totalAmount)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Déjà réglé</span>
                  <span className="text-success font-semibold">{formatPrice(balanceInvoice.paidAmount)}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block">Solde restant</span>
                  <span className="text-primary font-semibold text-lg">
                    {formatPrice(balanceInvoice.remainingAmount ?? 0)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-caption font-medium text-muted-foreground block mb-1.5">Montant encaissé</label>
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
                <label className="text-caption font-medium text-muted-foreground block mb-1.5">Mode de paiement du solde</label>
                <Select
                  value={balanceMethod}
                  onChange={(e) => setBalanceMethod(e.target.value as PaymentMethodType)}
                >
                  {BALANCE_PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="text-caption font-medium text-muted-foreground block mb-1.5">
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
                <label className="text-caption font-medium text-muted-foreground block mb-1.5">Notes internes (optionnel)</label>
                <Input
                  value={balanceNotes}
                  onChange={(e) => setBalanceNotes(e.target.value)}
                  placeholder="Commentaire admin…"
                />
              </div>

              {balanceError && (
                <p className="text-danger text-xs rounded-lg border border-danger/30 bg-danger-muted px-3 py-2">
                  {balanceError}
                </p>
              )}
            </form>
          </>
        )}
      </AdminModal>

      <p className="text-muted-foreground text-caption flex items-center gap-2">
        <Download className="h-3.5 w-3.5" />
        Cliquez sur l&apos;icône PDF pour imprimer ou enregistrer la facture (acompte + solde + modes de paiement).
      </p>
    </div>
  );
}
