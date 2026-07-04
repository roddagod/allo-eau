import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Outfit } from 'next/font/google';
import './globals.css';

const mont = localFont({
  src: [
    { path: '../../public/fonts/Mont-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../public/fonts/Mont-Light.ttf',   weight: '300', style: 'normal' },
  ],
  variable: '--font-mont',
  display: 'swap',
  fallback: ['Albert Sans', 'system-ui', 'Arial', 'sans-serif'],
});

const fontDisplay = Outfit({
  subsets: ['latin'],
  weight: ['100', '200', '300', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://allo-eau.ga';
const SITE_NAME = 'Allô Eau';
const SITE_TAGLINE = 'Plateforme officielle du dispositif d’urgence hydrique';
const SITE_DESC =
  'Commande officielle d’eau potable à Libreville. Tarif réglementé, livraison assurée par les Forces de Défense et de Sécurité et les opérateurs privés homologués. Ministère de l’Accès Universel à l’Eau et à l’Énergie — République Gabonaise.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  keywords: [
    'Allô Eau',
    'eau Libreville',
    'urgence hydrique Gabon',
    'commander eau Libreville',
    'ministère eau Gabon',
    'tarif officiel eau',
    'livraison eau Gabon',
    'République Gabonaise',
    'Ministère de l’Accès Universel à l’Eau',
    'numéro vert 18',
    'Sapeurs-Pompiers eau',
    'Gendarmerie Nationale eau',
  ],
  authors: [{ name: 'Ministère de l’Accès Universel à l’Eau et à l’Énergie' }],
  creator: 'République Gabonaise',
  publisher: 'Ministère de l’Accès Universel à l’Eau et à l’Énergie',
  category: 'government',
  formatDetection: { telephone: true, address: true, email: true },
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESC,
    url: SITE_URL,
    locale: 'fr_GA',
    // opengraph-image.tsx est détecté automatiquement par Next.js
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESC,
  },
  verification: {
    // à remplir quand le domaine sera vérifié
  },
};

export const viewport: Viewport = {
  themeColor: '#1F3480',
  width: 'device-width',
  initialScale: 1,
};

// Structured data — GovernmentOrganization
const JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'GovernmentOrganization',
  name: 'Ministère de l’Accès Universel à l’Eau et à l’Énergie',
  alternateName: 'MAUE',
  url: SITE_URL,
  logo: `${SITE_URL}/logo-ministere.jpg`,
  description: SITE_DESC,
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Bâtiment C, Immeuble La Perla, Impasse 1235 V Pont de Gué Gué',
    postalCode: 'BP 1172',
    addressLocality: 'Libreville',
    addressCountry: 'GA',
  },
  areaServed: {
    '@type': 'AdministrativeArea',
    name: 'Grand Libreville',
    containedInPlace: { '@type': 'Country', name: 'Gabon' },
  },
  contactPoint: [
    { '@type': 'ContactPoint', telephone: '+241-18',  contactType: 'emergency', name: 'Sapeurs-Pompiers'   },
    { '@type': 'ContactPoint', telephone: '+241-181', contactType: 'emergency', name: 'Génie Militaire'    },
    { '@type': 'ContactPoint', telephone: '+241-182', contactType: 'emergency', name: 'Garde Républicaine' },
    { '@type': 'ContactPoint', telephone: '+241-183', contactType: 'emergency', name: 'Gendarmerie Nationale' },
    { '@type': 'ContactPoint', telephone: '+241-184', contactType: 'customer service', name: 'Signalement abus tarifaires' },
  ],
  parentOrganization: {
    '@type': 'GovernmentOrganization',
    name: 'République Gabonaise',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr-GA" className={`${mont.variable} ${fontDisplay.variable}`}>
      <body className="min-h-dvh font-mont">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-white"
        >
          Aller au contenu principal
        </a>
        {children}
      </body>
    </html>
  );
}
