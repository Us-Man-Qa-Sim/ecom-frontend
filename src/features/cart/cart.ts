import { multiplyMoney, sumMoney, type Money } from '@/lib/money';

// Pure cart logic (FD10). The store, the cart page and the tests all use these
// functions. The cart is only a suggestion: order-service takes price, name
// and stock from the backend when the order is placed.

/** Limits from the gateway's CreateOrderDto. */
export const MAX_CART_LINES = 100;
export const MAX_LINE_QUANTITY = 10_000;

export type CartSnapshot = { name: string; price: Money; image: string | null };
export type CartLine = { productId: string; quantity: number; snapshot: CartSnapshot };

export type AddFailure = 'mixed-currency' | 'too-many-lines' | 'max-quantity';
export type AddResult = { ok: true; lines: CartLine[] } | { ok: false; reason: AddFailure };

export const ADD_FAILURE_MESSAGES: Record<AddFailure, string> = {
  'mixed-currency':
    'Your cart has items in another currency. One order can only use one currency, so check out or empty the cart first.',
  'too-many-lines': `A cart can hold at most ${MAX_CART_LINES} different products.`,
  'max-quantity': `You can order at most ${MAX_LINE_QUANTITY.toLocaleString('en-US')} of one product.`,
};

export function cartCurrency(lines: CartLine[]): string | null {
  return lines[0]?.snapshot.price.currency ?? null;
}

export function addLine(
  lines: CartLine[],
  item: { productId: string; snapshot: CartSnapshot },
  quantity: number,
): AddResult {
  const currency = cartCurrency(lines);
  if (currency && currency !== item.snapshot.price.currency) {
    return { ok: false, reason: 'mixed-currency' };
  }

  const existing = lines.find((line) => line.productId === item.productId);
  if (existing) {
    if (existing.quantity >= MAX_LINE_QUANTITY) return { ok: false, reason: 'max-quantity' };
    return {
      ok: true,
      lines: lines.map((line) =>
        line.productId === item.productId
          ? {
              ...line,
              snapshot: item.snapshot,
              quantity: Math.min(line.quantity + quantity, MAX_LINE_QUANTITY),
            }
          : line,
      ),
    };
  }

  if (lines.length >= MAX_CART_LINES) return { ok: false, reason: 'too-many-lines' };
  return {
    ok: true,
    lines: [...lines, { ...item, quantity: Math.min(Math.max(1, quantity), MAX_LINE_QUANTITY) }],
  };
}

export function setLineQuantity(
  lines: CartLine[],
  productId: string,
  quantity: number,
): CartLine[] {
  if (!Number.isFinite(quantity)) return lines;
  const clamped = Math.min(Math.max(1, Math.trunc(quantity)), MAX_LINE_QUANTITY);
  return lines.map((line) =>
    line.productId === productId ? { ...line, quantity: clamped } : line,
  );
}

export function removeLine(lines: CartLine[], productId: string): CartLine[] {
  return lines.filter((line) => line.productId !== productId);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((total, line) => total + line.quantity, 0);
}

export function lineTotal(line: CartLine): Money {
  return multiplyMoney(line.snapshot.price, line.quantity);
}

export function cartSubtotal(lines: CartLine[]): Money | null {
  return sumMoney(lines.map(lineTotal));
}

// ── Refresh against live data (CART-4) ──

export type LiveProduct = {
  id: string;
  name: string;
  price: Money | null;
  available: number;
  image: string | null;
};

export type CartNotice =
  | { type: 'removed'; productId: string; name: string }
  | { type: 'price-changed'; productId: string; name: string; from: Money; to: Money }
  | { type: 'quantity-reduced'; productId: string; name: string; from: number; to: number }
  | { type: 'out-of-stock'; productId: string; name: string };

/**
 * Brings the cart in line with live data. `live` maps a product id to the
 * product, or to null when it no longer exists or is inactive. Lines whose id
 * is missing from the map (lookup failed) are left alone.
 */
export function reconcileCart(
  lines: CartLine[],
  live: ReadonlyMap<string, LiveProduct | null>,
): { lines: CartLine[]; notices: CartNotice[]; unavailable: Set<string> } {
  const notices: CartNotice[] = [];
  const unavailable = new Set<string>();
  const next: CartLine[] = [];

  for (const line of lines) {
    if (!live.has(line.productId)) {
      next.push(line);
      continue;
    }
    const product = live.get(line.productId);
    const name = line.snapshot.name;

    if (!product || !product.price) {
      notices.push({ type: 'removed', productId: line.productId, name });
      continue;
    }

    let updated: CartLine = line;
    const priceChanged =
      product.price.amountMinor !== line.snapshot.price.amountMinor ||
      product.price.currency !== line.snapshot.price.currency;
    if (priceChanged) {
      notices.push({
        type: 'price-changed',
        productId: line.productId,
        name: product.name,
        from: line.snapshot.price,
        to: product.price,
      });
    }
    if (priceChanged || product.name !== name || product.image !== line.snapshot.image) {
      updated = {
        ...updated,
        snapshot: { name: product.name, price: product.price, image: product.image },
      };
    }

    if (product.available <= 0) {
      // Keep the line so the user sees it, but checkout is blocked.
      notices.push({ type: 'out-of-stock', productId: line.productId, name: product.name });
      unavailable.add(line.productId);
    } else if (updated.quantity > product.available) {
      notices.push({
        type: 'quantity-reduced',
        productId: line.productId,
        name: product.name,
        from: updated.quantity,
        to: product.available,
      });
      updated = { ...updated, quantity: product.available };
    }

    next.push(updated);
  }

  return { lines: next, notices, unavailable };
}
