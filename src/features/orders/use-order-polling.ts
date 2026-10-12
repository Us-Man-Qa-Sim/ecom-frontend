'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import type { Order } from '@/lib/api/types';
import { fetchJson } from '@/lib/http-error';
import { nextPollInterval, pollTimedOut } from './status';

export const orderQueryKey = (id: string) => ['order', id] as const;

/**
 * Follows an order while it is PENDING (§3, CHK-4): polls the BFF route every
 * 1 s for 5 s, then every 3 s, and stops after 60 s or when the status changes.
 */
export function useOrderPolling(initial: Order) {
  const queryClient = useQueryClient();
  // The clock starts when this page opened, not when the order was created.
  const [startedAt] = useState(() => Date.now());
  const [timedOut, setTimedOut] = useState(false);

  const query = useQuery({
    queryKey: orderQueryKey(initial.id),
    queryFn: async () => (await fetchJson<{ order: Order }>(`/api/orders/${initial.id}`)).order,
    initialData: initial,
    staleTime: 0,
    refetchOnMount: false,
    refetchInterval: (current) =>
      nextPollInterval(Date.now() - startedAt, current.state.data?.status ?? null),
  });

  const order = query.data;
  const isPending = order.status === 'PENDING';

  // After the last poll nothing re-renders the page, so a timer flips the flag.
  useEffect(() => {
    if (!isPending) return;
    const timer = setInterval(() => {
      if (pollTimedOut(Date.now() - startedAt, 'PENDING')) setTimedOut(true);
    }, 1000);
    return () => clearInterval(timer);
  }, [isPending, startedAt]);

  const setOrder = useCallback(
    (next: Order) => queryClient.setQueryData(orderQueryKey(initial.id), next),
    [queryClient, initial.id],
  );

  return {
    order,
    setOrder,
    /** Still PENDING after 60 s: "Still processing, we'll email you". */
    timedOut: isPending && timedOut,
    isPolling: isPending && !timedOut,
    error: query.error,
  };
}
