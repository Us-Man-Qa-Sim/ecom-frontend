'use client';

import { MenuIcon } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { CATEGORIES } from '@/features/catalog/categories';

/** Navigation for small screens (CAT-1). `search` is the server-rendered search form. */
export function MobileNav({ search }: { search: ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const linkClass = 'hover:bg-muted rounded-md px-3 py-2 text-base';

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <MenuIcon className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(20rem,88vw)]">
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
