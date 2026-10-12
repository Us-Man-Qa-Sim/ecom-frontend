'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';
import { HttpError } from '@/lib/http-error';

// TanStack Query is only used where the browser must fetch: order-status
// polling and the cart refresh (FD5). Everything else is Server Components.
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            refetchOnWindowFocus: false,
            // A 4xx will not get better by asking again.
            retry: (failureCount, error) =>
              !(error instanceof HttpError && error.status >= 400 && error.status < 500) &&
              failureCount < 2,
          },
          mutations: { retry: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === 'development' ? (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      ) : null}
    </QueryClientProvider>
  );
}
