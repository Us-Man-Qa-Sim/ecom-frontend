'use client';

import { TriangleAlertIcon } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  error: Error & { digest?: string };
  retry: () => void;
  title?: string;
};

/**
 * Shared body of every `error.tsx` (CAT-7, UX-3). `error.digest` is the
 * gateway request id when an ApiError caused the failure, so the reference can
 * be looked up in the backend logs.
 */
export function ErrorView({ error, retry, title = 'Something went wrong' }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-4 py-16 text-center">
      <TriangleAlertIcon className="size-8 text-destructive" aria-hidden />
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="max-w-md text-muted-foreground">
        The page could not be loaded. Please try again in a moment.
      </p>
      {error.digest ? (
        <p
          className="font-mono text-xs break-all text-muted-foreground"
          data-testid="error-reference"
        >
          Reference: {error.digest}
        </p>
      ) : null}
      <Button onClick={retry}>Try again</Button>
    </div>
  );
}
