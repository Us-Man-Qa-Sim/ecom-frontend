'use client';

import { ShoppingCartIcon } from 'lucide-react';
import Link from 'next/link';
import type { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ProductImage } from '@/features/catalog/product-image';
import { formatMoney } from '@/lib/money';
import { cartCount, cartSubtotal, lineTotal } from './cart';
import { useCartStore } from './store';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The button that opened the sheet. Focus returns to it on close. */
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

/** The mini-cart (CART-2). Loaded on first use by <CartButton>. */
export default function CartSheet({ open, onOpenChange, returnFocusRef }: Props) {
  const lines = useCartStore((state) => state.lines);
  const remove = useCartStore((state) => state.remove);
  const count = cartCount(lines);
  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex w-[min(24rem,92vw)] flex-col"
        // The sheet has no Radix trigger (it is mounted on demand), so focus is handed back by hand.
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current?.focus();
        }}
      >
        <SheetHeader>
          <SheetTitle>Your cart</SheetTitle>
          <SheetDescription>
            {count === 0 ? 'Nothing here yet.' : `${count} ${count === 1 ? 'item' : 'items'}`}
          </SheetDescription>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
            <ShoppingCartIcon className="text-muted-foreground size-8" aria-hidden />
            <p className="text-muted-foreground text-sm">Your cart is empty.</p>
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
                      className="text-muted-foreground hover:text-foreground self-start text-xs underline underline-offset-2"
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
