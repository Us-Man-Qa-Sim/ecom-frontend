'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  addLine,
  removeLine,
  setLineQuantity,
  type AddResult,
  type CartLine,
  type CartSnapshot,
} from './cart';

export const CART_STORAGE_KEY = 'ecom.cart.v1';

type CartValidator = (value: unknown) => CartLine[];
let validateStoredLines: CartValidator | undefined;

/**
 * The zod validator lives in `cart-schema.ts` and is loaded on demand, so it
 * is handed in here before the first rehydration. Without it nothing from
 * localStorage is accepted.
 */
export function setCartValidator(validator: CartValidator) {
  validateStoredLines = validator;
}

type CartState = {
  lines: CartLine[];
  /** False during SSR and until localStorage has been read (no hydration mismatch). */
  hydrated: boolean;
  add: (item: { productId: string; snapshot: CartSnapshot }, quantity: number) => AddResult;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  replace: (lines: CartLine[]) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      hydrated: false,
      add: (item, quantity) => {
        const result = addLine(get().lines, item, quantity);
        if (result.ok) set({ lines: result.lines });
        return result;
      },
      setQuantity: (productId, quantity) =>
        set({ lines: setLineQuantity(get().lines, productId, quantity) }),
      remove: (productId) => set({ lines: removeLine(get().lines, productId) }),
      replace: (lines) => set({ lines }),
      clear: () => set({ lines: [] }),
    }),
    {
      name: CART_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lines: state.lines }),
      // Rehydration is started by <CartHydrator> after mount.
      skipHydration: true,
      // Stored data is never trusted: it is validated with zod, bad data means an empty cart.
      merge: (persisted, current) => ({
        ...current,
        lines:
          validateStoredLines?.((persisted as { lines?: unknown } | undefined)?.lines) ?? [],
      }),
      migrate: (persisted) => persisted as { lines: CartLine[] },
      onRehydrateStorage: () => () => {
        useCartStore.setState({ hydrated: true });
      },
    },
  ),
);
