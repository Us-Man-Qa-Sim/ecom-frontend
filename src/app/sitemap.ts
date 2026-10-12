import type { MetadataRoute } from 'next';
import { connection } from 'next/server';
import { publicEnv } from '@/env';
import { CATEGORIES } from '@/features/catalog/categories';
import { listProducts } from '@/features/catalog/data';

const PAGE_SIZE = 100;
const MAX_PAGES = 50;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Built at request time: the gateway is not reachable during `next build`.
  await connection();
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;

  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/products`, changeFrequency: 'daily', priority: 0.9 },
    ...CATEGORIES.map((category) => ({
      url: `${base}/products?category=${category.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
  ];

  // Pages through GET /products (CAT-8).
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { products, pagination } = await listProducts({ page, pageSize: PAGE_SIZE });
    for (const product of products) {
      entries.push({
        url: `${base}/products/${product.id}`,
        lastModified: product.updatedAt ?? undefined,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
    if (!pagination || page >= pagination.totalPages) break;
  }

  return entries;
}
