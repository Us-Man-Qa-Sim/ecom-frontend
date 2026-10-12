'use client';

import { SlidersHorizontalIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { CatalogFilters } from './catalog-filters';

/** On small screens the filters live in a sheet (UX-2). */
export function MobileFilters() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden">
          <SlidersHorizontalIcon /> Filters
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(22rem,90vw)] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Narrow down the catalog.</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <CatalogFilters onApplied={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
