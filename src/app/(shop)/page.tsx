import { ArrowRightIcon, BookOpenIcon, CpuIcon, HomeIcon, ShirtIcon } from 'lucide-react';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { CATEGORIES } from '@/features/catalog/categories';
import { listProducts } from '@/features/catalog/data';
import { ProductGrid, ProductGridSkeleton } from '@/features/catalog/product-grid';

const CATEGORY_ICONS = {
  electronics: CpuIcon,
  books: BookOpenIcon,
  home: HomeIcon,
  apparel: ShirtIcon,
} as const;

export default function HomePage() {
  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col items-start gap-4 rounded-2xl bg-muted px-6 py-10 sm:px-10 sm:py-16">
        <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
          Good things, delivered.
        </h1>
        <p className="max-w-lg text-base text-muted-foreground sm:text-lg">
          Keyboards, books, home goods and clothes. Order in a minute and follow your order live.
        </p>
        <Button asChild size="lg">
          <Link href="/products">
            Shop all products <ArrowRightIcon />
          </Link>
        </Button>
      </section>

      <section aria-labelledby="categories-heading" className="flex flex-col gap-4">
        <h2 id="categories-heading" className="text-xl font-semibold tracking-tight">
          Shop by category
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category.slug];
            return (
              <li key={category.slug}>
                <Link
                  href={{ pathname: '/products', query: { category: category.slug } }}
                  className="flex items-center gap-3 rounded-xl border p-4 font-medium transition-colors hover:bg-muted"
                >
                  <Icon className="size-5 text-muted-foreground" aria-hidden />
                  {category.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="newest-heading" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="newest-heading" className="text-xl font-semibold tracking-tight">
            Newest products
          </h2>
          <Link
            href="/products"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            View all
          </Link>
        </div>
        <Suspense fallback={<ProductGridSkeleton count={8} />}>
          <NewestProducts />
        </Suspense>
      </section>
    </div>
  );
}

async function NewestProducts() {
  // Rendered at request time, so `next build` needs no gateway. The data still
  // comes from the shared `use cache` entry.
  await connection();
  const { products } = await listProducts({ page: 1, pageSize: 8 });

  if (products.length === 0) {
    return <p className="text-muted-foreground">No products yet. Check back soon.</p>;
  }
  return <ProductGrid products={products} />;
}
