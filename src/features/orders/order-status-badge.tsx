import { Badge } from '@/components/ui/badge';
import type { OrderStatus } from '@/lib/api/types';
import { STATUS_LABELS } from './status';

const VARIANTS = {
  PENDING: 'outline',
  CONFIRMED: 'secondary',
  SHIPPED: 'secondary',
  DELIVERED: 'default',
  CANCELLED: 'destructive',
} as const;

export function OrderStatusBadge({ status }: { status: OrderStatus | null }) {
  if (!status) return <Badge variant="outline">Unknown</Badge>;
  return (
    <Badge variant={VARIANTS[status]} data-testid="order-status" data-status={status}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
