import 'server-only';
import { api, unwrap } from '@/lib/api/client';
import { isApiError } from '@/lib/api/errors';
import type { Order, OrderList, OrderStatus } from '@/lib/api/types';

// Per-user data: never cached (FD7).

export const ORDERS_PAGE_SIZE = 10;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isOrderId = (value: string) => UUID.test(value);

export async function listMyOrders(query: {
  status?: OrderStatus;
  page: number;
  pageSize?: number;
}): Promise<OrderList> {
  const client = await api();
  return (await unwrap(
    client.GET('/orders', {
      params: { query: { pageSize: ORDERS_PAGE_SIZE, ...query } },
    }),
  )) as OrderList;
}

/** One order, or null when it does not exist or belongs to someone else. */
export async function getOrder(id: string): Promise<Order | null> {
  if (!isOrderId(id)) return null;
  try {
    const client = await api();
    return (await unwrap(client.GET('/orders/{id}', { params: { path: { id } } }))) as Order;
  } catch (error) {
    if (isApiError(error) && [400, 403, 404].includes(error.status)) return null;
    throw error;
  }
}
