import { ChevronLeftIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ListSkeleton } from '@/components/page-skeleton';
import { AdminOrderLive } from '@/features/admin/admin-order-live';
import { getOrder } from '@/features/orders/data';
import { OrderDetails } from '@/features/orders/order-details';
import { requireAdmin } from '@/lib/auth/session';
import { formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: 'Order' };

export default function AdminOrderPage({ params }: PageProps<'/admin/orders/[id]'>) {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/orders"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
      >
        <ChevronLeftIcon className="size-4" aria-hidden /> All orders
      </Link>
      <Suspense fallback={<ListSkeleton rows={3} label="Loading order" />}>
        <AdminOrder params={params} />
      </Suspense>
    </div>
  );
}

async function AdminOrder({ params }: Pick<PageProps<'/admin/orders/[id]'>, 'params'>) {
  const { id } = await params;
  await requireAdmin(`/admin/orders/${id}`);
  // order-service lets an ADMIN read and cancel any customer's order (ADM-7).
  const order = await getOrder(id);
  if (!order) notFound();

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Order</h1>
        <p className="text-muted-foreground font-mono text-xs break-all">{order.id}</p>
        <p className="text-muted-foreground text-sm">
          Placed {formatDateTime(order.createdAt)} by{' '}
          <Link
            href={{ pathname: '/admin/orders', query: { userId: order.userId } }}
            className="font-mono underline underline-offset-4"
          >
            {order.userId}
          </Link>
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <OrderDetails order={order} linkProducts={false} />
        <AdminOrderLive order={order} />
      </div>
    </>
  );
}
