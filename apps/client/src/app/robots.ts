import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://allo-eau.ga';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/commander', '/nouvelles-mesures', '/suivre'],
        disallow: ['/mes-commandes', '/mes-commandes/*', '/login', '/signup', '/auth/*', '/s/*'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
