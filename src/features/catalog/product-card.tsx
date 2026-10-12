import Link from 'next/link';
import type { Product } from '@/lib/api/types';
import { formatMoney } from '@/lib/money';
import { categoryLabel } from './categories';
import { ProductImage } from './product-image';
import { StockBadge, stockLevel } from './stock-badge';

type Props = {
  product: Product;
  /** Already checked with `allowedImageUrl`. */
  imageSrc: string | null;
  priority?: boolean;
};

export function ProductCard({ product, imageSrc, priority = false }: Props) {
  const outOfStock = stockLevel(product.stock?.available) === 'out';

  return (
    <article className="group relative flex flex-col gap-2" data-testid="product-card">
      <ProductImage
        src={imageSrc}
        alt={product.name}
        sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 46vw"
        priority={priority}
        className={outOfStock ? 'opacity-60' : undefined}
      />
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">{categoryLabel(product.category)}</p>
        <h3 className="text-sm leading-snug font-medium">
          <Link
            href={`/products/${product.id}`}
            className="after:absolute after:inset-0 hover:underline"
          >
            {product.name}
          </Link>
        </h3>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold" data-testid="product-price">
            {formatMoney(product.price)}
          </p>
          {stockLevel(product.stock?.available) !== 'in' ? (
            <StockBadge available={product.stock?.available} />
          ) : null}
        </div>
      </div>
    </article>
  );
}
