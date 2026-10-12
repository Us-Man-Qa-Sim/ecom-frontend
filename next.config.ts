import type { NextConfig } from 'next';
import { publicEnv, serverEnv } from './src/env';

// Importing env here makes `next build` fail on bad values (FE0-6).
const env = serverEnv();
void publicEnv;

const nextConfig: NextConfig = {
  output: 'standalone',
  cacheComponents: true,
  partialPrefetching: true,
  typedRoutes: true,
  poweredByHeader: false,
  // The dev log prints Server Function arguments, which include passwords.
  logging: { serverFunctions: false },
  images: {
    // Built from IMAGE_HOSTS at build time (FD11).
    remotePatterns: env.IMAGE_HOSTS.flatMap((hostname) => [
      { protocol: 'https' as const, hostname },
      { protocol: 'http' as const, hostname },
    ]),
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
