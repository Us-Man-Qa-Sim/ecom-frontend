import { ShoppingBagIcon } from 'lucide-react';

export function Logo() {
  return (
    <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
      <ShoppingBagIcon className="size-5" aria-hidden />
      Ecom
    </span>
  );
}
