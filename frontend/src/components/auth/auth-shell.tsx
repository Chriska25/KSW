'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Camera,
  FolderHeart,
  CalendarDays,
  FileSpreadsheet,
  ArrowLeft,
  Shield,
  Mail,
  Users,
  BarChart3,
} from 'lucide-react';
import { StudioLogo } from '@/components/brand/studio-logo';
import { ThemeSwitcher } from '@/components/theme/theme-switcher';
import { useSettings } from '@/context/settings-context';
import { isAdminLoginContext } from '@/lib/auth-login-url';

const CLIENT_FEATURES = [
  { icon: FolderHeart, label: 'Galeries privées HD', desc: 'Téléchargez vos photos retouchées' },
  { icon: CalendarDays, label: 'Suivi des réservations', desc: 'Statuts et prochaines séances' },
  { icon: FileSpreadsheet, label: 'Devis & factures', desc: 'Documents PDF à tout moment' },
];

const ADMIN_FEATURES = [
  { icon: Mail, label: 'Invitations & RSVP', desc: 'Liens publics, QR codes et listes invités' },
  { icon: Users, label: 'Clients & CRM', desc: 'Suivi des comptes et activité en direct' },
  { icon: BarChart3, label: 'Pilotage studio', desc: 'Galeries, réservations et statistiques' },
];

function AuthShellContent({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const searchParams = useSearchParams();
  const isAdmin = isAdminLoginContext(searchParams);
  const features = isAdmin ? ADMIN_FEATURES : CLIENT_FEATURES;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="hidden lg:flex absolute top-6 right-6 xl:top-8 xl:right-8 z-20">
          <ThemeSwitcher variant="compact" />
        </div>

        <header className="flex items-center justify-between p-4 sm:p-6 lg:hidden border-b border-border">
          <StudioLogo size="sm" showSubtitle={false} />
          <div className="flex items-center gap-3">
            <ThemeSwitcher variant="compact" />
            <Link
              href="/"
              className="text-small text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Site
            </Link>
          </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row lg:items-stretch">
          <aside className="hidden lg:flex lg:w-[44%] xl:w-[42%] flex-col justify-between p-10 xl:p-14 border-r border-border bg-surface-muted">
            <div className="space-y-10">
              <StudioLogo size="lg" />

              <div className="space-y-4 max-w-md">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-primary/25 bg-primary-muted text-primary text-caption font-medium uppercase tracking-wider">
                  {isAdmin ? <Shield className="h-3.5 w-3.5" aria-hidden /> : <Camera className="h-3.5 w-3.5" aria-hidden />}
                  {isAdmin ? 'Espace administrateur' : 'Espace client'}
                </div>
                <h1 className="text-display text-foreground">
                  {isAdmin ? (
                    <>
                      Back-office{' '}
                      <span className="text-accent">studio</span>
                    </>
                  ) : (
                    <>
                      Vos souvenirs,{' '}
                      <span className="text-accent">en toute sérénité</span>
                    </>
                  )}
                </h1>
                <p className="text-small text-muted-foreground">
                  {isAdmin
                    ? `Connectez-vous pour gérer les galeries, invitations, clients et réservations — ${settings.studioName || 'KSW Studio'}.`
                    : `Connectez-vous pour accéder à vos galeries privées, suivre vos réservations et télécharger vos factures — ${settings.studioName || 'KSW Studio'}.`}
                </p>
              </div>

              <ul className="space-y-4">
                {features.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.label} className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-background border border-border flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-primary" aria-hidden />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-caption">{item.desc}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <p className="text-caption">
              © {new Date().getFullYear()} {settings.studioName || 'KSW Studio'}
            </p>
          </aside>

          <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10">
            <div className="w-full max-w-md space-y-6">
              <div className="lg:hidden text-center space-y-2 pb-2">
                <h2 className="text-h2 text-foreground">
                  Espace{' '}
                  <span className="text-accent">{isAdmin ? 'administrateur' : 'client'}</span>
                </h2>
                <p className="text-caption">
                  {isAdmin
                    ? 'Back-office studio — connexion sécurisée'
                    : 'Galeries, réservations et documents'}
                </p>
              </div>

              {children}

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-caption pt-2">
                <Link href="/" className="hover:text-foreground transition-colors hidden lg:inline-flex items-center gap-1">
                  <ArrowLeft className="h-3 w-3" aria-hidden /> Retour au site
                </Link>
                {!isAdmin && (
                  <Link href="/galerie-privee" className="hover:text-foreground transition-colors">
                    Accès galerie par clé
                  </Link>
                )}
                <Link href="/contact" className="hover:text-foreground transition-colors">
                  Contacter le studio
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm">
          Chargement…
        </div>
      }
    >
      <AuthShellContent>{children}</AuthShellContent>
    </Suspense>
  );
}
