import type { Metadata } from 'next';
import './globals.css';
import { JsonLdSchema } from '@/components/seo/json-ld';
import { AppProviders } from '@/components/providers/app-providers';
import { themeInitScript } from '@/lib/theme-script';
import { fetchSettingsServer } from '@/lib/server-fetch';

export const revalidate = 30;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchSettingsServer();
  const studioName = `${settings.studioNameFirstPart} ${settings.studioNameSecondPart}`.trim();
  const title = settings.siteTitle || `${studioName} - Photographie d'Art & Studio Photo d'Exception`;

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://kswstudio.fr'),
    title: {
      default: title,
      template: `%s | ${studioName}`,
    },
    description:
      'Studio photo haut de gamme spécialisé dans le reportage de mariage d\'exception, le portrait d\'art et le branding corporate à Paris.',
    keywords: [
      'Photographe Mariage Paris',
      'Photographe Professionnel',
      'Portrait d\'Art',
      'Studio Photo Paris 8',
      'Reportage Mariage Haut de Gamme',
      'Galerie Privée Photographe',
    ],
    alternates: {
      canonical: '/',
    },
    openGraph: {
      title: `${studioName} • Photographe Professionnel d'Exception à Paris`,
      description:
        'Reportages photo poétiques de mariage, portraits d\'art et visuels d\'entreprise haut de gamme.',
      url: 'https://kswstudio.fr',
      siteName: studioName,
      locale: 'fr_FR',
      type: 'website',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop',
          width: 1200,
          height: 630,
          alt: `${studioName} - Haute Photographie`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${studioName} • Photographe Professionnel à Paris`,
      description:
        'Reportages photo poétiques de mariage, portraits d\'art et visuels d\'entreprise haut de gamme.',
      images: [
        'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop',
      ],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    icons: {
      icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
      apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
      shortcut: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialSettings = await fetchSettingsServer();

  return (
    <html lang="fr" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} suppressHydrationWarning />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 font-sans transition-colors duration-200">
        <JsonLdSchema settings={initialSettings} />
        <AppProviders initialSettings={initialSettings}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
