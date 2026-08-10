'use client';

import React, { useState } from 'react';
import { AppLink } from '@/components/navigation/app-link';
import { usePathname } from 'next/navigation';
import { Lock, ArrowRight, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudioLogo } from '@/components/brand/studio-logo';
import { ThemeSwitcher } from '@/components/theme/theme-switcher';

export function PublicHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/prestations', label: 'PRESTATIONS' },
    { href: '/portfolio', label: 'PORTFOLIO' },
    { href: '/blog', label: 'JOURNAL' },
    { href: '/contact', label: 'CONTACT & FAQ' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/85 backdrop-blur-md border-b border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Studio Logo Component */}
        <StudioLogo />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-zinc-300">
          {navLinks.map((link) => (
            <AppLink
              key={link.href}
              href={link.href}
              className={`transition-colors ${
                pathname === link.href ? 'text-amber-400 font-bold' : 'hover:text-amber-400'
              }`}
            >
              {link.label}
            </AppLink>
          ))}
          <AppLink
            href="/galerie-privee"
            className={`flex items-center transition-colors ${
              pathname.startsWith('/galerie-privee') || pathname.startsWith('/client')
                ? 'text-amber-300 font-bold'
                : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            <Lock className="h-3.5 w-3.5 mr-1" /> GALERIE PRIVÉE
          </AppLink>
        </nav>

        {/* CTA Buttons */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <ThemeSwitcher variant="compact" className="hidden sm:inline-flex" />
          <AppLink href="/login" className="text-xs font-semibold text-zinc-400 hover:text-white hidden sm:block">
            Connexion
          </AppLink>
          <AppLink href="/reservation">
            <Button variant="gold" size="sm" className="font-bold shadow-md shadow-amber-400/20">
              Réserver une Séance <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </AppLink>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-zinc-400 hover:text-white glass-panel"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-zinc-950 border-b border-zinc-800 p-6 space-y-4 animate-in slide-in-from-top duration-200">
          <div className="flex flex-col space-y-3 text-sm font-semibold">
            {navLinks.map((link) => (
              <AppLink
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 px-3 rounded-xl transition-all ${
                  pathname === link.href ? 'bg-amber-400/10 text-amber-400' : 'text-zinc-300 hover:bg-zinc-900'
                }`}
              >
                {link.label}
              </AppLink>
            ))}
            <AppLink
              href="/galerie-privee"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-xl bg-amber-400/10 text-amber-400 flex items-center"
            >
              <Lock className="h-4 w-4 mr-2" /> GALERIE PRIVÉE CLIENT
            </AppLink>
            <div className="pt-2 border-t border-zinc-800">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 px-3 mb-2">Apparence</p>
              <ThemeSwitcher variant="compact" />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
