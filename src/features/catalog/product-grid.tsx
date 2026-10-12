import { Skeleton } from '@/components/ui/skeleton';
import type { Product } from '@/lib/api/types';
import { allowedImageUrl } from './images';
import { ProductCard } from './product-card';

const GRID = 'grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4';

/** Images in the first row load eagerly. The rest are lazy (UX-5). */
const PRIORITY_COUNT = 4;

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className={GRID}>
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          imageSrc={allowedImageUrl(product.images[0])}
          priority={index < PRIORITY_COUNT}
        />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={GRID} aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      ))}
    </div>
  );
}
