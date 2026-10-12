import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { UrlObject } from 'node:url';
import { Button } from '@/components/ui/button';

type Href = UrlObject | Route;

type Props = {
  page: number;
  totalPages: number;
  /** Builds the link for a page number. The other filters must be kept. */
  hrefFor: (page: number) => Href;
};

export function PaginationNav({ page, totalPages, hrefFor }: Props) {
  if (totalPages <= 1) return null;
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-3">
      {hasPrevious ? (
        <Button asChild variant="outline" size="sm">
          <Link href={hrefFor(page - 1)} rel="prev">
            <ChevronLeftIcon /> Previous
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          <ChevronLeftIcon /> Previous
        </Button>
      )}
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Page <span className="font-medium text-foreground">{page}</span> of {totalPages}
      </p>
      {hasNext ? (
        <Button asChild variant="outline" size="sm">
          <Link href={hrefFor(page + 1)} rel="next">
            Next <ChevronRightIcon />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Next <ChevronRightIcon />
        </Button>
      )}
    </nav>
  );
}
