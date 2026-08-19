'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Mail,
  RefreshCw,
  Check,
  X,
  Link2,
  Download,
  Upload,
  Users,
  Search,
  QrCode,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
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
  fetchAdminInvitations,
  fetchAdminInvitation,
  validateAdminInvitation,
  rejectAdminInvitation,
  generateInvitationLink,
  toggleInvitationLink,
  updateAdminInvitation,
  deleteAdminGuest,
  downloadGuestsCsv,
  importInvitedGuestListCsv,
  downloadGuestPassPdf,
} from '@/lib/admin-invitations-api';
import type { ElectronicInvitation, InvitationGuest } from '@/lib/invitation-types';
import { INVITATION_STATUS_OPTIONS, formatGuestPreferencesSummary } from '@/lib/invitation-types';
import {
  invitationPublicUrl,
  invitationStatusVariant,
  guestResponseLabel,
  qrCodeImageUrl,
  guestPassUrl,
} from '@/lib/invitation-utils';
import { getApiErrorMessage } from '@/lib/api-error';
import { InvitationLinkControl } from '@/components/invitations/invitation-link-control';

const AdminInvitationMediaEditor = dynamic(
  () =>
    import('@/components/invitations/admin-invitation-media-editor').then((m) => ({
      default: m.AdminInvitationMediaEditor,
    })),
  { loading: () => <div className="h-24 animate-pulse rounded-xl bg-zinc-900/40" /> }
);
const AdminInvitationFormEditor = dynamic(
  () =>
    import('@/components/invitations/admin-invitation-form-editor').then((m) => ({
      default: m.AdminInvitationFormEditor,
    })),
  { loading: () => <div className="h-32 animate-pulse rounded-xl bg-zinc-900/40" /> }
);
const AdminInvitationPdfPanel = dynamic(
  () =>
    import('@/components/invitations/admin-invitation-pdf-panel').then((m) => ({
      default: m.AdminInvitationPdfPanel,
    })),
  { loading: () => <div className="h-20 animate-pulse rounded-xl bg-zinc-900/40" /> }
);
const InvitationRsvpChart = dynamic(
  () =>
    import('@/components/invitations/invitation-rsvp-chart').then((m) => ({
      default: m.InvitationRsvpChart,
    })),
  { ssr: false, loading: () => <div className="h-full animate-pulse rounded-xl bg-zinc-900/40" /> }
);

