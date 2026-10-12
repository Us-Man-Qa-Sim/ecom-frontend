import type { Metadata } from 'next';
import { QueryProvider } from '@/components/query-provider';
import { CartView } from '@/features/cart/cart-view';

export const metadata: Metadata = { title: 'Cart', robots: { index: false } };

export default function CartPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Cart</h1>
      <QueryProvider>
        <CartView />
      </QueryProvider>
    </div>
  );
}
