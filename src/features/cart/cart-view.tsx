'use client';

import { ShoppingCartIcon, Trash2Icon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductImage } from '@/features/catalog/product-image';
import { formatMoney } from '@/lib/money';
import { MAX_LINE_QUANTITY, cartCount, cartSubtotal, lineTotal } from './cart';
import { CartNotices } from './cart-notices';
import { QuantityStepper } from './quantity-stepper';
import { useCartStore } from './store';
import { useCartRefresh } from './use-cart-refresh';

export function CartView() {
  const hydrated = useCartStore((state) => state.hydrated);
  const lines = useCartStore((state) => state.lines);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const remove = useCartStore((state) => state.remove);
  const { notices, dismissNotices, unavailable, stockById, isChecking, error } = useCartRefresh();

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-4" aria-busy aria-label="Loading cart">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <CartNotices notices={notices} onDismiss={dismissNotices} />
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-16 text-center">
          <ShoppingCartIcon className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-medium">Your cart is empty</p>
          <Button asChild>
            <Link href="/products">Browse products</Link>
          </Button>
        </div>
      </div>
    );
  }

  const subtotal = cartSubtotal(lines);
  const blocked = unavailable.size > 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="flex flex-col gap-4">
        <CartNotices notices={notices} onDismiss={dismissNotices} />
        {error ? (
          <p role="alert" className="text-sm text-muted-foreground">
            Prices and stock could not be checked right now. They are checked again when you place
            the order.
          </p>
        ) : null}

        <ul className="divide-y rounded-lg border" aria-label="Cart items">
          {lines.map((line) => {
            const stock = stockById.get(line.productId);
            const max = Math.min(stock ?? MAX_LINE_QUANTITY, MAX_LINE_QUANTITY);
            const isUnavailable = unavailable.has(line.productId);
            return (
              <li
                key={line.productId}
                className="flex gap-3 p-3 sm:gap-4 sm:p-4"
                data-testid="cart-line"
              >
                <ProductImage
                  src={line.snapshot.image}
                  alt=""
                  sizes="96px"
                  className="size-20 shrink-0 sm:size-24"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/products/${line.productId}`}
                        className="font-medium hover:underline"
                      >
                        {line.snapshot.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {formatMoney(line.snapshot.price)} each
                      </p>
                      {isUnavailable ? (
                        <p className="text-sm text-destructive">Out of stock</p>
                      ) : null}
                    </div>
                    <p className="shrink-0 font-semibold" data-testid="line-total">
                      {formatMoney(lineTotal(line))}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <QuantityStepper
                      value={line.quantity}
                      max={Math.max(1, max)}
                      disabled={isUnavailable}
                      label={`Quantity of ${line.snapshot.name}`}
                      onChange={(quantity) => setQuantity(line.productId, quantity)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(line.productId)}
                      aria-label={`Remove ${line.snapshot.name}`}
                    >
                      <Trash2Icon /> <span className="hidden sm:inline">Remove</span>
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <aside
        aria-label="Order summary"
        className="flex h-fit flex-col gap-4 rounded-lg border p-4 lg:sticky lg:top-20"
      >
        <h2 className="font-semibold">Summary</h2>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Items</dt>
            <dd>{cartCount(lines)}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>Subtotal</dt>
            <dd data-testid="cart-subtotal">{formatMoney(subtotal)}</dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">
          {isChecking
            ? 'Checking prices and stock…'
            : 'Final prices and stock are confirmed when you place the order.'}
        </p>
        {blocked ? (
          <Button size="lg" disabled>
            Continue to checkout
          </Button>
        ) : (
          <Button asChild size="lg">
            <Link href="/checkout">Continue to checkout</Link>
          </Button>
        )}
        {blocked ? (
          <p className="text-sm text-destructive" role="alert">
            Remove the out-of-stock items to continue.
          </p>
        ) : null}
      </aside>
    </div>
  );
}
