'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Phone, Mail, Award, Globe, Share2 } from 'lucide-react';
import { StudioLogo } from '@/components/brand/studio-logo';
import { useSettings } from '@/context/settings-context';

export function PublicFooter() {
  const { settings } = useSettings();

  return (
    <footer className="bg-zinc-950 border-t border-zinc-800/80 pt-16 pb-12 text-xs text-zinc-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1: Studio Brand & Description */}
          <div className="space-y-4">
            <StudioLogo size="sm" showSubtitle={false} />
            <p className="text-zinc-400 text-xs leading-relaxed max-w-xs">
              {settings.studioDescription ||
                "Studio photographique d'art spécialisé dans le mariage d'exception, le portrait de caractère et le reportage corporate haut de gamme en France et à l'international."}
            </p>
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                aria-label="Langue"
                className="h-9 w-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-amber-400 hover:border-zinc-700 transition-all cursor-pointer"
              >
                <Globe className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Partager"
                className="h-9 w-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-amber-400 hover:border-zinc-700 transition-all cursor-pointer"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Column 2: Navigation */}
          <div className="space-y-4">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">NAVIGATION</h3>
            <ul className="space-y-2.5 text-zinc-400">
              <li>
                <Link href="/prestations" className="hover:text-amber-400 transition-colors">
                  Mariages & Cérémonies
                </Link>
              </li>
              <li>
                <Link href="/prestations" className="hover:text-amber-400 transition-colors">
                  Portraits & Studio
                </Link>
              </li>
              <li>
                <Link href="/portfolio" className="hover:text-amber-400 transition-colors">
                  Galeries d'Art & Portfolio
                </Link>
              </li>
              <li>
                <Link href="/reservation" className="hover:text-amber-400 transition-colors">
                  Réservation en Ligne
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-amber-400 transition-colors">
                  Conseils & Inspirations
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Services Clients */}
          <div className="space-y-4">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">SERVICES CLIENTS</h3>
            <ul className="space-y-2.5 text-zinc-400">
              <li>
                <Link href="/galerie-privee" className="hover:text-amber-400 transition-colors">
                  Accès Galerie Privée Client
                </Link>
              </li>
              <li>
                <Link href="/galerie-privee" className="hover:text-amber-400 transition-colors">
                  Téléchargement Packs HD
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-amber-400 transition-colors">
                  Devis, Contrats & Factures
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-amber-400 transition-colors">
                  Administration Photographe
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Le Studio & Contact */}
          <div className="space-y-4">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">LE STUDIO</h3>
            <ul className="space-y-3 text-zinc-300">
              <li className="flex items-start space-x-2.5">
                <MapPin className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{settings.address}</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <Phone className="h-4 w-4 text-amber-400 shrink-0" />
                <span>{settings.phone}</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <Mail className="h-4 w-4 text-amber-400 shrink-0" />
                <span>{settings.contactEmail}</span>
              </li>
              <li className="flex items-center space-x-2.5 pt-2 text-amber-400 font-bold">
                <Award className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Fearless Photographers Award 2025</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500">
          <div>© 2026 {settings.studioName} • Tous droits réservés.</div>
          <div className="flex space-x-6">
            <Link href="/legal" className="hover:text-zinc-300">Mentions Légales</Link>
            <Link href="/privacy" className="hover:text-zinc-300">Confidentialité</Link>
            <Link href="/contact" className="hover:text-zinc-300">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
