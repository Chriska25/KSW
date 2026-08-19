'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Phone, Mail, Award } from 'lucide-react';
import { StudioLogo } from '@/components/brand/studio-logo';
import { SocialLinksRow } from '@/components/common/social-links-row';
import { useSettings } from '@/context/settings-context';

export function PublicFooter() {
  const { settings } = useSettings();

  return (
    <footer className="bg-surface-muted border-t border-border/80 pt-16 pb-12 text-xs text-muted-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1: Studio Brand & Description */}
          <div className="space-y-4">
            <StudioLogo size="sm" showSubtitle={false} />
            <p className="text-muted-foreground text-xs leading-relaxed max-w-xs">
              {settings.studioDescription ||"Studio photographique d'art spécialisé dans le mariage d'exception, le portrait de caractère et le reportage corporate haut de gamme en France et à l'international."}
            </p>
            <SocialLinksRow className="pt-2" showLabel />
          </div>

          {/* Column 2: Navigation */}
          <div className="space-y-4">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">NAVIGATION</h3>
            <ul className="space-y-2.5 text-muted-foreground">
              <li>
                <Link href="/prestations" className="hover:text-primary transition-colors">
                  Mariages & Cérémonies
                </Link>
              </li>
              <li>
                <Link href="/prestations" className="hover:text-primary transition-colors">
                  Portraits & Studio
                </Link>
              </li>
              <li>
                <Link href="/portfolio" className="hover:text-primary transition-colors">
                  Galeries d'Art & Portfolio
                </Link>
              </li>
              <li>
                <Link href="/reservation" className="hover:text-primary transition-colors">
                  Réservation en Ligne
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-primary transition-colors">
                  Conseils & Inspirations
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Services Clients */}
          <div className="space-y-4">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">SERVICES CLIENTS</h3>
            <ul className="space-y-2.5 text-muted-foreground">
              <li>
                <Link href="/galerie-privee" className="hover:text-primary transition-colors">
                  Accès Galerie Privée Client
                </Link>
              </li>
              <li>
                <Link href="/galerie-privee" className="hover:text-primary transition-colors">
                  Téléchargement Packs HD
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-primary transition-colors">
                  Devis, Contrats & Factures
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-primary transition-colors">
                  Administration Photographe
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Le Studio & Contact */}
          <div className="space-y-4">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">LE STUDIO</h3>
            <ul className="space-y-3 text-foreground">
              <li className="flex items-start space-x-2.5">
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="break-words">{settings.address}</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <span className="break-all sm:break-normal">{settings.phone}</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <span className="break-all">{settings.contactEmail}</span>
              </li>
              <li className="flex items-center space-x-2.5 pt-2 text-primary font-bold">
                <Award className="h-4 w-4 text-primary shrink-0" />
                <span>Fearless Photographers Award 2025</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-muted-foreground">
          <div>© 2026 {settings.studioName} • Tous droits réservés.</div>
          <div className="flex space-x-6">
            <Link href="/legal" className="hover:text-foreground">Mentions Légales</Link>
            <Link href="/privacy" className="hover:text-foreground">Confidentialité</Link>
            <Link href="/contact" className="hover:text-foreground">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
