import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ListSkeleton } from '@/components/page-skeleton';
import { PaginationNav } from '@/components/pagination-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { listAllOrders } from '@/features/admin/data';
import { isOrderId } from '@/features/orders/data';
import { OrderStatusBadge } from '@/features/orders/order-status-badge';
import { isOrderStatus } from '@/features/orders/status';
import { StatusFilter } from '@/features/orders/status-filter';
import type { OrderStatus } from '@/lib/api/types';
import { requireAdmin } from '@/lib/auth/session';
import { formatDateTime, shortId } from '@/lib/format';
import { formatMoney } from '@/lib/money';

export const metadata: Metadata = { title: 'Orders' };

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() ?? '';

function ordersHref(status: OrderStatus | undefined, userId: string, page = 1) {
  const query: Record<string, string> = {};
  if (status) query.status = status;
  if (userId) query.userId = userId;
  if (page > 1) query.page = String(page);
  return { pathname: '/admin/orders' as const, query };
}

export default function AdminOrdersPage({ searchParams }: PageProps<'/admin/orders'>) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
      <Suspense fallback={<ListSkeleton rows={5} label="Loading orders" />}>
        <OrdersTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function OrdersTable({ searchParams }: Pick<PageProps<'/admin/orders'>, 'searchParams'>) {
  await requireAdmin('/admin/orders');
  const params = await searchParams;
  const status = isOrderStatus(params.status) ? params.status : undefined;
  const userIdInput = first(params.userId);
  // The gateway wants a UUID. Anything else is shown as an error instead of sent.
  const userId = isOrderId(userIdInput) ? userIdInput : '';
  const requestedPage = Number.parseInt(first(params.page) || '1', 10);
  const page = Number.isSafeInteger(requestedPage) && requestedPage >= 1 ? requestedPage : 1;

  const { orders, pagination } = await listAllOrders({
    ...(status ? { status } : {}),
    ...(userId ? { userId } : {}),
    page,
  });

  return (
    <div className="flex flex-col gap-4">
      <StatusFilter current={status} hrefFor={(next) => ordersHref(next, userId)} />

      <form className="flex flex-wrap items-end gap-3">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <div className="flex min-w-56 flex-1 flex-col gap-1">
          <Label htmlFor="admin-order-user">Customer ID</Label>
          <Input
            id="admin-order-user"
            name="userId"
            defaultValue={userIdInput}
            placeholder="User UUID"
            className="font-mono"
            aria-invalid={userIdInput && !userId ? true : undefined}
          />
        </div>
        <Button type="submit" variant="outline">
          Filter
        </Button>
        {userIdInput ? (
          <Button asChild variant="ghost">
            <Link href={ordersHref(status, '')}>Clear</Link>
          </Button>
        ) : null}
      </form>
      {userIdInput && !userId ? (
        <p role="alert" className="text-destructive text-sm">
          A customer ID is a UUID. The filter was ignored.
        </p>
      ) : null}

      {orders.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-12 text-center">
          No orders match.
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead className="hidden md:table-cell">Customer</TableHead>
                <TableHead className="hidden sm:table-cell">Placed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} data-testid="admin-order-row">
                  <TableCell>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono font-medium hover:underline"
                      title={order.id}
                    >
                      {shortId(order.id)}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Link
                      href={ordersHref(status, order.userId)}
                      className="text-muted-foreground font-mono text-xs hover:underline"
                      title={`Only orders of ${order.userId}`}
                    >
                      {shortId(order.userId)}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {formatDateTime(order.createdAt)}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-right">{formatMoney(order.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PaginationNav
        page={pagination?.page ?? page}
        totalPages={pagination?.totalPages ?? 1}
        hrefFor={(next) => ordersHref(status, userId, next)}
      />
    </div>
  );
}
