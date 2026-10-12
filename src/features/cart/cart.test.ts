import { describe, expect, it } from 'vitest';
import {
  MAX_CART_LINES,
  MAX_LINE_QUANTITY,
  addLine,
  cartCount,
  cartSubtotal,
  reconcileCart,
  removeLine,
  setLineQuantity,
  type CartLine,
  type LiveProduct,
} from './cart';
import { parseStoredLines } from './cart-schema';

const id = (n: number) => n.toString(16).padStart(24, '0');
const usd = (amountMinor: number) => ({ amountMinor, currency: 'USD' });

function item(n: number, price = usd(1000)) {
  return { productId: id(n), snapshot: { name: `Product ${n}`, price, image: null } };
}
function line(n: number, quantity = 1, price = usd(1000)): CartLine {
  return { ...item(n, price), quantity };
}
function live(n: number, overrides: Partial<LiveProduct> = {}): [string, LiveProduct] {
  return [
    id(n),
    { id: id(n), name: `Product ${n}`, price: usd(1000), available: 50, image: null, ...overrides },
  ];
}

describe('addLine', () => {
  it('adds a new line', () => {
    const result = addLine([], item(1), 2);
    expect(result).toEqual({ ok: true, lines: [line(1, 2)] });
  });

  it('adds to the quantity of an existing line', () => {
    const result = addLine([line(1, 2)], item(1), 3);
    expect(result.ok && result.lines).toEqual([line(1, 5)]);
  });

  it('caps the quantity at the gateway limit', () => {
    const result = addLine([line(1, 9_999)], item(1), 50);
    expect(result.ok && result.lines[0]?.quantity).toBe(MAX_LINE_QUANTITY);
    expect(addLine([line(1, MAX_LINE_QUANTITY)], item(1), 1)).toEqual({
      ok: false,
      reason: 'max-quantity',
    });
  });

  it('refuses a second currency (order-service rejects mixed carts)', () => {
    const result = addLine([line(1)], item(2, { amountMinor: 500, currency: 'EUR' }), 1);
    expect(result).toEqual({ ok: false, reason: 'mixed-currency' });
  });

  it('refuses more than 100 different products', () => {
    const full = Array.from({ length: MAX_CART_LINES }, (_, index) => line(index + 1));
    expect(addLine(full, item(500), 1)).toEqual({ ok: false, reason: 'too-many-lines' });
    // An existing product can still be increased.
    expect(addLine(full, item(1), 1).ok).toBe(true);
  });
});

describe('setLineQuantity / removeLine', () => {
  it('clamps to 1…10 000 and ignores junk', () => {
    expect(setLineQuantity([line(1, 3)], id(1), 0)[0]?.quantity).toBe(1);
    expect(setLineQuantity([line(1, 3)], id(1), -5)[0]?.quantity).toBe(1);
    expect(setLineQuantity([line(1, 3)], id(1), 99_999)[0]?.quantity).toBe(MAX_LINE_QUANTITY);
    expect(setLineQuantity([line(1, 3)], id(1), 2.9)[0]?.quantity).toBe(2);
    expect(setLineQuantity([line(1, 3)], id(1), Number.NaN)[0]?.quantity).toBe(3);
  });

  it('removes one line', () => {
    expect(removeLine([line(1), line(2)], id(1))).toEqual([line(2)]);
  });
});

describe('totals', () => {
  it('counts units and sums minor units', () => {
    const lines = [line(1, 2, usd(1999)), line(2, 1, usd(500))];
    expect(cartCount(lines)).toBe(3);
    expect(cartSubtotal(lines)).toEqual(usd(4498));
    expect(cartSubtotal([])).toBeNull();
  });
});

describe('parseStoredLines (never trust localStorage)', () => {
  it('accepts a valid cart', () => {
    expect(parseStoredLines([line(1, 2)])).toEqual([line(1, 2)]);
  });

  it.each([
    ['not an array', { lines: 'x' }],
    ['null', null],
    ['a string', 'corrupted'],
    ['a bad product id', [{ ...line(1), productId: '<script>' }]],
    ['a zero quantity', [line(1, 0)]],
    ['a float price', [line(1, 1, usd(9.99))]],
    ['a negative price', [line(1, 1, usd(-1))]],
    ['a missing snapshot', [{ productId: id(1), quantity: 1 }]],
    ['too many lines', Array.from({ length: 101 }, (_, index) => line(index + 1))],
  ])('turns %s into an empty cart', (_label, value) => {
    expect(parseStoredLines(value)).toEqual([]);
  });

  it('drops duplicate product ids', () => {
    expect(parseStoredLines([line(1, 2), line(1, 5)])).toEqual([line(1, 2)]);
  });
});

describe('reconcileCart', () => {
  it('leaves an up-to-date cart alone', () => {
    const lines = [line(1, 2)];
    const result = reconcileCart(lines, new Map([live(1)]));
    expect(result.lines).toEqual(lines);
    expect(result.notices).toEqual([]);
  });

  it('removes deleted or inactive products', () => {
    const result = reconcileCart([line(1), line(2)], new Map([[id(1), null], live(2)]));
    expect(result.lines).toEqual([line(2)]);
    expect(result.notices).toEqual([{ type: 'removed', productId: id(1), name: 'Product 1' }]);
  });

  it('updates a changed price and says so', () => {
    const result = reconcileCart([line(1, 2)], new Map([live(1, { price: usd(1200) })]));
    expect(result.lines[0]?.snapshot.price).toEqual(usd(1200));
    expect(result.notices).toEqual([
      {
        type: 'price-changed',
        productId: id(1),
        name: 'Product 1',
        from: usd(1000),
        to: usd(1200),
      },
    ]);
  });

  it('clamps the quantity to the available stock', () => {
    const result = reconcileCart([line(1, 10)], new Map([live(1, { available: 4 })]));
    expect(result.lines[0]?.quantity).toBe(4);
    expect(result.notices).toEqual([
      { type: 'quantity-reduced', productId: id(1), name: 'Product 1', from: 10, to: 4 },
    ]);
  });

  it('keeps an out-of-stock line but marks it unavailable', () => {
    const result = reconcileCart([line(1, 2)], new Map([live(1, { available: 0 })]));
    expect(result.lines).toEqual([line(1, 2)]);
    expect(result.unavailable.has(id(1))).toBe(true);
    expect(result.notices[0]?.type).toBe('out-of-stock');
  });

  it('does not touch a line whose lookup failed', () => {
    const result = reconcileCart([line(1), line(2)], new Map([live(2)]));
    expect(result.lines).toEqual([line(1), line(2)]);
  });
});
