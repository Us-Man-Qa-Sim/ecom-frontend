'use client';

import { ShoppingCartIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cartCount } from './cart';
import { useCartStore } from './store';

const loadSheet = () => import('./cart-sheet');
const CartSheet = dynamic(loadSheet, { ssr: false });

/**
 * Header cart button with a count badge (CART-2). The mini-cart sheet is
 * fetched on the first hover, focus or click, so the dialog code is not part
 * of every page load (UX-5).
 */
export function CartButton() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hydrated = useCartStore((state) => state.hydrated);
  const lines = useCartStore((state) => state.lines);

  // Before hydration the server and the browser both render "no badge".
  const count = hydrated ? cartCount(lines) : 0;

  return (
    <>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        className="relative"
        aria-label={count > 0 ? `Cart, ${count} ${count === 1 ? 'item' : 'items'}` : 'Cart'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onPointerEnter={() => void loadSheet()}
        onFocus={() => void loadSheet()}
        onClick={() => {
          setLoaded(true);
          setOpen(true);
        }}
      >
        <ShoppingCartIcon className="size-5" />
        {count > 0 ? (
          <span
            className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[0.65rem] leading-none font-semibold"
            data-testid="cart-count"
            aria-hidden
          >
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </Button>
      {loaded ? <CartSheet open={open} onOpenChange={setOpen} returnFocusRef={buttonRef} /> : null}
    </>
  );
}
