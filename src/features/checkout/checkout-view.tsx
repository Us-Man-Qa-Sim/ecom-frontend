'use client';

import { PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { FormAlert } from '@/components/form/form-alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AddressForm } from '@/features/account/address-form';
import { AddressLines } from '@/features/account/address-lines';
import { cartCount, cartSubtotal, lineTotal } from '@/features/cart/cart';
import { CartNotices } from '@/features/cart/cart-notices';
import { useCartStore } from '@/features/cart/store';
import { useCartRefresh } from '@/features/cart/use-cart-refresh';
import { placeOrderAction } from '@/features/orders/actions';
import type { ActionError } from '@/lib/api/errors';
import type { Address } from '@/lib/api/types';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

export function CheckoutView({ addresses: initialAddresses }: { addresses: Address[] }) {
  const router = useRouter();
  const hydrated = useCartStore((state) => state.hydrated);
  const lines = useCartStore((state) => state.lines);
  const clear = useCartStore((state) => state.clear);

  // A failed order switches the refresh to uncached reads (CHK-3).
  const [fresh, setFresh] = useState(false);
  const { notices, unavailable, isChecking, refetch } = useCartRefresh({ fresh });

  const [addresses, setAddresses] = useState(initialAddresses);
  const [selectedId, setSelectedId] = useState<string | undefined>(
    (initialAddresses.find((address) => address.isDefault) ?? initialAddresses[0])?.id,
  );
  const [adding, setAdding] = useState(initialAddresses.length === 0);

  const [error, setError] = useState<ActionError>();
  const [pending, startTransition] = useTransition();
  // Stays true after a 201 so the button cannot be clicked again during the redirect.
  const [placed, setPlaced] = useState(false);

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-4" aria-busy aria-label="Loading checkout">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (lines.length === 0 && !placed) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-16 text-center">
        <p className="font-medium">Your cart is empty</p>
        <p className="text-muted-foreground text-sm">Add something before you check out.</p>
        <Button asChild>
          <Link href="/products">Browse products</Link>
        </Button>
      </div>
    );
  }

  const blocked = unavailable.size > 0;
  const canPlace = Boolean(selectedId) && !blocked && !pending && !placed && !adding;

  const placeOrder = () => {
    if (!selectedId) return;
    setError(undefined);
    startTransition(async () => {
      const result = await placeOrderAction({
        addressId: selectedId,
        items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      });
      if (result.ok) {
        // The cart is cleared only after the backend accepted the order (FD10).
        setPlaced(true);
        clear();
        router.push(`/orders/${result.orderId}`);
        return;
      }
      setError(result);
      if (result.status === 409 || result.status === 404) {
        setFresh(true);
        void refetch();
      }
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-8">
        <section aria-labelledby="address-heading" className="flex flex-col gap-3">
          <h2 id="address-heading" className="text-lg font-semibold">
            1. Shipping address
          </h2>

          {addresses.length === 0 && !adding ? (
            <p className="text-muted-foreground text-sm">You have no saved addresses yet.</p>
          ) : null}

          {addresses.length > 0 ? (
            <div role="radiogroup" aria-labelledby="address-heading" className="grid gap-3 sm:grid-cols-2">
              {addresses.map((address) => {
                const selected = address.id === selectedId;
                return (
                  <label
                    key={address.id}
                    className={cn(
                      'flex cursor-pointer gap-3 rounded-lg border p-3',
                      selected ? 'border-primary ring-primary/30 ring-2' : 'hover:bg-muted/50',
                    )}
                  >
                    <input
                      type="radio"
                      name="address"
                      className="accent-primary mt-1 size-4"
                      checked={selected}
                      onChange={() => setSelectedId(address.id)}
                    />
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        {address.label || 'Address'}
                        {address.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                      </span>
                      <AddressLines address={address} />
                    </span>
                  </label>
                );
              })}
            </div>
          ) : null}

          {adding ? (
            <div className="rounded-lg border p-4">
              <p className="mb-4 font-medium">
                {addresses.length === 0 ? 'Add your shipping address' : 'New address'}
              </p>
              <AddressForm
                forceDefault={addresses.length === 0}
                submitLabel="Save and use this address"
                onCancel={addresses.length > 0 ? () => setAdding(false) : undefined}
                onSaved={(address) => {
                  setAddresses((current) => [
                    address,
                    ...current.map((old) =>
                      address.isDefault ? { ...old, isDefault: false } : old,
                    ),
                  ]);
                  setSelectedId(address.id);
                  setAdding(false);
                }}
              />
            </div>
          ) : (
            <Button variant="outline" className="self-start" onClick={() => setAdding(true)}>
              <PlusIcon /> Add a new address
            </Button>
          )}
        </section>

        <section aria-labelledby="review-heading" className="flex flex-col gap-3">
          <h2 id="review-heading" className="text-lg font-semibold">
            2. Review your order
          </h2>
          <CartNotices notices={notices} />
          <ul className="divide-y rounded-lg border text-sm" aria-label="Order items">
            {lines.map((line) => (
              <li key={line.productId} className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="font-medium">{line.snapshot.name}</p>
                  <p className="text-muted-foreground">
                    {line.quantity} × {formatMoney(line.snapshot.price)}
                  </p>
                  {unavailable.has(line.productId) ? (
                    <p className="text-destructive">Out of stock</p>
                  ) : null}
                </div>
                <p className="shrink-0 font-medium">{formatMoney(lineTotal(line))}</p>
              </li>
            ))}
          </ul>
          <Link href="/cart" className="text-muted-foreground w-fit text-sm underline underline-offset-4">
            Edit cart
          </Link>
        </section>
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
            <dt>Total</dt>
            <dd data-testid="checkout-total">{formatMoney(cartSubtotal(lines))}</dd>
          </div>
        </dl>
        <FormAlert
          message={
            error
              ? [error.message, ...Object.values(error.fieldErrors)].filter(Boolean).join(' ')
              : undefined
          }
          requestId={error?.requestId}
        />
        {blocked ? (
          <p className="text-destructive text-sm" role="alert">
            Remove the out-of-stock items in your cart to continue.
          </p>
        ) : null}
        <Button size="lg" onClick={placeOrder} disabled={!canPlace} aria-busy={pending}>
          {pending || placed ? 'Placing order…' : 'Place order'}
        </Button>
        <p className="text-muted-foreground text-xs">
          {isChecking
            ? 'Checking prices and stock…'
            : 'No payment is taken. Stock is reserved after you place the order.'}
        </p>
        {!selectedId && !adding ? (
          <p className="text-muted-foreground text-sm">Choose a shipping address to continue.</p>
        ) : null}
      </aside>
    </div>
  );
}
