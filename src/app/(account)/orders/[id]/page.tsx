import { ChevronLeftIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ListSkeleton } from '@/components/page-skeleton';
import { QueryProvider } from '@/components/query-provider';
import { getOrder } from '@/features/orders/data';
import { OrderDetails } from '@/features/orders/order-details';
import { OrderLive } from '@/features/orders/order-live';
import { requireSession } from '@/lib/auth/session';
import { formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: 'Order' };

export default function OrderPage({ params }: PageProps<'/orders/[id]'>) {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/orders"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeftIcon className="size-4" aria-hidden /> All orders
      </Link>
      <Suspense fallback={<ListSkeleton rows={3} label="Loading order" />}>
        <OrderContent params={params} />
      </Suspense>
    </div>
  );
}

async function OrderContent({ params }: Pick<PageProps<'/orders/[id]'>, 'params'>) {
  const { id } = await params;
  await requireSession(`/orders/${id}`);
  const order = await getOrder(id);
  if (!order) notFound();

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Order</h1>
        <p className="font-mono text-xs break-all text-muted-foreground" data-testid="order-id">
          {order.id}
        </p>
        <p className="text-sm text-muted-foreground">Placed {formatDateTime(order.createdAt)}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <OrderDetails order={order} />
        <div className="lg:order-last">
          <QueryProvider>
            <OrderLive order={order} />
          </QueryProvider>
        </div>
      </div>
    </>
  );
}
