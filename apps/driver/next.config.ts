import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@eaupourtous/db', '@eaupourtous/domain'],
  experimental: {
    typedRoutes: true,
  },
  // Headers PWA / Service Worker à ajouter quand on wire l'offline
};

export default nextConfig;
