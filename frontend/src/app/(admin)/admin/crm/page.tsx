'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Mail, Phone, Eye, MessageSquare } from 'lucide-react';
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
import { LoadingState } from '@/components/common/loading-state';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminModal } from '@/components/admin/admin-modal';
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
      <AdminPageHeader
        title="CRM &"
        accent="Fiches Clients"
        description="Clients agrégés depuis les réservations et messages de contact."
        actions={
          <Button variant="outline" size="sm" onClick={loadData}>
            Actualiser
          </Button>
        }
      />

      {loadError && (
        <p className="text-danger text-sm rounded-lg border border-danger/30 bg-danger-muted px-4 py-3">
          {loadError}
        </p>
      )}

      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, email, tél…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {segments.map((seg) => (
              <button
                key={seg}
                type="button"
                onClick={() => setSelectedSegment(seg)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  selectedSegment === seg
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-surface-muted text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {seg === 'all' ? 'Tous' : seg}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-h2">Fichier clients ({filteredClients.length})</CardTitle>
          <CardDescription>Données issues des réservations et leads contact.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Coordonnées</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Dépenses</TableHead>
                <TableHead>Séances</TableHead>
                <TableHead className="text-right">Fiche</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length === 0 ? (
                <TableEmpty colSpan={6} message="Aucun client ou lead enregistré." />
              ) : (
                filteredClients.map((c) => (
                  <TableRow key={c.email}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-xs space-y-0.5">
                      <div className="flex items-center text-muted-foreground">
                        <Mail className="h-3 w-3 mr-1 text-primary shrink-0" /> {c.email}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Phone className="h-3 w-3 mr-1 text-primary shrink-0" /> {c.phone || '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="accent" className="text-[10px]">{c.segment}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      {formatPrice(c.totalSpent)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.bookingsCount} réservation(s)</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelectedClient(c)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Consulter
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AdminModal
        open={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        title={selectedClient?.name ?? 'Fiche client'}
        size="xl"
      >
        {selectedClient && (
          <div className="space-y-6 text-sm">
            <p className="text-muted-foreground text-xs">
              {selectedClient.email} • {selectedClient.phone || '—'}
            </p>

            <div className="flex gap-3 border-b border-border pb-2">
              {[
                { id: 'history', label: 'Réservations' },
                { id: 'messages', label: `Messages (${selectedClient.messages.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as 'history' | 'messages')}
                  className={`pb-2 font-semibold border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'history' && (
              <div className="space-y-3">
                {selectedClient.bookings.length === 0 ? (
                  <p className="text-muted-foreground">Aucune réservation.</p>
                ) : (
                  selectedClient.bookings.map((b) => (
                    <div key={b.id} className="p-3 rounded-lg border border-border bg-surface-muted flex justify-between items-center gap-4">
                      <div>
                        <div className="font-semibold text-foreground">{b.serviceTitle}</div>
                        <div className="text-muted-foreground text-xs">{b.date} à {b.time}</div>
                        <div className="text-caption">{formatPrice(b.totalPrice)} — {b.status}</div>
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
                  <p className="text-muted-foreground">Aucun message contact.</p>
                ) : (
                  selectedClient.messages.map((m) => (
                    <div key={m.id} className="p-3 rounded-lg border border-border bg-surface-muted space-y-1">
                      <div className="flex items-center gap-2 text-primary">
                        <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-semibold">{m.subject}</span>
                        <span className="text-muted-foreground text-xs">{m.createdAt}</span>
                      </div>
                      <p className="text-foreground whitespace-pre-wrap text-xs">{m.message}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {selectedClient.notes && (
              <div className="p-3 rounded-lg border border-border bg-surface-muted text-muted-foreground text-xs">
                <strong className="text-foreground">Notes :</strong> {selectedClient.notes}
              </div>
            )}
          </div>
        )}
      </AdminModal>
    </div>
  );
}
