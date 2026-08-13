'use client';

import React, { useEffect, useState } from 'react';
import { AppLink } from '@/components/navigation/app-link';
import { usePathname } from 'next/navigation';
import { Lock, ArrowRight, Menu, X, Calendar, Home } from 'lucide-react';
import { ButtonLink } from '@/components/navigation/button-link';
import { StudioLogo } from '@/components/brand/studio-logo';
import { ThemeSwitcher } from '@/components/theme/theme-switcher';

export function PublicHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isNavActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const navLinks = [
    { href: '/', label: 'ACCUEIL', exact: true },
    { href: '/prestations', label: 'PRESTATIONS' },
    { href: '/portfolio', label: 'PORTFOLIO' },
    { href: '/blog', label: 'JOURNAL' },
    { href: '/contact', label: 'CONTACT & FAQ' },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/85 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2">
          <div className="min-w-0 shrink relative z-[51]">
            <StudioLogo
              size="sm"
              showSubtitle={false}
              className="sm:hidden"
              onNavigate={() => setMobileMenuOpen(false)}
            />
            <StudioLogo className="hidden sm:flex" onNavigate={() => setMobileMenuOpen(false)} />
          </div>

          <nav className="hidden md:flex items-center space-x-6 lg:space-x-8 text-xs font-semibold text-zinc-300">
            {navLinks.map((link) => (
              <AppLink
                key={link.href}
                href={link.href}
                className={`transition-colors whitespace-nowrap ${
                  isNavActive(link.href, link.exact) ? 'text-amber-400 font-bold' : 'hover:text-amber-400'
                }`}
              >
                {link.label}
              </AppLink>
            ))}
            <AppLink
              href="/galerie-privee"
              className={`flex items-center whitespace-nowrap transition-colors ${
                pathname.startsWith('/galerie-privee') || pathname.startsWith('/client')
                  ? 'text-amber-300 font-bold'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              <Lock className="h-3.5 w-3.5 mr-1" /> GALERIE PRIVÉE
            </AppLink>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <ThemeSwitcher variant="compact" className="hidden sm:inline-flex" />
            <AppLink href="/login" className="text-xs font-semibold text-zinc-400 hover:text-white hidden lg:block">
              Connexion
            </AppLink>
            <ButtonLink
              href="/reservation"
              variant="gold"
              size="sm"
              className="font-bold shadow-md shadow-amber-400/20 px-2.5 sm:px-4"
            >
              <Calendar className="h-3.5 w-3.5 md:hidden" aria-hidden />
              <span className="hidden md:inline">Réserver une Séance</span>
              <span className="md:hidden text-[11px] font-bold">Réserver</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1 hidden md:inline" />
            </ButtonLink>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-zinc-400 hover:text-white glass-panel"
              aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="public-mobile-menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Fermer le menu"
            className="md:hidden fixed inset-0 z-[48] bg-black/65 backdrop-blur-[2px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav
            id="public-mobile-menu"
            aria-label="Navigation mobile"
            className="md:hidden fixed inset-x-0 top-16 bottom-0 z-[49] bg-zinc-950/98 border-b border-zinc-800 overflow-y-auto overscroll-contain animate-in slide-in-from-top duration-200"
          >
            <div className="p-4 sm:p-6 space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="flex flex-col space-y-2 text-sm font-semibold">
                {navLinks.map((link) => (
                  <AppLink
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`py-3 px-3 rounded-xl transition-all flex items-center gap-2 ${
                      isNavActive(link.href, link.exact)
                        ? 'bg-amber-400/10 text-amber-400'
                        : 'text-zinc-300 hover:bg-zinc-900'
                    }`}
                  >
                    {link.exact && <Home className="h-4 w-4 shrink-0" aria-hidden />}
                    {link.label}
                  </AppLink>
                ))}
                <AppLink
                  href="/galerie-privee"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-3 px-3 rounded-xl bg-amber-400/10 text-amber-400 flex items-center"
                >
                  <Lock className="h-4 w-4 mr-2" /> GALERIE PRIVÉE CLIENT
                </AppLink>
                <AppLink
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-3 px-3 rounded-xl text-zinc-300 hover:bg-zinc-900"
                >
                  Connexion
                </AppLink>
                <ButtonLink
                  href="/reservation"
                  onClick={() => setMobileMenuOpen(false)}
                  variant="gold"
                  size="md"
                  className="w-full font-bold mt-2"
                >
                  Réserver une séance <ArrowRight className="h-4 w-4 ml-2" />
                </ButtonLink>
              </div>
              <div className="pt-4 border-t border-zinc-800">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 px-3 mb-2">Apparence</p>
                <ThemeSwitcher variant="compact" />
              </div>
            </div>
          </nav>
        </>
      )}
    </>
  );
}
