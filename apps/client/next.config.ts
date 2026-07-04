import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@eaupourtous/db', '@eaupourtous/domain'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
