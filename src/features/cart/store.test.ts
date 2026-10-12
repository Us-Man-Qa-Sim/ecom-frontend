import { beforeEach, describe, expect, it } from 'vitest';
import { parseStoredLines } from './cart-schema';
import { CART_STORAGE_KEY, setCartValidator, useCartStore } from './store';

const productId = 'a'.repeat(24);
const item = {
  productId,
  snapshot: { name: 'Mug', price: { amountMinor: 1299, currency: 'USD' }, image: null },
};

beforeEach(() => {
  setCartValidator(parseStoredLines);
  localStorage.clear();
  useCartStore.setState({ lines: [], hydrated: false });
});

describe('cart store', () => {
  it('starts empty and not hydrated (SSR-safe)', () => {
    expect(useCartStore.getState()).toMatchObject({ lines: [], hydrated: false });
  });

  it('persists under the versioned key', () => {
    useCartStore.getState().add(item, 2);

    const stored = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? '{}');
    expect(stored).toEqual({ state: { lines: [{ ...item, quantity: 2 }] }, version: 1 });
  });

  it('rehydrates a stored cart and marks itself hydrated', async () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ state: { lines: [{ ...item, quantity: 3 }] }, version: 1 }),
    );

    await useCartStore.persist.rehydrate();

    expect(useCartStore.getState().lines).toEqual([{ ...item, quantity: 3 }]);
    expect(useCartStore.getState().hydrated).toBe(true);
  });

  it.each([
    ['broken JSON', '{not json'],
    ['a wrong shape', JSON.stringify({ state: { lines: [{ productId: 1 }] }, version: 1 })],
    [
      'a tampered price',
      JSON.stringify({
        state: {
          lines: [
            {
              ...item,
              quantity: 1,
              snapshot: { ...item.snapshot, price: { amountMinor: -5, currency: 'USD' } },
            },
          ],
        },
        version: 1,
      }),
    ],
  ])('turns %s in localStorage into an empty cart', async (_label, raw) => {
    localStorage.setItem(CART_STORAGE_KEY, raw);

    await useCartStore.persist.rehydrate();

    expect(useCartStore.getState().lines).toEqual([]);
  });

  it('does not add an item in another currency', () => {
    useCartStore.getState().add(item, 1);
    const result = useCartStore.getState().add(
      {
        productId: 'b'.repeat(24),
        snapshot: { name: 'Tasse', price: { amountMinor: 900, currency: 'EUR' }, image: null },
      },
      1,
    );

    expect(result).toEqual({ ok: false, reason: 'mixed-currency' });
    expect(useCartStore.getState().lines).toHaveLength(1);
  });

  it('clears', () => {
    useCartStore.getState().add(item, 1);
    useCartStore.getState().clear();
    expect(useCartStore.getState().lines).toEqual([]);
  });
});
