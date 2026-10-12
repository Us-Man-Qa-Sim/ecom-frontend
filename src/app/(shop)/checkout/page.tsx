import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ListSkeleton } from '@/components/page-skeleton';
import { listAddresses } from '@/features/account/data';
import { CheckoutView } from '@/features/checkout/checkout-view';
import { requireSession } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
      <Suspense fallback={<ListSkeleton rows={2} label="Loading checkout" />}>
        <Checkout />
      </Suspense>
    </div>
  );
}

async function Checkout() {
  // A guest is sent to /login?next=/checkout by proxy.ts. The cart stays in localStorage (CHK-1).
  await requireSession('/checkout');
  return <CheckoutView addresses={await listAddresses()} />;
}
