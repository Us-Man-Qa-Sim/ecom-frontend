import type { Metadata } from 'next';
import { ProductForm } from '@/features/admin/product-form';

export const metadata: Metadata = { title: 'New product' };

export default function NewProductPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">New product</h1>
      <ProductForm />
    </div>
  );
}
