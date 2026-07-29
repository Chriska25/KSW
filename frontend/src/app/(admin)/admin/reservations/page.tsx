'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Search,
  Edit,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/context/settings-context';
import { useAdminToast } from '@/components/admin/admin-toast';
import { LoadingState } from '@/components/common/loading-state';
import {
  fetchAdminBookings,
  mapBookingToRow,
  updateBooking,
  updateBookingStatus,
} from '@/lib/admin-crm-api';
import { getApiErrorMessage } from '@/lib/api-error';

type BookingRow = ReturnType<typeof mapBookingToRow>;

export default function AdminReservationsPage() {
  const { formatPrice } = useSettings();
  const { toast } = useAdminToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editingBooking, setEditingBooking] = useState<BookingRow | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<BookingRow>>({});
  const [saving, setSaving] = useState(false);

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">
            Gestion du <span className="gold-gradient-text">Planning & Réservations</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Demandes entrantes depuis le tunnel public — données synchronisées avec la base.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadBookings}>
          Actualiser
        </Button>
      </div>

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
          <CardDescription>Réservations enregistrées via le site public et Stripe.</CardDescription>
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
                          <div className="text-[10px] text-emerald-400 mt-0.5">Stripe ✓</div>
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
    </div>
  );
}
