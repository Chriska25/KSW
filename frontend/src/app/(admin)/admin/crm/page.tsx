'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Mail, Phone, Eye, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/context/settings-context';
import { LoadingState } from '@/components/common/loading-state';
import {
  buildCrmClients,
  fetchAdminBookings,
  fetchAdminContactMessages,
} from '@/lib/admin-crm-api';
import { getApiErrorMessage } from '@/lib/api-error';

type CrmClient = ReturnType<typeof buildCrmClients>[number];

export default function AdminCrmPage() {
  const { formatPrice } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedClient, setSelectedClient] = useState<CrmClient | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'messages'>('history');

  const loadData = useCallback(async () => {
    setLoadError('');
    try {
      const [bookings, messages] = await Promise.all([
        fetchAdminBookings(),
        fetchAdminContactMessages(),
      ]);
      setClients(buildCrmClients(bookings, messages));
    } catch (err: unknown) {
      setLoadError(getApiErrorMessage(err, 'Impossible de charger le CRM.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const segments = useMemo(() => {
    const set = new Set(clients.map((c) => c.segment));
    return ['all', ...Array.from(set)];
  }, [clients]);

  const filteredClients = clients.filter((c) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q);
    const matchesSegment = selectedSegment === 'all' || c.segment === selectedSegment;
    return matchesSearch && matchesSegment;
  });

  if (loading) {
    return <LoadingState message="Chargement du CRM…" />;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">
            CRM & <span className="gold-gradient-text">Fiches Clients</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Clients agrégés depuis les réservations et messages de contact.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
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
            placeholder="Rechercher par nom, email, tél..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {segments.map((seg) => (
            <button
              key={seg}
              onClick={() => setSelectedSegment(seg)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                selectedSegment === seg
                  ? 'border-amber-400 bg-amber-400 text-zinc-950'
                  : 'border-zinc-800 glass-panel text-zinc-300 hover:border-zinc-700'
              }`}
            >
              {seg === 'all' ? 'Tous' : seg}
            </button>
          ))}
        </div>
      </div>

      <Card className="glass-panel space-y-4">
        <CardHeader>
          <CardTitle className="text-xl">Fichier Clients ({filteredClients.length})</CardTitle>
          <CardDescription>Données issues des réservations et leads contact.</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-8">Aucun client ou lead enregistré.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950/80 text-xs font-semibold uppercase text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Coordonnées</th>
                    <th className="py-3 px-4">Segment</th>
                    <th className="py-3 px-4">Dépenses</th>
                    <th className="py-3 px-4">Séances</th>
                    <th className="py-3 px-4 text-right">Fiche</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredClients.map((c) => (
                    <tr key={c.email} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">{c.name}</td>
                      <td className="py-3.5 px-4 text-xs space-y-0.5">
                        <div className="flex items-center">
                          <Mail className="h-3 w-3 mr-1 text-amber-400" /> {c.email}
                        </div>
                        <div className="text-zinc-500 flex items-center">
                          <Phone className="h-3 w-3 mr-1 text-amber-400" /> {c.phone}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="gold" className="text-[10px]">{c.segment}</Badge>
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-white">
                        {formatPrice(c.totalSpent)}
                      </td>
                      <td className="py-3.5 px-4 text-xs">{c.bookingsCount} réservation(s)</td>
                      <td className="py-3.5 px-4 text-right">
                        <Button variant="outline" size="sm" onClick={() => setSelectedClient(c)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> Consulter
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

      {selectedClient && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="glass-panel max-w-3xl w-full border-amber-400/40 max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-start justify-between border-b border-zinc-800 pb-4">
              <div>
                <CardTitle className="text-2xl text-white">{selectedClient.name}</CardTitle>
                <CardDescription className="text-xs">{selectedClient.email} • {selectedClient.phone}</CardDescription>
              </div>
              <button type="button" onClick={() => setSelectedClient(null)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </CardHeader>
            <CardContent className="space-y-6 text-xs">
              <div className="flex gap-3 border-b border-zinc-800 pb-2">
                {[
                  { id: 'history', label: 'Réservations' },
                  { id: 'messages', label: `Messages (${selectedClient.messages.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as 'history' | 'messages')}
                    className={`pb-2 font-semibold border-b-2 ${
                      activeTab === tab.id ? 'border-amber-400 text-amber-400' : 'border-transparent text-zinc-400'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'history' && (
                <div className="space-y-3">
                  {selectedClient.bookings.length === 0 ? (
                    <p className="text-zinc-500">Aucune réservation.</p>
                  ) : (
                    selectedClient.bookings.map((b) => (
                      <div key={b.id} className="p-3 rounded-xl border border-zinc-800 bg-zinc-950 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-white">{b.serviceTitle}</div>
                          <div className="text-zinc-400">{b.date} à {b.time}</div>
                          <div className="text-zinc-500">{formatPrice(b.totalPrice)} — statut: {b.status}</div>
                        </div>
                        {b.paymentStatus === 'paid' && <Badge variant="success">Acompte payé</Badge>}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'messages' && (
                <div className="space-y-3">
                  {selectedClient.messages.length === 0 ? (
                    <p className="text-zinc-500">Aucun message contact.</p>
                  ) : (
                    selectedClient.messages.map((m) => (
                      <div key={m.id} className="p-3 rounded-xl border border-zinc-800 bg-zinc-950 space-y-1">
                        <div className="flex items-center gap-2 text-amber-400">
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span className="font-semibold">{m.subject}</span>
                          <span className="text-zinc-500">{m.createdAt}</span>
                        </div>
                        <p className="text-zinc-300 whitespace-pre-wrap">{m.message}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {selectedClient.notes && (
                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400">
                  <strong className="text-zinc-300">Notes :</strong> {selectedClient.notes}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
