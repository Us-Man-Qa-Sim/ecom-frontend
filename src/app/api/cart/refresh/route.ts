import { z } from 'zod';
import type { LiveProduct } from '@/features/cart/cart';
import { MAX_CART_LINES } from '@/features/cart/cart';
import { getProduct, getProductFresh } from '@/features/catalog/data';
import { allowedImageUrl } from '@/features/catalog/images';
import { isApiError } from '@/lib/api/errors';

// BFF endpoint for the cart refresh (CART-4). GAP-7: there is no batch lookup
// on the gateway yet, so this makes one `GET /products/:id` per line, a few at
// a time. With `fresh: false` the shared catalog cache answers most of them.

const bodySchema = z.object({
  ids: z
    .array(z.string().regex(/^[0-9a-f]{24}$/i))
    .min(1)
    .max(MAX_CART_LINES),
  fresh: z.boolean().optional(),
});

const CONCURRENCY = 5;

export type CartRefreshResponse = {
  /** null = the product no longer exists or is inactive. A missing id = the lookup failed. */
  products: Record<string, LiveProduct | null>;
};

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ message: 'Invalid cart refresh request.' }, { status: 400 });
  }

  const ids = [...new Set(parsed.data.ids)];
  const load = parsed.data.fresh ? getProductFresh : getProduct;
  const products: CartRefreshResponse['products'] = {};
  let rateLimited = false;

  const queue = [...ids];
  const worker = async () => {
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      try {
        const product = await load(id);
        products[id] = product
          ? {
              id: product.id,
              name: product.name,
              price: product.price,
              available: product.stock?.available ?? 0,
              image: allowedImageUrl(product.images[0]),
            }
          : null;
      } catch (error) {
        // Leave the id out: the client keeps that line as it is.
        if (isApiError(error) && error.status === 429) rateLimited = true;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));

  if (rateLimited && Object.keys(products).length === 0) {
    return Response.json(
      { message: 'Too many requests. Please wait a minute and try again.' },
      { status: 429 },
    );
  }
  return Response.json({ products } satisfies CartRefreshResponse, {
    headers: { 'cache-control': 'no-store' },
  });
}
