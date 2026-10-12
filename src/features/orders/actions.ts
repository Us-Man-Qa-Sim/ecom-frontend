'use server';

import { revalidatePath } from 'next/cache';
import { api, unwrap } from '@/lib/api/client';
import {
  isApiError,
  toActionError,
  validationError,
  type ActionError,
  type ActionResult,
} from '@/lib/api/errors';
import type { Order } from '@/lib/api/types';
import { requireSession } from '@/lib/auth/session';
import { zodFieldErrors } from '@/lib/zod-errors';
import { isOrderId } from './data';
import {
  cancelOrderSchema,
  placeOrderSchema,
  type CancelOrderInput,
  type PlaceOrderInput,
} from './schemas';

/** Turns gateway errors from `POST /orders` into something the user can act on (CHK-3). */
function placeOrderError(error: unknown): ActionError {
  const result = toActionError(error);
  switch (result.status) {
    case 409:
      // FAILED_PRECONDITION: inactive product, mixed currencies, address problem…
      return {
        ...result,
        message: `${result.message.replace(/\.$/, '')}. Your cart was checked again. Review it and try once more.`,
      };
    case 404:
      return {
        ...result,
        message: 'The shipping address or a product could not be found. Please review your order.',
      };
    case 429:
      return result;
    case 502:
    case 503:
    case 504:
      // GAP-11: there is no idempotency key, so a retry could create a second order.
      return {
        ...result,
        message:
          'We could not confirm whether your order was placed. Check “Orders” before trying again, so you do not order twice.',
      };
    default:
      return result;
  }
}

export async function placeOrderAction(
  input: PlaceOrderInput,
): Promise<ActionResult<{ orderId: string }>> {
  await requireSession('/checkout');
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) return validationError(zodFieldErrors(parsed.error));

  try {
    const client = await api();
    const order = (await unwrap(client.POST('/orders', { body: parsed.data }))) as Order;
    revalidatePath('/orders');
    return { ok: true, orderId: order.id };
  } catch (error) {
    if (!isApiError(error)) throw error;
    return placeOrderError(error);
  }
}

export async function cancelOrderAction(
  orderId: string,
  input: CancelOrderInput,
): Promise<ActionResult<{ order: Order }>> {
  await requireSession(`/orders/${orderId}`);
  if (!isOrderId(orderId)) return validationError({ root: 'Unknown order.' });
  const parsed = cancelOrderSchema.safeParse(input);
  if (!parsed.success) return validationError(zodFieldErrors(parsed.error));

  try {
    const client = await api();
    const order = (await unwrap(
      client.POST('/orders/{id}/cancel', {
        params: { path: { id: orderId } },
        body: parsed.data.reason ? { reason: parsed.data.reason } : {},
      }),
    )) as Order;
    revalidatePath('/orders');
    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/admin/orders');
    return { ok: true, order };
  } catch (error) {
    if (!isApiError(error)) throw error;
    const result = toActionError(error);
    if (result.status === 409) {
      return { ...result, message: 'This order can no longer be cancelled.' };
    }
    return result;
  }
}
