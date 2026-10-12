import { PlusIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { NativeSelect } from '@/components/form/native-select';
import { ListSkeleton } from '@/components/page-skeleton';
import { PaginationNav } from '@/components/pagination-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ADMIN_PAGE_SIZE } from '@/features/admin/data';
import { ProductRowActions } from '@/features/admin/product-row-actions';
import { CATEGORIES, categoryLabel } from '@/features/catalog/categories';
import { listProductsFresh } from '@/features/catalog/data';
import { requireAdmin } from '@/lib/auth/session';
import { formatMoney } from '@/lib/money';

export const metadata: Metadata = { title: 'Products' };

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() ?? '';

/** "Open by ID": GAP-3 workaround to reach a deactivated product. */
async function openById(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '').trim();
  if (/^[0-9a-f]{24}$/i.test(id)) redirect(`/admin/products/${id}/edit`);
  redirect('/admin/products?idError=1');
}

export default function AdminProductsPage({ searchParams }: PageProps<'/admin/products'>) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <Button asChild>
          <Link href="/admin/products/new">
            <PlusIcon /> New product
          </Link>
        </Button>
      </div>
      <Suspense fallback={<ListSkeleton rows={5} label="Loading products" />}>
        <ProductsTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ProductsTable({ searchParams }: Pick<PageProps<'/admin/products'>, 'searchParams'>) {
  await requireAdmin('/admin/products');
  const params = await searchParams;
  const search = first(params.search).slice(0, 200);
  const category = first(params.category).slice(0, 100);
  const requestedPage = Number.parseInt(first(params.page) || '1', 10);
  const page = Number.isSafeInteger(requestedPage) && requestedPage >= 1 ? requestedPage : 1;

  const { products, pagination } = await listProductsFresh({
    ...(search ? { search } : {}),
    ...(category ? { category } : {}),
    page,
    pageSize: ADMIN_PAGE_SIZE,
  });

  const hrefFor = (next: number) => ({
    pathname: '/admin/products' as const,
    query: {
      ...(search ? { search } : {}),
      ...(category ? { category } : {}),
      ...(next > 1 ? { page: String(next) } : {}),
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-wrap items-end gap-3" role="search">
        <div className="flex min-w-40 flex-1 flex-col gap-1">
          <Label htmlFor="admin-product-search">Search</Label>
          <Input
            id="admin-product-search"
            type="search"
            name="search"
            defaultValue={search}
            maxLength={200}
          />
        </div>
        <div className="flex w-40 flex-col gap-1">
          <Label htmlFor="admin-product-category">Category</Label>
          <NativeSelect id="admin-product-category" name="category" defaultValue={category}>
            <option value="">All</option>
            {CATEGORIES.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.label}
              </option>
            ))}
            {category && !CATEGORIES.some((item) => item.slug === category) ? (
              <option value={category}>{category}</option>
            ) : null}
          </NativeSelect>
        </div>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <div className="flex flex-col gap-2 rounded-lg bg-muted p-3 text-sm">
        <p>
          This list shows <strong>active products only</strong>. The backend has no admin product
          list yet (GAP-3). To edit or reactivate a deactivated product, open it by its ID.
        </p>
        <form action={openById} className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-56 flex-1 flex-col gap-1">
            <Label htmlFor="open-by-id">Product ID</Label>
            <Input
              id="open-by-id"
              name="id"
              className="bg-background font-mono"
              placeholder="24 hex characters"
              pattern="[0-9a-fA-F]{24}"
              required
              aria-invalid={params.idError ? true : undefined}
            />
          </div>
          <Button type="submit" variant="outline">
            Open
          </Button>
        </form>
        {params.idError ? (
          <p role="alert" className="text-destructive">
            That is not a valid product ID.
          </p>
        ) : null}
      </div>

      {products.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-12 text-center text-muted-foreground">
          No active products match.
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">
                  <span className="hidden sm:inline">Available / reserved</span>
                  <span className="sm:hidden">Stock</span>
                </TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} data-testid="admin-product-row">
                  <TableCell className="max-w-48 whitespace-normal">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="font-medium hover:underline"
                    >
                      {product.name}
                    </Link>
                    <p className="font-mono text-xs break-all text-muted-foreground">
                      {product.id}
                    </p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {categoryLabel(product.category)}
                  </TableCell>
                  <TableCell className="text-right">{formatMoney(product.price)}</TableCell>
                  <TableCell className="text-right" data-testid="admin-stock">
                    {product.stock?.available ?? 0} / {product.stock?.reserved ?? 0}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={product.isActive ? 'secondary' : 'outline'}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ProductRowActions product={product} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PaginationNav
        page={pagination?.page ?? page}
        totalPages={pagination?.totalPages ?? 1}
        hrefFor={hrefFor}
      />
    </div>
  );
}
