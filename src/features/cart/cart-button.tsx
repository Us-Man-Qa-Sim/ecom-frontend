'use client';

import { ShoppingCartIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ProductImage } from '@/features/catalog/product-image';
import { formatMoney } from '@/lib/money';
import { cartCount, cartSubtotal, lineTotal } from './cart';
import { useCartStore } from './store';

/** Header cart button with a count badge and a mini-cart sheet (CART-2). */
export function CartButton() {
  const [open, setOpen] = useState(false);
  const hydrated = useCartStore((state) => state.hydrated);
  const lines = useCartStore((state) => state.lines);
  const remove = useCartStore((state) => state.remove);

  // Before hydration the server and the browser both render "no badge".
  const count = hydrated ? cartCount(lines) : 0;
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={count > 0 ? `Cart, ${count} ${count === 1 ? 'item' : 'items'}` : 'Cart'}
        >
          <ShoppingCartIcon className="size-5" />
          {count > 0 ? (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[0.65rem] leading-none font-semibold text-primary-foreground"
              data-testid="cart-count"
              aria-hidden
            >
              {count > 99 ? '99+' : count}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-[min(24rem,92vw)] flex-col">
        <SheetHeader>
          <SheetTitle>Your cart</SheetTitle>
          <SheetDescription>
            {count === 0 ? 'Nothing here yet.' : `${count} ${count === 1 ? 'item' : 'items'}`}
          </SheetDescription>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
            <ShoppingCartIcon className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
            <Button asChild onClick={close}>
              <Link href="/products">Browse products</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y overflow-y-auto px-4">
              {lines.map((line) => (
                <li key={line.productId} className="flex gap-3 py-3">
                  <ProductImage
                    src={line.snapshot.image}
                    alt=""
                    sizes="64px"
                    className="size-16 shrink-0"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                    <Link
                      href={`/products/${line.productId}`}
                      onClick={close}
                      className="truncate font-medium hover:underline"
                    >
                      {line.snapshot.name}
                    </Link>
                    <p className="text-muted-foreground">
                      {line.quantity} × {formatMoney(line.snapshot.price)}
                    </p>
                    <button
                      type="button"
                      className="self-start text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                      onClick={() => remove(line.productId)}
                      aria-label={`Remove ${line.snapshot.name}`}
                    >
                      Remove
                    </button>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">{formatMoney(lineTotal(line))}</p>
                </li>
              ))}
            </ul>
            <SheetFooter>
              <div className="flex items-center justify-between font-semibold">
                <span>Subtotal</span>
                <span>{formatMoney(cartSubtotal(lines))}</span>
              </div>
              <Button asChild size="lg" onClick={close}>
                <Link href="/checkout">Checkout</Link>
              </Button>
              <Button asChild variant="outline" onClick={close}>
                <Link href="/cart">View cart</Link>
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
