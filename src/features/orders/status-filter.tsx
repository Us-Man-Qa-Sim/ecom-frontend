import type { Route } from 'next';
import Link from 'next/link';
import type { UrlObject } from 'node:url';
import { ORDER_STATUSES, type OrderStatus } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { STATUS_LABELS } from './status';

type Props = {
  current: OrderStatus | undefined;
  hrefFor: (status: OrderStatus | undefined) => UrlObject | Route;
};

/** Status filter as links, so the filter lives in the URL. */
export function StatusFilter({ current, hrefFor }: Props) {
  const options: { status: OrderStatus | undefined; label: string }[] = [
    { status: undefined, label: 'All' },
    ...ORDER_STATUSES.map((status) => ({ status, label: STATUS_LABELS[status] })),
  ];

  return (
    <nav aria-label="Filter by status" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-1">
        {options.map((option) => {
          const active = option.status === current;
          return (
            <li key={option.label}>
              <Link
                href={hrefFor(option.status)}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'block rounded-full border px-3 py-1 text-sm whitespace-nowrap',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {option.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
