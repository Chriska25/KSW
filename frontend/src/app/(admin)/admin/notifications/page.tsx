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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmpty,
} from '@/components/ui/table';
import { LoadingState } from '@/components/common/loading-state';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
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
      <AdminPageHeader
        title="Centre de Notifications"
        accent="Studio"
        description="Journal d'activité : réservations, messages contact et paiements Stripe."
        actions={
          <>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                Tout marquer lu ({unreadCount})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleTestEmail} disabled={testingEmail}>
              {testingEmail ? 'Envoi…' : 'Test email SMTP'}
            </Button>
            <Button variant="primary" size="sm" onClick={handleSendTest} disabled={testing} className="space-x-2">
              <Send className="h-4 w-4" />
              <span>{testing ? 'Envoi…' : 'Test journal'}</span>
            </Button>
          </>
        }
      />

      <div className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-xs text-muted-foreground">
        Les emails transactionnels (contact, réservation, paiement) partent via SMTP si configuré
        (variables <code className="text-primary">SMTP_HOST</code>, <code className="text-primary">SMTP_USER</code>,{' '}
        <code className="text-primary">SMTP_PASSWORD</code> ou onglet Sécurité des paramètres).
        SMS/WhatsApp restent désactivés.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary shrink-0" />
            <div>
              <div className="font-semibold text-foreground text-sm">Réservations</div>
              <div className="text-caption text-muted-foreground">{history.filter((h) => h.type === 'booking').length} événement(s)</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-success shrink-0" />
            <div>
              <div className="font-semibold text-foreground text-sm">Paiements Stripe</div>
              <div className="text-caption text-muted-foreground">{history.filter((h) => h.type === 'payment').length} acompte(s)</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-primary shrink-0" />
            <div>
              <div className="font-semibold text-foreground text-sm">Messages contact</div>
              <div className="text-caption text-muted-foreground">{history.filter((h) => h.type === 'contact').length} lead(s)</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-h2">Historique ({filteredHistory.length})</CardTitle>
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
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  selectedType === btn.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Destinataire</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.length === 0 ? (
                <TableEmpty colSpan={6} message="Aucune notification pour le moment." />
              ) : (
                filteredHistory.map((h) => {
                  const Icon = typeIcon(h.type);
                  return (
                    <TableRow key={h.id} className={!h.read ? 'bg-primary-muted/50' : undefined}>
                      <TableCell>
                        <Icon className="h-4 w-4 text-primary" />
                      </TableCell>
                      <TableCell className="font-medium text-xs">{h.recipient}</TableCell>
                      <TableCell className="font-semibold text-primary text-xs">{h.title}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{h.message}</TableCell>
                      <TableCell>
                        <Badge variant={h.read ? 'outline' : 'accent'}>
                          {h.read ? 'Lu' : 'Nouveau'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{h.createdAt}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
