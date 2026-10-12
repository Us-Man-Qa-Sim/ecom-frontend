import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ProductNotFound() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <h1 className="text-2xl font-semibold">Product not found</h1>
      <p className="text-muted-foreground">It may have been removed or is no longer for sale.</p>
      <Button asChild>
        <Link href="/products">Browse all products</Link>
      </Button>
    </div>
  );
}
