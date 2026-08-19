'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollText,
  Calendar,
  MessageSquare,
  CreditCard,
  Bell,
  User,
  Filter,
  RefreshCw,
  Download,
  Shield,
  MapPin,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/common/loading-state';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { useAdminToast } from '@/components/admin/admin-toast';
import {
  fetchAdminActivityLogs,
  downloadAdminLogFile,
  type AdminActivityLog,
} from '@/lib/admin-logs-api';
import { getApiErrorMessage } from '@/lib/api-error';

const SOURCE_OPTIONS = [
  { id: 'all', label: 'Toutes les sources' },
  { id: 'admin', label: 'Actions admin' },
  { id: 'booking', label: 'Réservations' },
  { id: 'contact', label: 'Contact' },
  { id: 'payment', label: 'Paiements' },
  { id: 'system', label: 'Système' },
  { id: 'user', label: 'Utilisateurs' },
];

function levelBadge(level: AdminActivityLog['level']) {
  switch (level) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'warning';
    default:
      return 'outline';
  }
}

function sourceIcon(source: string) {
  switch (source) {
    case 'admin':
      return Shield;
    case 'payment':
      return CreditCard;
    case 'contact':
      return MessageSquare;
    case 'user':
      return User;
    case 'system':
      return Bell;
    default:
      return Calendar;
  }
}

export default function AdminLogsPage() {
  const { toast } = useAdminToast();
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedSource, setSelectedSource] = useState('all');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await fetchAdminActivityLogs();
      setLogs(data);
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Impossible de charger le journal.'), 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadAdminLogFile();
      toast('Fichier journal téléchargé.', 'success');
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Export du journal impossible.'), 'error');
    } finally {
      setExporting(false);
    }
  };

  const filtered = logs.filter((log) => selectedSource === 'all' || log.source === selectedSource);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <AdminPageHeader
        title="Journal"
        accent="d'activité"
        description="Historique complet des actions admin (fichier log + base) et événements métier (réservations, contact, paiements)."
        icon={ScrollText}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting}
              className="space-x-2"
            >
              <Download className={`h-4 w-4 ${exporting ? 'animate-pulse' : ''}`} />
              <span>{exporting ? 'Export…' : 'Télécharger .log'}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => load(true)}
              disabled={refreshing}
              className="space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Actualiser</span>
            </Button>
          </>
        }
      />

      <div className="rounded-lg border border-success/20 bg-success-muted px-4 py-3 text-xs text-muted-foreground">
        Fichier persistant : <code className="text-success">backend/logs/admin-activity.log</code> — une ligne JSON par action admin.
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-h2 flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Filtrer par source
          </CardTitle>
          <CardDescription>{filtered.length} entrée(s) affichée(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-6">
            {SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedSource(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedSource === opt.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-surface-muted text-muted-foreground hover:text-foreground border border-border'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {loading ? (
            <LoadingState message="Chargement du journal…" />
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-12">Aucune entrée pour ce filtre.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((log) => {
                const Icon = sourceIcon(log.source);
                return (
                  <div
                    key={log.id}
                    className="p-4 rounded-lg border border-border bg-surface-muted flex flex-col sm:flex-row sm:items-start gap-3"
                  >
                    <div className="p-2 rounded-lg bg-surface border border-border shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">{log.title}</span>
                        <Badge variant={levelBadge(log.level)} className="text-[10px] uppercase">
                          {log.level}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {log.source}
                        </Badge>
                        {log.statusCode != null && (
                          <Badge variant="outline" className="text-[10px] font-mono">
                            HTTP {log.statusCode}
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs leading-relaxed">{log.message}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
                        {log.actorEmail && <span>Admin : {log.actorEmail}</span>}
                        {log.ip && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {log.ip}
                            {log.city || log.country
                              ? ` — ${[log.city, log.country].filter(Boolean).join(', ')}`
                              : ''}
                          </span>
                        )}
                        {log.recipient && <span>Destinataire : {log.recipient}</span>}
                      </div>
                    </div>
                    {log.createdAt && (
                      <span className="text-muted-foreground text-caption whitespace-nowrap shrink-0">{log.createdAt}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
