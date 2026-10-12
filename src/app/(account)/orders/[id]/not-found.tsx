import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function OrderNotFound() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <h1 className="text-2xl font-semibold">Order not found</h1>
      <p className="text-muted-foreground">This order does not exist or is not yours.</p>
      <Button asChild>
        <Link href="/orders">Back to your orders</Link>
      </Button>
    </div>
  );
}
