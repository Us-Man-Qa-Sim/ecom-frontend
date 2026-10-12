import { Badge } from '@/components/ui/badge';

export const LOW_STOCK_THRESHOLD = 5;

export type StockLevel = 'in' | 'low' | 'out';

/** Only `stock.available` counts. Reserved units are already promised to other orders. */
export function stockLevel(available: number | null | undefined): StockLevel {
  if (!available || available <= 0) return 'out';
  return available <= LOW_STOCK_THRESHOLD ? 'low' : 'in';
}

export function StockBadge({ available }: { available: number | null | undefined }) {
  const level = stockLevel(available);
  if (level === 'out') return <Badge variant="destructive">Out of stock</Badge>;
  if (level === 'low') return <Badge variant="outline">Only {available} left</Badge>;
  return <Badge variant="secondary">In stock</Badge>;
}
