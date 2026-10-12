import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { publicApi, unwrap } from '@/lib/api/client';
import { isApiError } from '@/lib/api/errors';
import type { Product, ProductList } from '@/lib/api/types';
import type { ProductQuery } from './search-params';

// Catalog reads are cached for everyone (FD7). Admin mutations call
// `updateTag('products')` and `updateTag('product:<id>')`. The stock shown
// here is "about right": the order flow is the source of truth.

export const PRODUCTS_TAG = 'products';
export const productTag = (id: string) => `product:${id}`;

const OBJECT_ID = /^[0-9a-f]{24}$/i;

async function fetchProducts(query: ProductQuery): Promise<ProductList> {
  return (await unwrap(publicApi().GET('/products', { params: { query } }))) as ProductList;
}

async function fetchProduct(id: string): Promise<Product | null> {
  if (!OBJECT_ID.test(id)) return null;
  try {
    return (await unwrap(
      publicApi().GET('/products/{id}', { params: { path: { id } } }),
    )) as Product;
  } catch (error) {
    if (isApiError(error) && (error.status === 404 || error.status === 400)) return null;
    throw error;
  }
}

/** One cache entry per distinct query. */
export async function listProducts(query: ProductQuery): Promise<ProductList> {
  'use cache';
  cacheLife('minutes');
  cacheTag(PRODUCTS_TAG);
  return fetchProducts(query);
}

/** A product for the storefront, or null when it does not exist or is inactive. */
export async function getProduct(id: string): Promise<Product | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag(PRODUCTS_TAG, productTag(id));
  const product = await fetchProduct(id);
  // GAP-4: the public route still returns inactive products.
  return product?.isActive ? product : null;
}

/** Uncached storefront read, for the cart refresh after a failed order. */
export async function getProductFresh(id: string): Promise<Product | null> {
  const product = await fetchProduct(id);
  return product?.isActive ? product : null;
}

/**
 * Uncached read that also returns inactive products. GAP-3: there is no admin
 * read endpoint, and the public one still serves inactive products (GAP-4).
 */
export async function getProductIncludingInactive(id: string): Promise<Product | null> {
  return fetchProduct(id);
}

/** Uncached list for the admin table. GAP-3: active products only. */
export async function listProductsFresh(query: ProductQuery): Promise<ProductList> {
  return fetchProducts(query);
}
