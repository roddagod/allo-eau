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

export const metadata: Metadata = {
  title: 'Livreur — Allô Eau',
  description: 'Application livreur — Plateforme officielle Allô Eau',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Livreur Allô Eau' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0B1220',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr-GA" className={`${mont.variable} ${fontDisplay.variable}`}>
      <body className="min-h-dvh font-mont">{children}</body>
    </html>
  );
}
