import type { MetadataRoute } from 'next';
import { publicEnv } from '@/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/checkout', '/account', '/orders', '/cart', '/api/'],
    },
    sitemap: `${publicEnv.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
