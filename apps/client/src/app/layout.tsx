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

// Outfit — géométrique, complète Mont pour les très gros titres display
const fontDisplay = Outfit({
  subsets: ['latin'],
  weight: ['100', '200', '300', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Allô Eau — Libreville',
  description:
    'Plateforme officielle de commande et de livraison d’eau à Libreville — République Gabonaise. Tarifs officiels, livraison incluse.',
  applicationName: 'Allô Eau',
  formatDetection: { telephone: true, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: '#2C5282',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr-GA" className={`${mont.variable} ${fontDisplay.variable}`}>
      <body className="min-h-dvh font-mont">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-slate-900 focus:px-3 focus:py-2 focus:text-white"
        >
          Aller au contenu principal
        </a>
        {children}
      </body>
    </html>
  );
}
