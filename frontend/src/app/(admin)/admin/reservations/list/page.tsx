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
import { useSettings } from '@/context/settings-context';
import { useAdminToast } from '@/components/admin/admin-toast';
import { galleryAccessUrl } from '@/lib/gallery-access-path';
import { LoadingState } from '@/components/common/loading-state';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
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
        <p className="text-rose-400 text-sm rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          {loadError}
        </p>
      )}

      <div className="glass-panel p-4 rounded-2xl border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 absolute left-3 top-3 text-zinc-500" />
          <Input
            placeholder="Rechercher par référence, client..."
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
              onClick={() => setStatusFilter(btn.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                statusFilter === btn.id
                  ? 'border-amber-400 bg-amber-400 text-zinc-950'
                  : 'border-zinc-800 glass-panel text-zinc-300 hover:border-zinc-700'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="glass-panel space-y-4">
        <CardHeader>
          <CardTitle className="text-xl">Agenda & Demandes ({filteredBookings.length})</CardTitle>
          <CardDescription>Réservations enregistrées via le site public (Stripe, Mobile Money).</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-8">Aucune réservation pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950/80 text-xs font-semibold uppercase text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Réf.</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Prestation</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Tarif / Acompte</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-amber-400">{b.reference}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{b.clientName}</div>
                        <div className="text-xs text-zinc-500">{b.clientEmail}</div>
                        {b.galleryAccessKey && (
                          <div className="text-[10px] text-amber-400/80 mt-1 font-mono flex items-center gap-1">
                            <Key className="h-3 w-3" /> {b.galleryAccessKey}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">{b.serviceTitle}</td>
                      <td className="py-3.5 px-4 text-xs">
                        <div className="flex items-center text-white">
                          <CalendarIcon className="h-3.5 w-3.5 mr-1 text-amber-400" /> {b.date}
                        </div>
                        <div className="flex items-center text-zinc-400">
                          <Clock className="h-3.5 w-3.5 mr-1 text-amber-400" /> {b.startTime}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-white">{formatPrice(b.totalAmount)}</div>
                        <div className="text-xs text-emerald-400">Acompte: {formatPrice(b.depositAmount)}</div>
                        {b.paymentStatus === 'paid' && (
                          <div className="text-[10px] text-emerald-400 mt-0.5">
                            {b.paymentMethod === 'Mobile Money' ? 'Mobile Money ✓' : 'Stripe ✓'}
                          </div>
                        )}
                        {b.paymentStatus === 'mobile_money_pending' && (
                          <div className="text-[10px] text-amber-400 mt-0.5">
                            Mobile Money en attente
                            {b.mobileMoneyReference ? ` • ${b.mobileMoneyReference}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
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
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(b)}>
                          <Edit className="h-3.5 w-3.5 mr-1" /> Modifier
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleOpenGalleryModal(b)}>
                          <Key className="h-3.5 w-3.5 mr-1" /> Galerie
                        </Button>
                        {b.paymentStatus === 'mobile_money_pending' && (
                          <Button
                            variant="gold"
                            size="sm"
                            onClick={() => handleOpenMobileMoneyConfirm(b)}
                          >
                            Valider MM
                          </Button>
                        )}
                        {b.status === 'pending' && (
                          <Button variant="gold" size="sm" onClick={() => handleUpdateStatus(b.id, 'confirmed')}>
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {isEditModalOpen && editingBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="glass-panel max-w-lg w-full border-amber-400/40">
            <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 pb-3">
              <CardTitle className="text-xl">Modifier {editingBooking.reference}</CardTitle>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
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
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" variant="gold" disabled={saving}>
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {mmConfirmBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="glass-panel max-w-md w-full border-amber-400/40">
            <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <CardTitle className="text-xl">Valider le paiement Mobile Money</CardTitle>
                <CardDescription className="mt-1">
                  {mmConfirmBooking.reference} — {mmConfirmBooking.clientName}
                </CardDescription>
              </div>
              <button
                type="button"
                onClick={() => setMmConfirmBooking(null)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConfirmMobileMoney} className="space-y-4 text-sm">
                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950 space-y-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <span className="text-zinc-400">Réf. déclarée par le client</span>
                    <code className="text-amber-400 font-mono">
                      {mmConfirmBooking.mobileMoneyReference || '—'}
                    </code>
                  </div>
                  {mmConfirmBooking.mobileMoneyPhone && (
                    <div className="flex justify-between gap-3">
                      <span className="text-zinc-400">Numéro Mobile Money</span>
                      <span className="text-white">{mmConfirmBooking.mobileMoneyPhone}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <span className="text-zinc-400">Acompte attendu</span>
                    <span className="text-emerald-400 font-semibold">
                      {formatPrice(mmConfirmBooking.depositAmount)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1 font-semibold">
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
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Saisissez la référence reçue sur votre compte Mobile Money. Elle doit correspondre à celle du client.
                  </p>
                </div>

                {mmConfirmError && (
                  <p className="text-rose-400 text-xs rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2">
                    {mmConfirmError}
                  </p>
                )}

                <div className="flex justify-end gap-3 pt-1">
                  <Button type="button" variant="outline" onClick={() => setMmConfirmBooking(null)}>
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    variant="gold"
                    disabled={confirmingPaymentId === mmConfirmBooking.id || !mmConfirmReference.trim()}
                  >
                    {confirmingPaymentId === mmConfirmBooking.id
                      ? 'Validation…'
                      : 'Valider et confirmer la séance'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {galleryModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="glass-panel max-w-lg w-full border-amber-400/40">
            <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Key className="h-5 w-5 text-amber-400" />
                  Galerie — {galleryModalBooking.reference}
                </CardTitle>
                <CardDescription className="mt-1">
                  {galleryModalBooking.clientName} • {galleryModalBooking.serviceTitle}
                </CardDescription>
              </div>
              <button
                type="button"
                onClick={() => setGalleryModalBooking(null)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {galleryLoading ? (
                <p className="text-zinc-400 text-center py-6">Chargement de la galerie…</p>
              ) : galleryAccess ? (
                <>
                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-3">
                    <div className="font-semibold text-white">{galleryAccess.title}</div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-zinc-400 text-xs">Lien d&apos;accès</span>
                      <div className="flex items-center gap-2 min-w-0">
                        <code className="text-zinc-300 font-mono text-[10px] truncate max-w-[180px]">
                          {galleryAccessUrl(galleryAccess.accessKey).replace(/^https?:\/\//, '')}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('Lien galerie', galleryAccessUrl(galleryAccess.accessKey))}
                          className="text-zinc-500 hover:text-amber-400 shrink-0"
                          title="Copier le lien complet"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-zinc-400 text-xs">Clé d&apos;accès</span>
                      <div className="flex items-center gap-2">
                        <code className="text-amber-400 font-mono text-xs">{galleryAccess.accessKey}</code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('Clé', galleryAccess.accessKey)}
                          className="text-zinc-500 hover:text-amber-400"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {galleryAccess.password && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-zinc-400 text-xs">Mot de passe</span>
                        <div className="flex items-center gap-2">
                          <code className="text-white font-mono text-xs">{galleryAccess.password}</code>
                          <button
                            type="button"
                            onClick={() => copyToClipboard('Mot de passe', galleryAccess.password || '')}
                            className="text-zinc-500 hover:text-amber-400"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="gold"
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
                  <p className="text-[11px] text-zinc-500">
                    La galerie est créée automatiquement à la réservation. Ajoutez les photos de séance depuis l&apos;espace Galeries.
                  </p>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
