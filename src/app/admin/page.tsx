import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ListSkeleton } from '@/components/page-skeleton';
import { LOW_STOCK_THRESHOLD, countOrdersByStatus, listLowStock } from '@/features/admin/data';
import { STATUS_LABELS } from '@/features/orders/status';
import { ORDER_STATUSES } from '@/lib/api/types';
import { requireAdmin } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Dashboard' };

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <section aria-labelledby="orders-heading" className="flex flex-col gap-3">
        <h2 id="orders-heading" className="font-semibold">
          Orders by status
        </h2>
        <Suspense fallback={<ListSkeleton rows={1} label="Loading order counts" />}>
          <OrderCounts />
        </Suspense>
      </section>
      <section aria-labelledby="stock-heading" className="flex flex-col gap-3">
        <h2 id="stock-heading" className="font-semibold">
          Low stock ({LOW_STOCK_THRESHOLD} or fewer)
        </h2>
        <Suspense fallback={<ListSkeleton rows={2} label="Loading low stock" />}>
          <LowStock />
        </Suspense>
      </section>
    </div>
  );
}

async function OrderCounts() {
  await requireAdmin('/admin');
  const counts = await countOrdersByStatus();

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {ORDER_STATUSES.map((status) => (
        <li key={status}>
          <Link
            href={{ pathname: '/admin/orders', query: { status } }}
            className="hover:bg-muted/50 flex flex-col gap-1 rounded-lg border p-4 transition-colors"
            data-testid={`count-${status}`}
          >
            <span className="text-muted-foreground text-sm">{STATUS_LABELS[status]}</span>
            <span className="text-2xl font-semibold">{counts[status] ?? '—'}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function LowStock() {
  await requireAdmin('/admin');
  const products = await listLowStock();

  if (products.length === 0) {
    return <p className="text-muted-foreground text-sm">Every product has enough stock.</p>;
  }
  return (
    <ul className="divide-y rounded-lg border text-sm">
      {products.map((product) => (
        <li key={product.id} className="flex items-center justify-between gap-3 p-3">
          <Link href={`/admin/products/${product.id}/edit`} className="font-medium hover:underline">
            {product.name}
          </Link>
          <span className={product.stock?.available ? '' : 'text-destructive font-medium'}>
            {product.stock?.available ?? 0} available · {product.stock?.reserved ?? 0} reserved
          </span>
        </li>
      ))}
    </ul>
  );
}
