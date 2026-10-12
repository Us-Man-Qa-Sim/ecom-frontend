import 'server-only';
import { listProductsFresh } from '@/features/catalog/data';
import { api, unwrap } from '@/lib/api/client';
import { ORDER_STATUSES, type OrderList, type OrderStatus, type Product } from '@/lib/api/types';

// Admin reads: per-user, never cached (FD7).

export const ADMIN_PAGE_SIZE = 20;
export const LOW_STOCK_THRESHOLD = 10;

export async function listAllOrders(query: {
  status?: OrderStatus;
  userId?: string;
  page: number;
  pageSize?: number;
}): Promise<OrderList> {
  const client = await api();
  return (await unwrap(
    client.GET('/admin/orders', { params: { query: { pageSize: ADMIN_PAGE_SIZE, ...query } } }),
  )) as OrderList;
}

/** One `GET /admin/orders?status=X&pageSize=1` per status, reading `pagination.total` (ADM-9). */
export async function countOrdersByStatus(): Promise<Record<OrderStatus, number | null>> {
  const entries = await Promise.all(
    ORDER_STATUSES.map(async (status) => {
      try {
        const { pagination } = await listAllOrders({ status, page: 1, pageSize: 1 });
        return [status, pagination?.total ?? 0] as const;
      } catch {
        return [status, null] as const;
      }
    }),
  );
  return Object.fromEntries(entries) as Record<OrderStatus, number | null>;
}

/** Active products with little stock, lowest first. Looks at the first 100 products. */
export async function listLowStock(): Promise<Product[]> {
  const { products } = await listProductsFresh({ page: 1, pageSize: 100 });
  return products
    .filter((product) => (product.stock?.available ?? 0) <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => (a.stock?.available ?? 0) - (b.stock?.available ?? 0));
}
