'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, CheckCircle2, XCircle, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { useAdminToast } from '@/components/admin/admin-toast';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  fetchAdminBlogComments,
  moderateBlogComment,
  deleteBlogComment,
  type AdminBlogComment,
  type BlogCommentStatus,
} from '@/lib/admin-blog-comments-api';

const STATUS_LABELS: Record<BlogCommentStatus, string> = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Refusé',
};

export function BlogCommentsPanel({ onCountsChange }: { onCountsChange?: () => void }) {
  const { toast } = useAdminToast();
  const [comments, setComments] = useState<AdminBlogComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | BlogCommentStatus>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminBlogComments();
      setComments(data);
    } catch (err) {
      toast(getApiErrorMessage(err, 'Impossible de charger les commentaires.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      comments.filter((c) => statusFilter === 'all' || c.status === statusFilter),
    [comments, statusFilter]
  );

  const pendingCount = comments.filter((c) => c.status === 'pending').length;

  const handleModerate = async (id: string, status: BlogCommentStatus) => {
    try {
      const updated = await moderateBlogComment(id, status);
      setComments((prev) => prev.map((c) => (c.id === id ? updated : c)));
      onCountsChange?.();
      toast(
        status === 'approved'
          ? 'Commentaire approuvé'
          : status === 'rejected'
            ? 'Commentaire refusé'
            : 'Commentaire remis en attente',
        'success'
      );
    } catch (err) {
      toast(getApiErrorMessage(err, 'Action impossible.'), 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce commentaire ?')) return;
    try {
      await deleteBlogComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
      onCountsChange?.();
      toast('Commentaire supprimé', 'success');
    } catch (err) {
      toast(getApiErrorMessage(err, 'Suppression impossible.'), 'error');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-h2 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Commentaires ({filtered.length})
          </CardTitle>
          <CardDescription>
            Modérez les avis laissés sur les articles publiés.
            {pendingCount > 0 && (
              <span className="text-primary font-medium"> {pendingCount} en attente.</span>
            )}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | BlogCommentStatus)}
            className="text-xs h-10 sm:w-44"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="approved">Approuvés</option>
            <option value="rejected">Refusés</option>
          </Select>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingState message="Chargement des commentaires…" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead>
                <TableHead>Auteur</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableEmpty colSpan={5} message="Aucun commentaire pour le moment." />
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs">
                      <div className="font-medium text-foreground max-w-[180px] truncate">
                        {c.postTitle || '—'}
                      </div>
                      {c.postSlug && (
                        <Link
                          href={`/blog/${c.postSlug}`}
                          target="_blank"
                          className="text-[10px] text-primary hover:underline"
                        >
                          /{c.postSlug}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium text-foreground">{c.authorName}</div>
                      <div className="text-muted-foreground text-[10px]">{c.authorEmail}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs">
                      <p className="line-clamp-3">{c.content}</p>
                      <span className="text-[10px] text-muted-foreground/70">
                        {c.createdAt ? new Date(c.createdAt).toLocaleString('fr-FR') : ''}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          c.status === 'approved'
                            ? 'success'
                            : c.status === 'rejected'
                              ? 'warning'
                              : 'accent'
                        }
                      >
                        {STATUS_LABELS[c.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        {c.status !== 'approved' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-success"
                            aria-label="Approuver"
                            onClick={() => void handleModerate(c.id, 'approved')}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        {c.status !== 'rejected' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-warning"
                            aria-label="Refuser"
                            onClick={() => void handleModerate(c.id, 'rejected')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          aria-label="Supprimer"
                          onClick={() => void handleDelete(c.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
