import type { Metadata } from 'next';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Suspense } from 'react';
import { PaginationNav } from '@/components/pagination-nav';
import { CatalogFilters } from '@/features/catalog/catalog-filters';
import { categoryLabel } from '@/features/catalog/categories';
import { listProducts } from '@/features/catalog/data';
import { MobileFilters } from '@/features/catalog/mobile-filters';
import { ProductGrid, ProductGridSkeleton } from '@/features/catalog/product-grid';
import {
  catalogHrefQuery,
  hasActiveFilters,
  loadCatalogParams,
  toProductQuery,
} from '@/features/catalog/search-params';

export const metadata: Metadata = {
  title: 'Products',
  description: 'Browse the full catalog.',
  alternates: { canonical: '/products' },
};

export default function ProductsPage({ searchParams }: PageProps<'/products'>) {
  return (
    <NuqsAdapter>
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <Suspense>
          <MobileFilters />
        </Suspense>
      </div>
      <div className="grid gap-8 lg:grid-cols-[14rem_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <Suspense>
            <CatalogFilters />
          </Suspense>
        </aside>
        <section aria-label="Results" className="min-w-0">
          <Suspense fallback={<ProductGridSkeleton count={12} />}>
            <Results searchParams={searchParams} />
          </Suspense>
        </section>
      </div>
    </div>
    </NuqsAdapter>
  );
}

async function Results({ searchParams }: Pick<PageProps<'/products'>, 'searchParams'>) {
  const params = await loadCatalogParams(searchParams);
  const query = toProductQuery(params);
  const { products, pagination } = await listProducts(query);
  const total = pagination?.total ?? products.length;

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-16 text-center">
        <p className="font-medium">No products found</p>
        <p className="text-sm text-muted-foreground">
          {hasActiveFilters(params)
            ? 'Try another search or clear the filters.'
            : 'The catalog is empty right now.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-muted-foreground" role="status" data-testid="result-count">
        {total} {total === 1 ? 'product' : 'products'}
        {params.category ? ` in ${categoryLabel(params.category)}` : ''}
        {params.search ? ` for “${params.search}”` : ''}
      </p>
      <ProductGrid products={products} />
      <PaginationNav
        page={pagination?.page ?? 1}
        totalPages={pagination?.totalPages ?? 1}
        hrefFor={(page) => ({
          pathname: '/products',
          query: catalogHrefQuery({ ...params, page }),
        })}
      />
    </div>
  );
}
