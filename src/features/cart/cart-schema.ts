import * as z from 'zod/mini';
import { MAX_CART_LINES, MAX_LINE_QUANTITY, type CartLine } from './cart';

// Validation of the cart read from localStorage (FD10). Every page runs this
// when it hydrates the cart, so it uses the tree-shakable `zod/mini` build and
// is loaded on demand by <CartHydrator>: a few KB instead of all of zod (UX-5).

const moneySchema = z.object({
  amountMinor: z.number().check(z.int(), z.nonnegative()),
  currency: z.string().check(z.length(3)),
});

export const cartLineSchema = z.object({
  productId: z.string().check(z.regex(/^[0-9a-f]{24}$/i)),
  quantity: z.number().check(z.int(), z.minimum(1), z.maximum(MAX_LINE_QUANTITY)),
  snapshot: z.object({
    name: z.string().check(z.minLength(1), z.maxLength(200)),
    price: moneySchema,
    image: z.nullable(z.string().check(z.maxLength(2000))),
  }),
});

export const cartLinesSchema = z.array(cartLineSchema).check(z.maxLength(MAX_CART_LINES));

/** Anything that is not a valid cart (old version, edited by hand, corrupted) becomes an empty cart. */
export function parseStoredLines(value: unknown): CartLine[] {
  const parsed = z.safeParse(cartLinesSchema, value);
  if (!parsed.success) return [];
  // Drop duplicate product ids, keeping the first.
  const seen = new Set<string>();
  return parsed.data.filter((line) => !seen.has(line.productId) && seen.add(line.productId));
}
