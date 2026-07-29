'use client';

import React from 'react';
import Link from 'next/link';
import { Camera, Globe, Share2, Mail, Phone, MapPin, Award } from 'lucide-react';
import { StudioLogo } from '@/components/brand/studio-logo';
import { useSettings } from '@/context/settings-context';

export function FooterSection() {
  const { settings } = useSettings();

  return (
    <footer className="bg-zinc-950 border-t border-zinc-900 text-zinc-400 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
        {/* Col 1: Studio Profile */}
        <div className="space-y-4">
          <StudioLogo size="md" />
          <p className="text-sm text-zinc-400 leading-relaxed pt-2">
            {settings.studioDescription ||
              "Studio photographique d'art spécialisé dans le mariage d'exception, le portrait de caractère et le reportage corporate haut de gamme en France et à l'international."}
          </p>
          <div className="flex items-center space-x-3 pt-2">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="h-9 w-9 rounded-lg glass-panel flex items-center justify-center text-zinc-300 hover:text-amber-400 hover:border-amber-400/50 transition-colors"
            >
              <Globe className="h-4 w-4" />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              className="h-9 w-9 rounded-lg glass-panel flex items-center justify-center text-zinc-300 hover:text-amber-400 hover:border-amber-400/50 transition-colors"
            >
              <Share2 className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Col 2: Navigation rapide */}
        <div>
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
            Navigation
          </h4>
          <ul className="space-y-2.5 text-sm">
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

        {/* Col 3: Espace Professionnel & Client */}
        <div>
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
            Services Clients
          </h4>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link href="/client/dashboard" className="hover:text-amber-400 transition-colors">
                Accès Galerie Privée Client
              </Link>
            </li>
            <li>
              <Link href="/client/dashboard" className="hover:text-amber-400 transition-colors">
                Téléchargement Packs HD
              </Link>
            </li>
            <li>
              <Link href="/client/dashboard" className="hover:text-amber-400 transition-colors">
                Devis, Contrats & Factures
              </Link>
            </li>
            <li>
              <Link href="/admin/dashboard" className="hover:text-amber-400 transition-colors">
                Administration Photographe
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 4: Contact & Distinctions */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
            Le Studio
          </h4>
          <div className="flex items-start space-x-3 text-sm">
            <MapPin className="h-4 w-4 text-amber-400 mt-1 shrink-0" />
            <span>{settings.address}</span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <Phone className="h-4 w-4 text-amber-400 shrink-0" />
            <span>{settings.phone}</span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <Mail className="h-4 w-4 text-amber-400 shrink-0" />
            <span>{settings.contactEmail}</span>
          </div>
          <div className="pt-2 flex items-center space-x-2 text-xs text-amber-400/90 font-medium">
            <Award className="h-4 w-4" />
            <span>Fearless Photographers Award 2025</span>
          </div>
        </div>
      </div>

      {/* Sub-footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-zinc-900 flex flex-col md:flex-row items-center justify-between text-xs text-zinc-400 space-y-4 md:space-y-0">
        <div>
          © {new Date().getFullYear()} {settings.studioName || 'KSW STUDIO'} Haute Photographie. Tous droits réservés.
        </div>
        <div className="flex items-center space-x-6">
          <Link href="/contact" className="hover:text-zinc-300">
            Mentions Légales
          </Link>
          <Link href="/contact" className="hover:text-zinc-300">
            Politique de Confidentialité
          </Link>
          <Link href="/contact" className="hover:text-zinc-300">
            CGV & Droit à l'Image
          </Link>
        </div>
      </div>
    </footer>
  );
}
