'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Camera, User, Calendar, Menu, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HeaderNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-surface-muted/85 border-b border-border/80 py-3 shadow-2xl'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="h-10 w-10 rounded-xl bg-primary p-0.5 shadow-md group-hover:scale-105 transition-transform">
            <div className="h-full w-full bg-surface-muted rounded-[10px] flex items-center justify-center">
              <Camera className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-foreground block">
              STUDIO <span className="text-primary">LUMIÈRE</span>
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground block -mt-1 font-mono">
              Haute Photographie
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link
            href="/"
            className="text-sm text-foreground hover:text-primary transition-colors font-medium"
          >
            Accueil
          </Link>
          <Link
            href="/prestations"
            className="text-sm text-foreground hover:text-primary transition-colors font-medium"
          >
            Prestations
          </Link>
          <Link
            href="/portfolio"
            className="text-sm text-foreground hover:text-primary transition-colors font-medium"
          >
            Portfolio
          </Link>
          <Link
            href="/blog"
            className="text-sm text-foreground hover:text-primary transition-colors font-medium"
          >
            Journal & Blog
          </Link>
          <Link
            href="/contact"
            className="text-sm text-foreground hover:text-primary transition-colors font-medium"
          >
            Contact
          </Link>
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center space-x-3">
          <Link href="/client/dashboard">
            <Button variant="ghost" size="sm" className="space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Espace Client</span>
            </Button>
          </Link>
          <Link href="/reservation">
            <Button variant="primary" size="sm" className="space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Réserver une séance</span>
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border px-6 py-6 space-y-4 animate-in slide-in-from-top-4">
          <nav className="flex flex-col space-y-3">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base text-zinc-200 hover:text-primary py-1"
            >
              Accueil
            </Link>
            <Link
              href="/prestations"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base text-zinc-200 hover:text-primary py-1"
            >
              Prestations
            </Link>
            <Link
              href="/portfolio"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base text-zinc-200 hover:text-primary py-1"
            >
              Portfolio
            </Link>
            <Link
              href="/blog"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base text-zinc-200 hover:text-primary py-1"
            >
              Journal & Blog
            </Link>
            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base text-zinc-200 hover:text-primary py-1"
            >
              Contact
            </Link>
          </nav>
          <div className="pt-4 border-t border-border flex flex-col space-y-2">
            <Link href="/client/dashboard" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" size="md" className="w-full justify-center">
                <User className="h-4 w-4 mr-2" /> Espace Client
              </Button>
            </Link>
            <Link href="/reservation" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="primary" size="md" className="w-full justify-center">
                <Calendar className="h-4 w-4 mr-2" /> Réserver
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