export default function AdminInvitationsPage() {
  const { toast } = useAdminToast();
  const [list, setList] = useState<ElectronicInvitation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ElectronicInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [guestFilter, setGuestFilter] = useState<'all' | 'yes' | 'no' | 'maybe'>('all');
  const guestListFileRef = useRef<HTMLInputElement>(null);
  const [importingGuestList, setImportingGuestList] = useState(false);

  const loadList = useCallback(async () => {
    try {
      const data = await fetchAdminInvitations({ status: statusFilter, q: search || undefined });
      setList(data);
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Chargement impossible'), 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, toast]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      setDetail(await fetchAdminInvitation(id));
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Détail indisponible'), 'error');
    } finally {
      setDetailLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  const filteredGuests = useMemo(() => {
    const guests = detail?.guests || [];
    if (guestFilter === 'all') return guests;
    return guests.filter((g) => g.response === guestFilter);
  }, [detail?.guests, guestFilter]);

  const publicUrl = detail?.publicToken ? invitationPublicUrl(detail.publicToken) : '';

  const copyLink = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    toast('Lien copié', 'success');
  };

  const handleValidate = async () => {
    if (!detail) return;
    try {
      await validateAdminInvitation(detail.id);
      toast('Demande validée', 'success');
      loadDetail(detail.id);
      loadList();
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Échec validation'), 'error');
    }
  };

  const handleReject = async () => {
    if (!detail) return;
    const reason = window.prompt('Motif du refus (optionnel)') || undefined;
    try {
      await rejectAdminInvitation(detail.id, reason);
      toast('Demande refusée', 'success');
      loadDetail(detail.id);
      loadList();
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Échec refus'), 'error');
    }
  };

  const handleGenerateLink = async () => {
    if (!detail) return;
    try {
      const { data } = await generateInvitationLink(detail.id);
      setDetail(data);
      toast('Lien généré', 'success');
      loadList();
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Génération impossible'), 'error');
    }
  };

  const handleToggleLink = async (active: boolean) => {
    if (!detail) return;
    try {
      const res = await toggleInvitationLink(detail.id, active);
      setDetail(res);
      toast(active ? 'Lien public activé' : 'Lien public arrêté', 'success');
      loadList();
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Action impossible'), 'error');
    }
  };

  const handleUpdateLinkSchedule = async (patch: {
    linkActiveFrom?: string | null;
    linkActiveUntil?: string | null;
  }) => {
    if (!detail) return;
    try {
      const res = await updateAdminInvitation(detail.id, patch);
      setDetail(res);
      toast('Dates de validité enregistrées', 'success');
      loadList();
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Enregistrement impossible'), 'error');
    }
  };

  const handleDeleteGuest = async (guestId: string) => {
    if (!detail || !window.confirm('Supprimer cet invité ?')) return;
    try {
      await deleteAdminGuest(detail.id, guestId);
      loadDetail(detail.id);
      toast('Invité supprimé', 'success');
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Suppression impossible'), 'error');
    }
  };

  const handleImportGuestListCsv = async (file: File) => {
    if (!detail) return;
    setImportingGuestList(true);
    try {
      const result = await importInvitedGuestListCsv(detail.id, file, {
        merge: true,
        enableRestrict: true,
      });
      await loadDetail(detail.id);
      toast(
        `${result.addedCount} nom(s) importé(s) — liste autorisée : ${result.totalCount} invité(s)`,
        'success'
      );
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Import CSV impossible'), 'error');
    } finally {
      setImportingGuestList(false);
      if (guestListFileRef.current) guestListFileRef.current.value = '';
    }
  };

  if (loading && list.length === 0) {
    return <LoadingState message="Chargement des invitations…" />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Invitations électroniques"
        description="Validation, liens publics, RSVP et statistiques."
        icon={Mail}
        actions={
          <Button variant="outline" size="sm" onClick={() => { setLoading(true); loadList(); }}>
            <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
          </Button>
        }
      />

      <div className="grid md:grid-cols-5 gap-4 md:gap-6">
        <div className={`md:col-span-2 space-y-4 ${selectedId ? 'hidden md:block' : ''}`}>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher client, organisateur…"
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm w-full sm:w-auto"
            >
              <option value="all">Tous les statuts</option>
              {INVITATION_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {list.map((inv) => (
              <button
                key={inv.id}
                type="button"
                onClick={() => setSelectedId(inv.id)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selectedId === inv.id
                    ? 'border-primary/40 bg-primary-muted'
                    : 'border-border bg-surface hover:border-primary/40'
                }`}
              >
                <div className="flex justify-between gap-2 mb-1">
                  <span className="text-foreground font-medium text-sm truncate">{inv.organizerNames}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {inv.publicToken && (
                      <Badge
                        variant={
                          inv.linkScheduleStatus === 'expired'
                            ? 'warning'
                            : inv.linkEffectiveActive ?? inv.linkActive
                              ? 'success'
                              : 'warning'
                        }
                        className="text-[9px] px-1.5"
                      >
                        {inv.linkScheduleStatus === 'expired'
                          ? 'Expiré'
                          : inv.linkScheduleStatus === 'scheduled'
                            ? 'Programmé'
                            : inv.linkEffectiveActive ?? inv.linkActive
                              ? 'Lien actif'
                              : 'Lien arrêté'}
                      </Badge>
                    )}
                    <Badge variant={invitationStatusVariant(inv.status)} className="text-[10px]">
                      {inv.statusLabel}
                    </Badge>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">{inv.clientName} — {inv.eventTypeLabel}</p>
                <p className="text-caption text-muted-foreground mt-1">{inv.eventDate} · {inv.guestResponsesCount ?? 0} réponses</p>
              </button>
            ))}
            {list.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-8">Aucune demande.</p>
            )}
          </div>
        </div>

        <div className={`md:col-span-3 ${!selectedId ? 'hidden md:block' : ''}`}>
          {!selectedId ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground text-sm">
                Sélectionnez une demande pour la gérer.
              </CardContent>
            </Card>
          ) : detailLoading || !detail ? (
            <LoadingState message="Chargement du détail…" />
          ) : (
            <div className="space-y-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="md:hidden text-muted-foreground -ml-2"
                onClick={() => setSelectedId(null)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Retour à la liste
              </Button>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-h2">{detail.organizerNames}</CardTitle>
                  <p className="text-muted-foreground text-xs">
                    Client : {detail.clientName} ({detail.clientEmail}) · {detail.eventTypeLabel} · {detail.eventDate}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex flex-wrap gap-2">
                    {detail.status === 'pending' && (
                      <>
                        <Button size="sm" variant="primary" onClick={handleValidate}><Check className="h-4 w-4 mr-1" /> Valider</Button>
                        <Button size="sm" variant="outline" onClick={handleReject}><X className="h-4 w-4 mr-1" /> Refuser</Button>
                      </>
                    )}
                    {!detail.publicToken && detail.status !== 'pending' && detail.status !== 'rejected' && (
                      <Button size="sm" variant="primary" onClick={handleGenerateLink}><Link2 className="h-4 w-4 mr-1" /> Générer le lien</Button>
                    )}
                  </div>

                  {detail.publicToken && (
                    <InvitationLinkControl
                      invitation={detail}
                      onToggleLink={handleToggleLink}
                      onCopyLink={copyLink}
                      onUpdateSchedule={handleUpdateLinkSchedule}
                    />
                  )}

                  <AdminInvitationFormEditor
                    invitation={detail}
                    onUpdated={(inv) => setDetail(inv)}
                    onToast={(message, type) => toast(message, type === 'info' ? undefined : type)}
                  />

                  <AdminInvitationMediaEditor
                    invitation={detail}
                    onUpdated={(inv) => setDetail(inv)}
                    onToast={(message, type) => toast(message, type)}
                  />
                </CardContent>
              </Card>

              {detail.stats && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  <StatCard label="Réponses" value={detail.stats.totalResponses} />
                  <StatCard label="Présents" value={detail.stats.confirmed} />
                  <StatCard label="Absents" value={detail.stats.declined} />
                  <StatCard label="En attente" value={detail.stats.pending} />
                  <StatCard label="Personnes attendues" value={detail.stats.expectedPeople} />
                </div>
              )}

              {detail.stats && detail.stats.totalResponses > 0 && (
                <Card>
                  <CardHeader className="pb-0">
                    <CardTitle className="text-sm">Répartition des réponses</CardTitle>
                  </CardHeader>
                  <CardContent className="h-48">
                    <InvitationRsvpChart
                      confirmed={detail.stats.confirmed}
                      declined={detail.stats.declined}
                      pending={detail.stats.pending}
                    />
                  </CardContent>
                </Card>
              )}

              {detail.publicToken && (
                <AdminInvitationPdfPanel
                  invitation={detail}
                  onToast={(message, type) => toast(message, type)}
                  onUpdated={() => loadDetail(detail.id)}
                />
              )}

              {detail.publicToken && (
                <Card>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-primary" /> QR Code
                    </CardTitle>
                    <a href={qrCodeImageUrl(publicUrl)} download={`invitation-${detail.publicToken}.png`}>
                      <Button size="sm" variant="outline" type="button">Télécharger</Button>
                    </a>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrCodeImageUrl(publicUrl)} alt="QR Code invitation" className="rounded-lg border border-border" width={200} height={200} />
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2 flex flex-row flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" /> Invités ({filteredGuests.length})
                  </CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Select
                      value={guestFilter}
                      onChange={(e) => setGuestFilter(e.target.value as typeof guestFilter)}
                      className="text-xs w-auto min-w-[120px]"
                    >
                      <option value="all">Tous</option>
                      <option value="yes">Confirmés</option>
                      <option value="no">Refusés</option>
                      <option value="maybe">En attente</option>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      disabled={importingGuestList}
                      onClick={() => guestListFileRef.current?.click()}
                    >
                      <Upload className="h-3.5 w-3.5 mr-1" />
                      {importingGuestList ? 'Import…' : 'Liste autorisée'}
                    </Button>
                    <input
                      ref={guestListFileRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleImportGuestListCsv(file);
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() =>
                        downloadGuestsCsv(detail.id, `invites-${detail.publicToken || detail.id.slice(0, 8)}.csv`)
                      }
                    >
                      <Download className="h-3.5 w-3.5 mr-1" /> CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invité</TableHead>
                        <TableHead>Tél.</TableHead>
                        <TableHead>Réponse</TableHead>
                        <TableHead>Pers.</TableHead>
                        <TableHead>Repas / boisson</TableHead>
                        <TableHead>QR billet</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGuests.length === 0 ? (
                        <TableEmpty colSpan={7} message="Aucun invité pour ce filtre." />
                      ) : (
                        filteredGuests.map((g: InvitationGuest) => (
                          <TableRow key={g.id}>
                            <TableCell className="text-xs">{g.fullName}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{g.phone || '—'}</TableCell>
                            <TableCell className="text-xs">{guestResponseLabel(g.response)}</TableCell>
                            <TableCell className="text-xs tabular-nums">{g.guestCount}</TableCell>
                            <TableCell className="text-caption text-muted-foreground">
                              {formatGuestPreferencesSummary(g.preferences)}
                            </TableCell>
                            <TableCell>
                              {g.response === 'yes' && g.checkInToken ? (
                                <div className="flex items-center gap-2">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={qrCodeImageUrl(guestPassUrl(g.checkInToken), 64)}
                                    alt=""
                                    className="rounded border border-border bg-white p-0.5"
                                    width={40}
                                    height={40}
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    type="button"
                                    className="h-7 px-2 text-caption"
                                    onClick={() => void downloadGuestPassPdf(detail.id, g.id)}
                                  >
                                    PDF
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost" className="text-destructive h-7 px-2" onClick={() => handleDeleteGuest(g.id)}>
                                Suppr.
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted p-3">
      <p className="text-caption text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-xl font-semibold text-foreground tabular-nums">{value}</p>
    </div>
  );
}
