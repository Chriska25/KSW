'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  MessageSquare,
  Send,
  CreditCard,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/common/loading-state';
import { useAdminToast } from '@/components/admin/admin-toast';
import {
  fetchAdminNotifications,
  markNotificationsRead,
  sendTestNotification,
  type AdminNotification,
} from '@/lib/admin-notifications';
import { sendAdminTestEmail } from '@/lib/admin-notifications';
import { getApiErrorMessage } from '@/lib/api-error';

export default function AdminNotificationsPage() {
  const { toast } = useAdminToast();
  const [selectedType, setSelectedType] = useState('all');
  const [history, setHistory] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchAdminNotifications();
      setHistory(res.data);
      setUnreadCount(res.unreadCount);
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Impossible de charger les notifications.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSendTest = async () => {
    setTesting(true);
    try {
      await sendTestNotification();
      toast('Notification de test enregistrée', 'success');
      await load();
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Échec du test.'), 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      await sendAdminTestEmail();
      toast('Email de test envoyé (vérifiez la boîte contact)', 'success');
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Échec envoi SMTP — vérifiez les variables SMTP_*'), 'error');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markNotificationsRead({ all: true });
      setUnreadCount(0);
      setHistory((prev) => prev.map((n) => ({ ...n, read: true })));
      toast('Toutes les notifications marquées comme lues', 'success');
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Erreur.'), 'error');
    }
  };

  const filteredHistory = history.filter(
    (h) => selectedType === 'all' || h.type === selectedType
  );

  const typeIcon = (type: AdminNotification['type']) => {
    switch (type) {
      case 'payment':
        return CreditCard;
      case 'contact':
        return MessageSquare;
      case 'system':
        return Bell;
      default:
        return Calendar;
    }
  };

  if (loading) {
    return <LoadingState message="Chargement des notifications…" />;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">
            Centre de Notifications <span className="gold-gradient-text">Studio</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Journal d&apos;activité : réservations, messages contact et paiements Stripe.
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              Tout marquer lu ({unreadCount})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleTestEmail} disabled={testingEmail}>
            {testingEmail ? 'Envoi…' : 'Test email SMTP'}
          </Button>
          <Button variant="gold" size="sm" onClick={handleSendTest} disabled={testing} className="space-x-2">
            <Send className="h-4 w-4" />
            <span>{testing ? 'Envoi…' : 'Test journal'}</span>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-xs text-zinc-400">
        Les emails transactionnels (contact, réservation, paiement) partent via SMTP si configuré
        (variables <code className="text-amber-400">SMTP_HOST</code>, <code className="text-amber-400">SMTP_USER</code>,{' '}
        <code className="text-amber-400">SMTP_PASSWORD</code> ou onglet Sécurité des paramètres).
        SMS/WhatsApp restent désactivés.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-panel p-5 flex items-center gap-3 border-zinc-800">
          <Calendar className="h-5 w-5 text-amber-400" />
          <div>
            <div className="font-bold text-white text-sm">Réservations</div>
            <div className="text-[11px] text-zinc-400">{history.filter((h) => h.type === 'booking').length} événement(s)</div>
          </div>
        </Card>
        <Card className="glass-panel p-5 flex items-center gap-3 border-zinc-800">
          <CreditCard className="h-5 w-5 text-emerald-400" />
          <div>
            <div className="font-bold text-white text-sm">Paiements Stripe</div>
            <div className="text-[11px] text-zinc-400">{history.filter((h) => h.type === 'payment').length} acompte(s)</div>
          </div>
        </Card>
        <Card className="glass-panel p-5 flex items-center gap-3 border-zinc-800">
          <MessageSquare className="h-5 w-5 text-amber-400" />
          <div>
            <div className="font-bold text-white text-sm">Messages contact</div>
            <div className="text-[11px] text-zinc-400">{history.filter((h) => h.type === 'contact').length} lead(s)</div>
          </div>
        </Card>
      </div>

      <Card className="glass-panel space-y-4">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Historique ({filteredHistory.length})</CardTitle>
            <CardDescription>Événements enregistrés depuis la base de données.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'booking', label: 'Réservations' },
              { id: 'payment', label: 'Paiements' },
              { id: 'contact', label: 'Contact' },
              { id: 'system', label: 'Système' },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setSelectedType(btn.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  selectedType === btn.id
                    ? 'border-amber-400 bg-amber-400 text-zinc-950'
                    : 'border-zinc-800 text-zinc-300 hover:border-zinc-700'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {filteredHistory.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-8">Aucune notification pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950/80 text-xs font-semibold uppercase text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Destinataire</th>
                    <th className="py-3 px-4">Titre</th>
                    <th className="py-3 px-4">Message</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredHistory.map((h) => {
                    const Icon = typeIcon(h.type);
                    return (
                      <tr
                        key={h.id}
                        className={`hover:bg-zinc-900/40 transition-colors ${!h.read ? 'bg-amber-400/5' : ''}`}
                      >
                        <td className="py-3.5 px-4">
                          <Icon className="h-4 w-4 text-amber-400" />
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white text-xs">{h.recipient}</td>
                        <td className="py-3.5 px-4 font-bold text-amber-400 text-xs">{h.title}</td>
                        <td className="py-3.5 px-4 text-xs text-zinc-300 max-w-xs truncate">{h.message}</td>
                        <td className="py-3.5 px-4">
                          <Badge variant={h.read ? 'outline' : 'gold'}>
                            {h.read ? 'Lu' : 'Nouveau'}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right text-xs text-zinc-400">{h.createdAt}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
