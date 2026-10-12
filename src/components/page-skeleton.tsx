import { Skeleton } from '@/components/ui/skeleton';

/** Generic loading state for a page section that waits for per-user data. */
export function ListSkeleton({ rows = 3, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div className="flex flex-col gap-3" aria-busy aria-label={label}>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  );
}
