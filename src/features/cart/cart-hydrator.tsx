'use client';

import { useEffect } from 'react';
import { CART_STORAGE_KEY, setCartValidator, useCartStore } from './store';

/**
 * Reads the cart from localStorage after mount (CART-2) and keeps tabs in
 * sync: a change in another tab fires a `storage` event here (CART-6).
 */
export function CartHydrator() {
  useEffect(() => {
    let cancelled = false;

    const rehydrate = async () => {
      // Loaded on demand: zod is not needed to paint or hydrate the page.
      const { parseStoredLines } = await import('./cart-schema');
      if (cancelled) return;
      setCartValidator(parseStoredLines);
      await useCartStore.persist.rehydrate();
    };
    void rehydrate();

    const onStorage = (event: StorageEvent) => {
      if (event.key === CART_STORAGE_KEY || event.key === null) void rehydrate();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return null;
}
