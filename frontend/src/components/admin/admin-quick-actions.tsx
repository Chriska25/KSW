'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadAdminBackup } from '@/lib/admin-search';
import { getApiErrorMessage } from '@/lib/api-error';
import apiClient from '@/lib/api-client';
import { clearSession } from '@/lib/session';
import { useAdminToast } from '@/components/admin/admin-toast';
import { ADMIN_QUICK_ACTIONS, type AdminQuickAction } from '@/lib/admin-nav';

interface AdminQuickActionsProps {
  variant?: 'menu' | 'inline';
  onDone?: () => void;
}

export function AdminQuickActionsMenu({ variant = 'menu', onDone }: AdminQuickActionsProps) {
  const router = useRouter();
  const { toast } = useAdminToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  const runAction = useCallback(
    async (action: AdminQuickAction) => {
      if (action.href) {
        router.push(action.href);
        onDone?.();
        return;
      }

      if (action.id === 'backup') {
        setBusyId(action.id);
        try {
          await downloadAdminBackup();
          toast('Sauvegarde JSON téléchargée', 'success');
        } catch (err) {
          toast(getApiErrorMessage(err, 'Échec de l\'export.'), 'error');
        } finally {
          setBusyId(null);
          onDone?.();
        }
        return;
      }

      if (action.id === 'health') {
        setBusyId(action.id);
        try {
          const res = await apiClient.get('/health');
          const ok = res.data?.status === 'ok' || res.status === 200;
          toast(
            ok ? 'API opérationnelle' : 'Réponse API inattendue',
            ok ? 'success' : 'error'
          );
        } catch (err) {
          toast(getApiErrorMessage(err, 'API inaccessible.'), 'error');
        } finally {
          setBusyId(null);
          onDone?.();
        }
      }
    },
    [router, toast, onDone]
  );

  const itemClass =
    variant === 'menu'
      ? 'w-full text-left px-3 py-2 rounded-xl text-xs text-foreground hover:bg-surface-muted hover:text-foreground flex items-center gap-2.5 transition-colors'
      : 'flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-primary hover:bg-surface-muted transition-colors';

  return (
    <div className={variant === 'menu' ? 'space-y-0.5' : 'flex flex-col gap-0.5'}>
      {ADMIN_QUICK_ACTIONS.map((action) => {
        const Icon = action.icon;
        const busy = busyId === action.id;
        return (
          <button
            key={action.id}
            type="button"
            disabled={busy}
            onClick={() => runAction(action)}
            className={itemClass}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
            ) : (
              <Icon className="h-3.5 w-3.5 shrink-0 text-primary/90" />
            )}
            <span>{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function AdminLogoutButton({ onDone }: { onDone?: () => void }) {
  const router = useRouter();

  const handleLogout = () => {
    clearSession();
    onDone?.();
    router.push('/login');
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      className="w-full justify-start text-xs text-destructive hover:text-red-300 hover:bg-red-500/10"
    >
      <LogOut className="h-3.5 w-3.5 mr-2" /> Déconnexion
    </Button>
  );
}
