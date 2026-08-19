'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Search,
  Edit,
  Key,
  Mail,
  ExternalLink,
  Copy,
  Trash2,
} from 'lucide-react';
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
import { useSettings } from '@/context/settings-context';
import { useAdminToast } from '@/components/admin/admin-toast';
import { galleryAccessUrl } from '@/lib/gallery-access-path';
import { LoadingState } from '@/components/common/loading-state';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminModal } from '@/components/admin/admin-modal';
import {
  fetchAdminBookings,
  mapBookingToRow,
  updateBooking,
  updateBookingStatus,
  confirmMobileMoneyPayment,
  fetchBookingGallery,
  sendBookingGalleryAccess,
  deleteBookingPermanently,
  type BookingGalleryAccess,
} from '@/lib/admin-crm-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { useSessionUser } from '@/hooks/use-session-user';
import { isSuperUser } from '@/lib/session';

type BookingRow = ReturnType<typeof mapBookingToRow>;

export default function AdminReservationsPage() {
  const router = useRouter();
  const { formatPrice } = useSettings();
  const { toast } = useAdminToast();
  const { user } = useSessionUser();
  const superUser = isSuperUser(user);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editingBooking, setEditingBooking] = useState<BookingRow | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<BookingRow>>({});
  const [saving, setSaving] = useState(false);
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<string | null>(null);
  const [mmConfirmBooking, setMmConfirmBooking] = useState<BookingRow | null>(null);
  const [mmConfirmReference, setMmConfirmReference] = useState('');
  const [mmConfirmError, setMmConfirmError] = useState('');
  const [galleryModalBooking, setGalleryModalBooking] = useState<BookingRow | null>(null);
  const [galleryAccess, setGalleryAccess] = useState<BookingGalleryAccess | null>(null);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [sendingGalleryEmail, setSendingGalleryEmail] = useState(false);

  const loadBookings = useCallback(async () => {
    setLoadError('');
    try {
      const data = await fetchAdminBookings();
      setBookings(data.map(mapBookingToRow));
    } catch (err: unknown) {
      setLoadError(getApiErrorMessage(err, 'Impossible de charger les réservations.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleOpenEdit = (b: BookingRow) => {
    setEditingBooking(b);
    setEditForm({ ...b });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;
    setSaving(true);
    try {
      const updated = await updateBooking(editingBooking.id, {
        first_name: editForm.clientName?.split(' ')[0],
        last_name: editForm.clientName?.split(' ').slice(1).join(' '),
        email: editForm.clientEmail,
        service_title: editForm.serviceTitle,
        date: editForm.date,
        time: editForm.startTime,
        location: editForm.location,
        total_price: editForm.totalAmount,
        deposit_amount: editForm.depositAmount,
      });
      setBookings((prev) =>
        prev.map((b) => (b.id === editingBooking.id ? mapBookingToRow(updated) : b))
      );
      setIsEditModalOpen(false);
      toast('Réservation mise à jour', 'success');
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Erreur lors de la sauvegarde.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (
    id: string,
    newStatus: BookingRow['status']
  ) => {
    try {
      const updated = await updateBookingStatus(id, newStatus);
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? mapBookingToRow(updated) : b))
      );
      toast('Statut mis à jour', 'success');
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Impossible de mettre à jour le statut.'), 'error');
    }
  };

  const handleDeleteBooking = async (b: BookingRow) => {
    if (
      !window.confirm(
        `Supprimer définitivement la réservation ${b.reference} ?\nLa facture associée sera également effacée. Cette action est irréversible.`
      )
    ) {
      return;
    }
    try {
      await deleteBookingPermanently(b.id);
      setBookings((prev) => prev.filter((row) => row.id !== b.id));
      toast('Réservation supprimée définitivement', 'success');
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Suppression impossible.'), 'error');
    }
  };

  const handleOpenMobileMoneyConfirm = (booking: BookingRow) => {
    setMmConfirmBooking(booking);
    setMmConfirmReference(booking.mobileMoneyReference || '');
    setMmConfirmError('');
  };

  const handleConfirmMobileMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mmConfirmBooking) return;
    setConfirmingPaymentId(mmConfirmBooking.id);
    setMmConfirmError('');
    try {
      const updated = await confirmMobileMoneyPayment(mmConfirmBooking.id, mmConfirmReference);
      setBookings((prev) =>
        prev.map((b) => (b.id === mmConfirmBooking.id ? mapBookingToRow(updated) : b))
      );
      toast('Paiement validé — email de confirmation envoyé au client', 'success');
      setMmConfirmBooking(null);
      setMmConfirmReference('');
    } catch (err: unknown) {
      const message = getApiErrorMessage(
        err,
        'Impossible de confirmer le paiement Mobile Money.'
      );
      setMmConfirmError(message);
      toast(message, 'error');
    } finally {
      setConfirmingPaymentId(null);
    }
  };

  const handleOpenGalleryModal = async (booking: BookingRow) => {
    setGalleryModalBooking(booking);
    setGalleryAccess(null);
    setGalleryLoading(true);
    try {
      const data = await fetchBookingGallery(booking.id);
      setGalleryAccess(data);
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Impossible de charger la galerie.'), 'error');
      setGalleryModalBooking(null);
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleSendGalleryAccess = async () => {
    if (!galleryModalBooking) return;
    setSendingGalleryEmail(true);
    try {
      const data = await sendBookingGalleryAccess(galleryModalBooking.id);
      setGalleryAccess(data);
      setBookings((prev) =>
        prev.map((b) =>
          b.id === galleryModalBooking.id
            ? { ...b, galleryId: data.id, galleryAccessKey: data.accessKey }
            : b
        )
      );
      toast(`Accès galerie envoyé à ${galleryModalBooking.clientEmail}`, 'success');
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Envoi email impossible.'), 'error');
    } finally {
      setSendingGalleryEmail(false);
    }
  };

  const copyToClipboard = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast(`${label} copié`, 'success');
    } catch {
      toast('Copie impossible', 'error');
    }
  };

  const handleManageGalleryPhotos = () => {
    if (!galleryAccess?.id) return;
    setGalleryModalBooking(null);
    router.push(`/admin/galeries?galleryId=${encodeURIComponent(galleryAccess.id)}`);
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.serviceTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <LoadingState message="Chargement des réservations…" />;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <AdminPageHeader
        title="Liste des"
        accent="Réservations"
        description="Gestion détaillée — statuts, paiements, galeries et édition."
        actions={
          <Button variant="outline" size="sm" onClick={loadBookings}>
            Actualiser
          </Button>
        }
      />

      {loadError && (
        <p className="text-small text-danger rounded-lg border border-danger/25 bg-danger-muted px-4 py-3" role="alert">
          {loadError}
        </p>
      )}

      <div className="surface rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            placeholder="Rechercher par référence, client…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'Toutes' },
            { id: 'pending', label: 'En attente' },
            { id: 'confirmed', label: 'Confirmées' },
            { id: 'completed', label: 'Effectuées' },
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setStatusFilter(btn.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                statusFilter === btn.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-surface-muted text-muted-foreground hover:text-foreground hover:border-primary/30'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agenda & demandes ({filteredBookings.length})</CardTitle>
          <CardDescription>Réservations enregistrées via le site public (Stripe, Mobile Money).</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Aucune réservation pour le moment.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Réf.</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Prestation</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Tarif / Acompte</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs text-primary">{b.reference}</TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{b.clientName}</div>
                      <div className="text-caption">{b.clientEmail}</div>
                      {b.galleryAccessKey && (
                        <div className="text-caption mt-1 font-mono flex items-center gap-1 text-primary">
                          <Key className="h-3 w-3" aria-hidden /> {b.galleryAccessKey}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{b.serviceTitle}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center text-foreground gap-1">
                        <CalendarIcon className="h-3.5 w-3.5 text-primary" aria-hidden /> {b.date}
                      </div>
                      <div className="flex items-center text-muted-foreground gap-1 mt-0.5">
                        <Clock className="h-3.5 w-3.5" aria-hidden /> {b.startTime}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium tabular-nums">{formatPrice(b.totalAmount)}</div>
                      <div className="text-caption text-success">Acompte: {formatPrice(b.depositAmount)}</div>
                      {b.paymentStatus === 'paid' && (
                        <div className="text-caption text-success mt-0.5">
                          {b.paymentMethod === 'Mobile Money' ? 'Mobile Money ✓' : 'Stripe ✓'}
                        </div>
                      )}
                      {b.paymentStatus === 'mobile_money_pending' && (
                        <div className="text-caption text-warning mt-0.5">
                          Mobile Money en attente
                          {b.mobileMoneyReference ? ` • ${b.mobileMoneyReference}` : ''}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          b.status === 'confirmed'
                            ? 'success'
                            : b.status === 'pending'
                              ? 'warning'
                              : 'outline'
                        }
                      >
                        {b.status === 'confirmed'
                          ? 'Confirmé'
                          : b.status === 'pending'
                            ? 'En attente'
                            : b.status === 'completed'
                              ? 'Effectué'
                              : 'Annulé'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(b)}>
                          <Edit className="h-3.5 w-3.5 mr-1" /> Modifier
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleOpenGalleryModal(b)}>
                          <Key className="h-3.5 w-3.5 mr-1" /> Galerie
                        </Button>
                        {b.paymentStatus === 'mobile_money_pending' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenMobileMoneyConfirm(b)}
                          >
                            Valider MM
                          </Button>
                        )}
                        {b.status === 'pending' && (
                          <Button variant="primary" size="sm" onClick={() => handleUpdateStatus(b.id, 'confirmed')}>
                            Valider
                          </Button>
                        )}
                        {b.status === 'confirmed' && (
                          <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(b.id, 'completed')}>
                            Terminer
                          </Button>
                        )}
                        {b.status !== 'cancelled' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleUpdateStatus(b.id, 'cancelled')}
                          >
                            Annuler
                          </Button>
                        )}
                        {superUser && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                            onClick={() => handleDeleteBooking(b)}
                            title="Suppression définitive (super admin)"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Suppr.
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AdminModal
        open={isEditModalOpen && !!editingBooking}
        onClose={() => setIsEditModalOpen(false)}
        title={editingBooking ? `Modifier ${editingBooking.reference}` : 'Modifier'}
        size="md"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" form="edit-booking-form" variant="primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <form id="edit-booking-form" onSubmit={handleSaveEdit} className="space-y-4 text-sm">
          <Input
            required
            value={editForm.clientName || ''}
            onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
            placeholder="Nom client"
          />
          <Input
            type="email"
            required
            value={editForm.clientEmail || ''}
            onChange={(e) => setEditForm({ ...editForm, clientEmail: e.target.value })}
            placeholder="Email"
          />
          <Input
            required
            value={editForm.serviceTitle || ''}
            onChange={(e) => setEditForm({ ...editForm, serviceTitle: e.target.value })}
            placeholder="Prestation"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input type="date" value={editForm.date || ''} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
            <Input value={editForm.startTime || ''} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} placeholder="Heure" />
          </div>
        </form>
      </AdminModal>

      <AdminModal
        open={!!mmConfirmBooking}
        onClose={() => setMmConfirmBooking(null)}
        title="Valider le paiement Mobile Money"
        size="md"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setMmConfirmBooking(null)}>
              Annuler
            </Button>
            <Button
              type="submit"
              form="mm-confirm-form"
              variant="primary"
              disabled={!mmConfirmBooking || confirmingPaymentId === mmConfirmBooking.id || !mmConfirmReference.trim()}
            >
              {mmConfirmBooking && confirmingPaymentId === mmConfirmBooking.id
                ? 'Validation…'
                : 'Valider et confirmer'}
            </Button>
          </>
        }
      >
        {mmConfirmBooking && (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {mmConfirmBooking.reference} — {mmConfirmBooking.clientName}
            </p>
            <form id="mm-confirm-form" onSubmit={handleConfirmMobileMoney} className="space-y-4 text-sm">
              <div className="p-3 rounded-lg border border-border bg-surface-muted space-y-2 text-xs">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Réf. déclarée par le client</span>
                  <code className="text-primary font-mono">
                    {mmConfirmBooking.mobileMoneyReference || '—'}
                  </code>
                </div>
                {mmConfirmBooking.mobileMoneyPhone && (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Numéro Mobile Money</span>
                    <span className="text-foreground">{mmConfirmBooking.mobileMoneyPhone}</span>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Acompte attendu</span>
                  <span className="text-success font-semibold">
                    {formatPrice(mmConfirmBooking.depositAmount)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-caption font-medium text-muted-foreground block mb-1.5">
                  Référence de transaction à vérifier
                </label>
                <Input
                  required
                  placeholder="Ex: TXN-123456789"
                  value={mmConfirmReference}
                  onChange={(e) => {
                    setMmConfirmReference(e.target.value);
                    setMmConfirmError('');
                  }}
                  className="font-mono"
                />
                <p className="text-caption text-muted-foreground mt-1">
                  Saisissez la référence reçue sur votre compte Mobile Money.
                </p>
              </div>

              {mmConfirmError && (
                <p className="text-danger text-xs rounded-lg border border-danger/30 bg-danger-muted px-3 py-2">
                  {mmConfirmError}
                </p>
              )}
            </form>
          </>
        )}
      </AdminModal>

      <AdminModal
        open={!!galleryModalBooking}
        onClose={() => setGalleryModalBooking(null)}
        title={galleryModalBooking ? `Galerie — ${galleryModalBooking.reference}` : 'Galerie'}
        size="md"
      >
        {galleryModalBooking && (
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              {galleryModalBooking.clientName} • {galleryModalBooking.serviceTitle}
            </p>
            {galleryLoading ? (
              <p className="text-muted-foreground text-center py-6">Chargement de la galerie…</p>
            ) : galleryAccess ? (
              <>
                <div className="p-4 rounded-lg border border-border bg-surface-muted space-y-3">
                  <div className="font-semibold text-foreground">{galleryAccess.title}</div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground text-xs">Lien d&apos;accès</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <code className="text-foreground font-mono text-caption truncate max-w-[180px]">
                        {galleryAccessUrl(galleryAccess.accessKey).replace(/^https?:\/\//, '')}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('Lien galerie', galleryAccessUrl(galleryAccess.accessKey))}
                        className="text-muted-foreground hover:text-primary shrink-0"
                        title="Copier le lien complet"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground text-xs">Clé d&apos;accès</span>
                    <div className="flex items-center gap-2">
                      <code className="text-primary font-mono text-xs">{galleryAccess.accessKey}</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('Clé', galleryAccess.accessKey)}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {galleryAccess.password && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground text-xs">Mot de passe</span>
                      <div className="flex items-center gap-2">
                        <code className="text-foreground font-mono text-xs">{galleryAccess.password}</code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('Mot de passe', galleryAccess.password || '')}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={sendingGalleryEmail}
                    onClick={handleSendGalleryAccess}
                  >
                    <Mail className="h-3.5 w-3.5 mr-1" />
                    {sendingGalleryEmail ? 'Envoi…' : `Envoyer à ${galleryModalBooking.clientEmail}`}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleManageGalleryPhotos}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Gérer les photos
                  </Button>
                </div>
                <p className="text-caption text-muted-foreground">
                  La galerie est créée automatiquement à la réservation. Ajoutez les photos depuis l&apos;espace Galeries.
                </p>
              </>
            ) : null}
          </div>
        )}
      </AdminModal>
    </div>
  );
}
