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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-amber-400 selection:text-zinc-950 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-amber-400/8 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-zinc-800/40 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgb(251 191 36) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="hidden lg:flex absolute top-6 right-6 xl:top-8 xl:right-8 z-20">
          <ThemeSwitcher variant="compact" />
        </div>

        <header className="flex items-center justify-between p-4 sm:p-6 lg:hidden">
          <StudioLogo size="sm" showSubtitle={false} />
          <div className="flex items-center gap-3">
            <ThemeSwitcher variant="compact" />
            <Link
              href="/"
              className="text-xs text-zinc-400 hover:text-amber-400 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Site
            </Link>
          </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row lg:items-stretch">
          <aside className="hidden lg:flex lg:w-[44%] xl:w-[42%] flex-col justify-between p-10 xl:p-14 border-r border-zinc-800/80 bg-zinc-900/30 backdrop-blur-sm">
            <div className="space-y-10">
              <StudioLogo size="lg" />

              <div className="space-y-4 max-w-md">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-400/30 bg-amber-400/5 text-amber-400 text-[11px] font-semibold uppercase tracking-wider">
                  {isAdmin ? <Shield className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
                  {isAdmin ? 'Espace administrateur' : 'Espace client'}
                </div>
                <h1 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight">
                  {isAdmin ? (
                    <>
                      Back-office{' '}
                      <span className="gold-gradient-text">studio</span>
                    </>
                  ) : (
                    <>
                      Vos souvenirs,{' '}
                      <span className="gold-gradient-text">en toute sérénité</span>
                    </>
                  )}
                </h1>
                <p className="text-zinc-400 text-sm leading-relaxed">
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
                      <div className="h-9 w-9 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{item.label}</p>
                        <p className="text-xs text-zinc-500">{item.desc}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <p className="text-[11px] text-zinc-600">
              © {new Date().getFullYear()} {settings.studioName || 'KSW Studio'} — Haute photographie
            </p>
          </aside>

          <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10">
            <div className="w-full max-w-md space-y-6">
              <div className="lg:hidden text-center space-y-2 pb-2">
                <h2 className="text-xl font-bold text-white">
                  Espace{' '}
                  <span className="gold-gradient-text">{isAdmin ? 'administrateur' : 'client'}</span>
                </h2>
                <p className="text-xs text-zinc-500">
                  {isAdmin
                    ? 'Back-office studio — connexion sécurisée'
                    : 'Galeries, réservations et documents'}
                </p>
              </div>

              {children}

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-zinc-500 pt-2">
                <Link href="/" className="hover:text-amber-400 transition-colors hidden lg:inline-flex items-center gap-1">
                  <ArrowLeft className="h-3 w-3" /> Retour au site
                </Link>
                {!isAdmin && (
                  <Link href="/galerie-privee" className="hover:text-amber-400 transition-colors">
                    Accès galerie par clé
                  </Link>
                )}
                <Link href="/contact" className="hover:text-amber-400 transition-colors">
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
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-sm">
          Chargement…
        </div>
      }
    >
      <AuthShellContent>{children}</AuthShellContent>
    </Suspense>
  );
}
