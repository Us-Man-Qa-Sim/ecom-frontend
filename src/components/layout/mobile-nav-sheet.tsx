'use client';

import Link from 'next/link';
import type { ReactNode, RefObject } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { CATEGORIES } from '@/features/catalog/categories';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  search: ReactNode;
  /** The button that opened the sheet. Focus returns to it on close. */
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

/** The navigation sheet for small screens (CAT-1). Loaded on first use by <MobileNav>. */
export default function MobileNavSheet({ open, onOpenChange, search, returnFocusRef }: Props) {
  const close = () => onOpenChange(false);
  const linkClass = 'hover:bg-muted rounded-md px-3 py-2 text-base';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[min(20rem,88vw)]"
        // The sheet has no Radix trigger (it is mounted on demand), so focus is handed back by hand.
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current?.focus();
        }}
      >
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>Browse the shop.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-6">
          {/* Submitting the search navigates, so close the sheet. */}
          <div onSubmit={close}>{search}</div>
          <nav aria-label="Mobile" className="flex flex-col">
            <Link href="/" onClick={close} className={linkClass}>
              Home
            </Link>
            <Link href="/products" onClick={close} className={linkClass}>
              All products
            </Link>
            {CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                href={{ pathname: '/products', query: { category: category.slug } }}
                onClick={close}
                className={`${linkClass} pl-6 text-muted-foreground`}
              >
                {category.label}
              </Link>
            ))}
            <Link href="/cart" onClick={close} className={linkClass}>
              Cart
            </Link>
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
