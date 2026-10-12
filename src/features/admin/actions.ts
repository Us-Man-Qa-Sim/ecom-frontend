'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { PRODUCTS_TAG, productTag } from '@/features/catalog/data';
import { isOrderId } from '@/features/orders/data';
import { api, unwrap } from '@/lib/api/client';
import {
  isApiError,
  toActionError,
  validationError,
  type ActionResult,
} from '@/lib/api/errors';
import type { Order, Product } from '@/lib/api/types';
import { requireAdmin } from '@/lib/auth/session';
import { zodFieldErrors } from '@/lib/zod-errors';
import {
  adjustStockSchema,
  createProductBodySchema,
  updateProductBodySchema,
  type CreateProductBody,
  type UpdateProductBody,
} from './product-form-model';

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const unknownProduct = () => validationError({ root: 'Unknown product.' });

/** ADM-8: the storefront must show a product change right away. */
function productChanged(id: string) {
  updateTag(PRODUCTS_TAG);
  updateTag(productTag(id));
  revalidatePath('/admin/products');
  revalidatePath('/admin');
}

export async function createProductAction(
  body: CreateProductBody,
): Promise<ActionResult<{ product: Product }>> {
  await requireAdmin('/admin/products/new');
  const parsed = createProductBodySchema.safeParse(body);
  if (!parsed.success) return validationError(zodFieldErrors(parsed.error));

  try {
    const client = await api();
    const product = (await unwrap(
      client.POST('/admin/products', { body: parsed.data }),
    )) as Product;
    productChanged(product.id);
    return { ok: true, product };
  } catch (error) {
    if (!isApiError(error)) throw error;
    return toActionError(error);
  }
}

export async function updateProductAction(
  id: string,
  body: UpdateProductBody,
): Promise<ActionResult<{ product: Product }>> {
  await requireAdmin(`/admin/products/${id}/edit`);
  if (!OBJECT_ID.test(id)) return unknownProduct();
  const parsed = updateProductBodySchema.safeParse(body);
  if (!parsed.success) return validationError(zodFieldErrors(parsed.error));
  if (Object.keys(parsed.data).length === 0) {
    return validationError({ root: 'Nothing was changed.' });
  }

  try {
    const client = await api();
    const product = (await unwrap(
      client.PATCH('/admin/products/{id}', { params: { path: { id } }, body: parsed.data }),
    )) as Product;
    productChanged(id);
    return { ok: true, product };
  } catch (error) {
    if (!isApiError(error)) throw error;
    return toActionError(error);
  }
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  await requireAdmin('/admin/products');
  if (!OBJECT_ID.test(id)) return unknownProduct();

  try {
    const client = await api();
    await unwrap(client.DELETE('/admin/products/{id}', { params: { path: { id } } }));
    productChanged(id);
    return { ok: true };
  } catch (error) {
    if (!isApiError(error)) throw error;
    return toActionError(error);
  }
}

export async function adjustStockAction(
  id: string,
  delta: number,
): Promise<ActionResult<{ product: Product }>> {
  await requireAdmin('/admin/products');
  if (!OBJECT_ID.test(id)) return unknownProduct();
  const parsed = adjustStockSchema.safeParse({ delta });
  if (!parsed.success) return validationError(zodFieldErrors(parsed.error));

  try {
    const client = await api();
    const product = (await unwrap(
      client.POST('/admin/products/{id}/adjust-stock', {
        params: { path: { id } },
        body: parsed.data,
      }),
    )) as Product;
    productChanged(id);
    return { ok: true, product };
  } catch (error) {
    if (!isApiError(error)) throw error;
    const result = toActionError(error);
    if (result.status === 409) {
      return {
        ...result,
        message:
          'The stock cannot go below 0. Someone may have bought some in the meantime: reload and try a smaller number.',
      };
    }
    return result;
  }
}

// ── Orders ──

async function transitionOrder(
  id: string,
  path: '/admin/orders/{id}/ship' | '/admin/orders/{id}/deliver',
  conflictMessage: string,
): Promise<ActionResult<{ order: Order }>> {
  await requireAdmin(`/admin/orders/${id}`);
  if (!isOrderId(id)) return validationError({ root: 'Unknown order.' });

  try {
    const client = await api();
    const order = (await unwrap(client.POST(path, { params: { path: { id } } }))) as Order;
    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${id}`);
    revalidatePath('/admin');
    return { ok: true, order };
  } catch (error) {
    if (!isApiError(error)) throw error;
    const result = toActionError(error);
    return result.status === 409 ? { ...result, message: conflictMessage } : result;
  }
}

export async function shipOrderAction(id: string) {
  return transitionOrder(
    id,
    '/admin/orders/{id}/ship',
    'Only a confirmed order can be shipped. Reload to see its current status.',
  );
}

export async function deliverOrderAction(id: string) {
  return transitionOrder(
    id,
    '/admin/orders/{id}/deliver',
    'Only a shipped order can be delivered. Reload to see its current status.',
  );
}
