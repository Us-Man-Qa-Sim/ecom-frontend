import { Skeleton } from '@/components/ui/skeleton';

export default function ProductLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Loading product">
      <Skeleton className="h-4 w-40" />
      <div className="grid gap-8 md:grid-cols-2 md:gap-10">
        <Skeleton className="aspect-square w-full rounded-lg" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
