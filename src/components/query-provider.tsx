'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useState, type ReactNode } from 'react';
import { HttpError } from '@/lib/http-error';

// Loaded only in `next dev`, so the devtools are never downloaded in production.
const Devtools = dynamic(
  () => import('@tanstack/react-query-devtools').then((module) => module.ReactQueryDevtools),
  { ssr: false },
);

// TanStack Query is only used where the browser must fetch: order-status
// polling and the cart refresh (FD5). Everything else is Server Components, so
// this provider wraps those pages only, not the whole app.
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
        <Devtools initialIsOpen={false} buttonPosition="bottom-left" />
      ) : null}
    </QueryClientProvider>
  );
}
