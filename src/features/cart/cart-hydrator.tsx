'use client';

import { useEffect } from 'react';
import { CART_STORAGE_KEY, useCartStore } from './store';

/**
 * Reads the cart from localStorage after mount (CART-2) and keeps tabs in
 * sync: a change in another tab fires a `storage` event here (CART-6).
 */
export function CartHydrator() {
  useEffect(() => {
    void useCartStore.persist.rehydrate();

    const onStorage = (event: StorageEvent) => {
      if (event.key === CART_STORAGE_KEY || event.key === null) {
        void useCartStore.persist.rehydrate();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return null;
}
