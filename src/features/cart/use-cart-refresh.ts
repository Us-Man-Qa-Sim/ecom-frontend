'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { create } from 'zustand';
import type { CartRefreshResponse } from '@/app/api/cart/refresh/route';
import { fetchJson } from '@/lib/http-error';
import { reconcileCart, type CartNotice } from './cart';
import { useCartStore } from './store';

/**
 * What the last refreshes changed. Kept outside the query: after a line is
 * removed, the next refresh has nothing to say about it, but the user should
 * still see why it is gone.
 */
const useCartNoticeStore = create<{ notices: CartNotice[] }>(() => ({ notices: [] }));

function addNotices(incoming: CartNotice[]) {
  if (incoming.length === 0) return;
  useCartNoticeStore.setState(({ notices }) => ({
    notices: [
      ...notices.filter((old) => !incoming.some((notice) => notice.productId === old.productId)),
      ...incoming,
    ],
  }));
}

export function clearCartNotices() {
  useCartNoticeStore.setState({ notices: [] });
}

/**
 * Checks the cart against live prices and stock (CART-4) and applies the
 * result to the store. Returns what changed so the page can tell the user.
 */
export function useCartRefresh({ fresh = false }: { fresh?: boolean } = {}) {
  const hydrated = useCartStore((state) => state.hydrated);
  const lines = useCartStore((state) => state.lines);
  const notices = useCartNoticeStore((state) => state.notices);

  // Only the set of products matters, not their order or quantities.
  const idsKey = useMemo(
    () =>
      lines
        .map((line) => line.productId)
        .sort()
        .join(','),
    [lines],
  );

  const query = useQuery({
    queryKey: ['cart-refresh', idsKey, fresh],
    enabled: hydrated && idsKey.length > 0,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { products } = await fetchJson<CartRefreshResponse>('/api/cart/refresh', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids: idsKey.split(','), fresh }),
      });

      // Apply the result to the cart as it is now, not as it was when the request started.
      const current = useCartStore.getState().lines;
      const result = reconcileCart(current, new Map(Object.entries(products)));
      if (JSON.stringify(result.lines) !== JSON.stringify(current)) {
        useCartStore.getState().replace(result.lines);
      }
      addNotices(result.notices);
      return products;
    },
  });

  const { data } = query;
  const { stockById, unavailable } = useMemo(() => {
    const stock = new Map<string, number>();
    const out = new Set<string>();
    const inCart = new Set(lines.map((line) => line.productId));
    for (const [id, product] of Object.entries(data ?? {})) {
      if (!product || !inCart.has(id)) continue;
      stock.set(id, product.available);
      if (product.available <= 0) out.add(id);
    }
    return { stockById: stock, unavailable: out };
  }, [data, lines]);

  return {
    notices,
    dismissNotices: clearCartNotices,
    /** Lines that are out of stock. Checkout is blocked while there are any. */
    unavailable: unavailable as ReadonlySet<string>,
    /** Live `available` per product id, for the quantity steppers. */
    stockById: stockById as ReadonlyMap<string, number>,
    isChecking: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
