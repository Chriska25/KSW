import React from 'react';

export function JsonLdSchema() {
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: 'KSW Studio Haute Photographie',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop',
    '@id': 'https://kswstudio.fr/#organization',
    url: 'https://kswstudio.fr',
    telephone: '+33142680000',
    priceRange: '€€€',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '12 Rue du Faubourg Saint-Honoré',
      addressLocality: 'Paris',
      postalCode: '75008',
      addressCountry: 'FR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 48.868285,
      longitude: 2.317581,
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
    sameAs: [
      'https://instagram.com/kswstudio',
      'https://facebook.com/kswstudio',
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}
