import { PackageIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ListSkeleton } from '@/components/page-skeleton';
import { PaginationNav } from '@/components/pagination-nav';
import { Button } from '@/components/ui/button';
import { listMyOrders } from '@/features/orders/data';
import { OrderStatusBadge } from '@/features/orders/order-status-badge';
import { isOrderStatus } from '@/features/orders/status';
import { StatusFilter } from '@/features/orders/status-filter';
import type { OrderStatus } from '@/lib/api/types';
import { requireSession } from '@/lib/auth/session';
import { formatDateTime } from '@/lib/format';
import { formatMoney } from '@/lib/money';

export const metadata: Metadata = { title: 'Orders' };

function ordersHref(status: OrderStatus | undefined, page = 1) {
  const query: Record<string, string> = {};
  if (status) query.status = status;
  if (page > 1) query.page = String(page);
  return { pathname: '/orders' as const, query };
}

export default function OrdersPage({ searchParams }: PageProps<'/orders'>) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
      <Suspense fallback={<ListSkeleton rows={4} label="Loading orders" />}>
        <Orders searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Orders({ searchParams }: Pick<PageProps<'/orders'>, 'searchParams'>) {
  await requireSession('/orders');
  const params = await searchParams;
  const status = isOrderStatus(params.status) ? params.status : undefined;
  const requestedPage = Number.parseInt(String(params.page ?? '1'), 10);
  const page = Number.isSafeInteger(requestedPage) && requestedPage >= 1 ? requestedPage : 1;

  const { orders, pagination } = await listMyOrders({ status, page });

  return (
    <div className="flex flex-col gap-4">
      <StatusFilter current={status} hrefFor={(next) => ordersHref(next)} />

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-16 text-center">
          <PackageIcon className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-medium">{status ? 'No orders with this status' : 'No orders yet'}</p>
          {status ? null : (
            <Button asChild>
              <Link href="/products">Start shopping</Link>
            </Button>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Your orders">
          {orders.map((order) => {
            const units = order.items.reduce((total, item) => total + item.quantity, 0);
            return (
              <li key={order.id} data-testid="order-row">
                <Link
                  href={`/orders/${order.id}`}
                  className="flex flex-col gap-2 rounded-lg border p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="truncate text-sm font-medium">
                      {order.items.map((item) => item.productName).join(', ') || 'Order'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(order.createdAt)} · {units} {units === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <OrderStatusBadge status={order.status} />
                    <p className="font-semibold">{formatMoney(order.total)}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <PaginationNav
        page={pagination?.page ?? page}
        totalPages={pagination?.totalPages ?? 1}
        hrefFor={(next) => ordersHref(status, next)}
      />
    </div>
  );
}
