import { z } from 'zod';
import { MAX_CART_LINES, MAX_LINE_QUANTITY } from '@/features/cart/cart';

// Limits copy the gateway's CreateOrderDto and CancelOrderDto (FD9).

export const placeOrderSchema = z.object({
  addressId: z.uuid('Choose a shipping address'),
  items: z
    .array(
      z.object({
        productId: z.string().regex(/^[0-9a-f]{24}$/i),
        quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
      }),
    )
    .min(1, 'Your cart is empty')
    .max(MAX_CART_LINES),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export const CANCEL_REASON_MAX = 500;

export const cancelOrderSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(CANCEL_REASON_MAX, `Use at most ${CANCEL_REASON_MAX} characters`),
});

export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
