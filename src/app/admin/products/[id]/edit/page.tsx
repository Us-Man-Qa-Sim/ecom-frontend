import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ListSkeleton } from '@/components/page-skeleton';
import { Badge } from '@/components/ui/badge';
import { ProductForm } from '@/features/admin/product-form';
import { getProductIncludingInactive } from '@/features/catalog/data';
import { requireAdmin } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Edit product' };

export default function EditProductPage({ params }: PageProps<'/admin/products/[id]/edit'>) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit product</h1>
      <Suspense fallback={<ListSkeleton rows={4} label="Loading product" />}>
        <EditProduct params={params} />
      </Suspense>
    </div>
  );
}

async function EditProduct({ params }: Pick<PageProps<'/admin/products/[id]/edit'>, 'params'>) {
  const { id } = await params;
  await requireAdmin(`/admin/products/${id}/edit`);
  // GAP-3: read through the public route, which still returns inactive products (GAP-4).
  const product = await getProductIncludingInactive(id);
  if (!product) notFound();

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-muted-foreground font-mono text-xs break-all">{product.id}</p>
        {product.isActive ? null : <Badge variant="outline">Inactive</Badge>}
      </div>
      <ProductForm key={product.updatedAt ?? product.id} product={product} />
    </>
  );
}
