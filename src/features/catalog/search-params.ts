import { createLoader, parseAsInteger, parseAsString } from 'nuqs/server';
import { parseMoneyInput } from '@/lib/money';

// The URL is the source of truth for catalog filters (FD12). Shared by the
// server page (loader) and the client filter controls (`useQueryStates`).

/** Price filters are typed in major units of this currency. */
export const CATALOG_CURRENCY = 'USD';
export const CATALOG_PAGE_SIZE = 12;

export const catalogParsers = {
  category: parseAsString.withDefault(''),
  search: parseAsString.withDefault(''),
  minPrice: parseAsString.withDefault(''),
  maxPrice: parseAsString.withDefault(''),
  page: parseAsInteger.withDefault(1),
};

export const loadCatalogParams = createLoader(catalogParsers);

export type CatalogParams = {
  category: string;
  search: string;
  minPrice: string;
  maxPrice: string;
  page: number;
};

export type ProductQuery = {
  category?: string;
  search?: string;
  minPriceMinor?: number;
  maxPriceMinor?: number;
  page: number;
  pageSize: number;
};

function priceToMinor(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = parseMoneyInput(value, CATALOG_CURRENCY);
  return parsed.ok ? parsed.amountMinor : undefined;
}

/**
 * URL params → gateway query. Bad values are dropped instead of sent, so a
 * hand-edited URL never produces a gateway 400. The result is also the cache
 * key of the product list, so it is normalised (trimmed, no empty strings).
 */
export function toProductQuery(params: CatalogParams): ProductQuery {
  const category = params.category.trim().slice(0, 100);
  const search = params.search.trim().slice(0, 200);
  let min = priceToMinor(params.minPrice);
  let max = priceToMinor(params.maxPrice);
  if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];

  return {
    ...(category ? { category } : {}),
    ...(search ? { search } : {}),
    ...(min !== undefined ? { minPriceMinor: min } : {}),
    ...(max !== undefined ? { maxPriceMinor: max } : {}),
    page: Number.isSafeInteger(params.page) && params.page >= 1 ? params.page : 1,
    pageSize: CATALOG_PAGE_SIZE,
  };
}

export function hasActiveFilters(params: CatalogParams): boolean {
  return Boolean(params.category || params.search || params.minPrice || params.maxPrice);
}

/** Query object for a `<Link>` to the catalog, without empty values. */
export function catalogHrefQuery(params: Partial<CatalogParams>): Record<string, string> {
  const query: Record<string, string> = {};
  if (params.category) query.category = params.category;
  if (params.search) query.search = params.search;
  if (params.minPrice) query.minPrice = params.minPrice;
  if (params.maxPrice) query.maxPrice = params.maxPrice;
  if (params.page && params.page > 1) query.page = String(params.page);
  return query;
}
