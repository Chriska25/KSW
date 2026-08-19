'use client';

import React from 'react';
import type { SocialNetworkId } from '@/lib/social-links';
import { getActiveSocialLinks, type SocialLinksSettings } from '@/lib/social-links';
import { useSettings } from '@/context/settings-context';

function SocialIcon({ id, className }: { id: SocialNetworkId; className?: string }) {
  const cn = className || 'h-4 w-4';

  switch (id) {
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cn} aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cn} aria-hidden>
          <path d="M14 8.5V6.8c0-.7.5-1.1 1.2-1.1h1.8V3h-2.4c-2.3 0-3.6 1.4-3.6 3.5V8.5H9v2.7h2V21h3v-9.8h2.6l.4-2.7H14z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cn} aria-hidden>
          <path d="M16.5 5.2c.9.9 2 1.4 3.2 1.4V9c-1.1 0-2.1-.3-3-.9v6.8c0 2.9-2.3 5.2-5.2 5.2S6.3 17.8 6.3 14.9s2.3-5.2 5.2-5.2c.3 0 .6 0 .9.1v3.1a2.2 2.2 0 1 0 1.6 2.1V3h2.5v2.2z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cn} aria-hidden>
          <path d="M21.6 7.2a2.8 2.8 0 0 0-2-2C17.8 4.6 12 4.6 12 4.6s-5.8 0-7.6.6a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2 12a29 29 0 0 0 .4 4.8 2.8 2.8 0 0 0 2 2c1.8.6 7.6.6 7.6.6s5.8 0 7.6-.6a2.8 2.8 0 0 0 2-2 29 29 0 0 0 .4-4.8 29 29 0 0 0-.4-4.8zM10 15.5V8.5l5 3.5-5 3.5z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cn} aria-hidden>
          <path d="M6.5 8.8h3v10h-3v-10zM8 4a1.8 1.8 0 1 1 0 3.6A1.8 1.8 0 0 1 8 4zm4.2 4.8h2.9v1.4h.1c.4-.8 1.5-1.7 3.1-1.7 3.3 0 3.9 2.2 3.9 5v4.3h-3v-3.8c0-.9 0-2.1-1.3-2.1s-1.5 1-1.5 2v3.9h-3V8.8z" />
        </svg>
      );
    case 'pinterest':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cn} aria-hidden>
          <path d="M12 3a9 9 0 0 0-3.2 17.4c-.1-.8-.2-2 .1-2.9.2-.8 1.3-5.4 1.3-5.4s-.3-.6-.3-1.5c0-1.4.8-2.5 1.9-2.5.9 0 1.3.7 1.3 1.5 0 .9-.6 2.3-.9 3.6-.3 1.1.5 2 1.6 2 1.9 0 3.2-2.4 3.2-5.3 0-2.2-1.5-3.8-4.2-3.8-3 0-4.8 2.2-4.8 4.6 0 .9.3 1.5.8 2 .1.1.1.1.1.3-.1.3-.2.9-.2 1.1 0 .1-.1.2-.3.1-1.3-.5-2.1-2.1-2.1-3.8 0-3.1 2.6-6.8 7.7-6.8 4.1 0 6.8 3 6.8 6.2 0 4.2-2.3 7.3-5.8 7.3-1.1 0-2.2-.6-2.6-1.3l-.7 2.7c-.3 1-.9 2.2-1.3 3A9 9 0 1 0 12 3z" />
        </svg>
      );
    case 'x':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cn} aria-hidden>
          <path d="M17.3 4H20l-6.2 7.1L20.8 20h-5.9l-4.6-5.4L4.8 20H2l6.7-7.7L2.9 4h6l4.2 4.9L17.3 4zm-1.1 14.3h1.6L7.1 5.6H5.4l11.8 12.7z" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cn} aria-hidden>
          <path d="M12 2a10 10 0 0 0-8.7 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.2 1.1-1.7 1.2-.4.1-.9.2-3-.8-2.5-1-4.1-3.4-4.2-3.5-.1-.2-1-1.3-1-2.5s.6-1.8.9-2c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5.2.5.7 1.7.8 1.8.1.1.1.3 0 .4-.1.2-.2.3-.3.4-.1.1-.2.2-.1.4.1.2.6 1 1.3 1.6 1 .8 1.8 1.1 2.1 1.2.2.1.5.1.7-.1.2-.2.8-.9 1-1.2.2-.3.5-.2.8-.1.3.1 2 .9 2.3 1.1.3.2.5.3.6.5.1.3.1 1.2-.1 1.8z" />
        </svg>
      );
    default:
      return null;
  }
}

interface SocialLinksRowProps {
  className?: string;
  iconClassName?: string;
  showLabel?: boolean;
  /** Aperçu admin : liens locaux non encore enregistrés. */
  linksOverride?: SocialLinksSettings;
}

export function SocialLinksRow({ className = '', iconClassName, showLabel = false, linksOverride }: SocialLinksRowProps) {
  const { settings } = useSettings();
  const links = getActiveSocialLinks(linksOverride ? { socialLinks: linksOverride } : settings);

  if (links.length === 0) {
    return (
      <p className={`text-[11px] text-muted-foreground ${className}`}>
        Aucun réseau configuré — renseignez les liens dans Paramètres Studio.
      </p>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
      {showLabel && (
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mr-1">Suivez-nous</span>
      )}
      {links.map((item) => (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.label}
          title={item.label}
          className="h-9 w-9 rounded-xl bg-surface-muted border border-border flex items-center justify-center text-foreground hover:text-primary hover:border-primary/30 hover:bg-surface-muted/80 transition-all"
        >
          <SocialIcon id={item.id} className={iconClassName} />
        </a>
      ))}
    </div>
  );
}
