import { SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';

/** A plain GET form: `/products?search=…`. Works without JavaScript. */
export function HeaderSearch({ className }: { className?: string }) {
  return (
    <form action="/products" role="search" className={className}>
      <div className="relative">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          name="search"
          placeholder="Search products"
          aria-label="Search products"
          maxLength={200}
          className="pl-8"
        />
      </div>
    </form>
  );
}
