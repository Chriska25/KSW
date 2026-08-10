import React from 'react';
import type { SystemSettings } from '@/lib/studio-defaults';
import { DEFAULT_SETTINGS } from '@/lib/studio-defaults';
import { resolveStudioMap } from '@/lib/studio-map-utils';
import { mergeSocialLinks } from '@/lib/social-links';

function buildSchemaData(settings: SystemSettings) {
  const studioName = `${settings.studioNameFirstPart} ${settings.studioNameSecondPart}`.trim() || 'KSW STUDIO';
  const map = resolveStudioMap(settings);
  const social = mergeSocialLinks(settings);
  const sameAs = [
    social.instagram,
    social.facebook,
    social.tiktok,
    social.linkedin,
    social.youtube,
    social.pinterest,
  ].filter((url) => url.trim().length > 0);

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: `${studioName} Haute Photographie`,
    image:
      'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop',
    '@id': 'https://kswstudio.fr/#organization',
    url: 'https://kswstudio.fr',
    telephone: settings.phone || DEFAULT_SETTINGS.phone,
    priceRange: '€€€',
    address: {
      '@type': 'PostalAddress',
      streetAddress: settings.address || DEFAULT_SETTINGS.address,
      addressLocality: 'Paris',
      postalCode: '75008',
      addressCountry: 'FR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: map.lat,
      longitude: map.lng,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '19:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Saturday'],
        opens: '10:00',
        closes: '18:00',
      },
    ],
    sameAs: sameAs.length > 0 ? sameAs : ['https://instagram.com/kswstudio', 'https://facebook.com/kswstudio'],
  };
}

interface JsonLdSchemaProps {
  settings?: SystemSettings;
}

/** Données structurées SEO — rendu dans le body pour limiter les conflits d'hydratation avec les extensions navigateur. */
export function JsonLdSchema({ settings = DEFAULT_SETTINGS }: JsonLdSchemaProps) {
  const jsonLdHtml = JSON.stringify(buildSchemaData(settings));

  return (
    <script
      id="ksw-json-ld"
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: jsonLdHtml }}
    />
  );
}
