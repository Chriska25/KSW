import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kswstudio.fr';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/client/', '/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
