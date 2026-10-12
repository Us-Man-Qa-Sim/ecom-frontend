'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import type { Order } from '@/lib/api/types';
import { CancelOrderDialog } from './cancel-order-dialog';
import { OrderStatusBadge } from './order-status-badge';
import { OrderTimeline } from './order-timeline';
import { canCancel } from './status';
import { useOrderPolling } from './use-order-polling';

type Props = {
  order: Order;
  /** Extra buttons for the current status (admin: ship, deliver). */
  renderActions?: (order: Order, setOrder: (order: Order) => void) => ReactNode;
  /** Customers get the link back to the cart after a cancellation. */
  showCartHint?: boolean;
};

/** The live part of the order page: status badge, timeline and the actions that depend on them. */
export function OrderLive({ order: initial, renderActions, showCartHint = true }: Props) {
  const { order, setOrder, timedOut, isPolling, error } = useOrderPolling(initial);

  return (
    <section aria-labelledby="status-heading" className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="status-heading" className="font-semibold">
          Status
        </h2>
        <OrderStatusBadge status={order.status} />
      </div>

      <div role="status" aria-live="polite" className="text-sm">
        {order.status === 'PENDING' && !timedOut ? (
          <p>We are reserving your items. This usually takes a few seconds.</p>
        ) : null}
        {timedOut ? (
          <p data-testid="still-processing">
            Still processing. You do not need to wait here: we will email you when the order is
            confirmed.
          </p>
        ) : null}
        {order.status === 'CONFIRMED' ? <p>Your items are reserved. We will ship them soon.</p> : null}
        {order.status === 'SHIPPED' ? <p>Your order is on its way.</p> : null}
        {order.status === 'DELIVERED' ? <p>Your order was delivered.</p> : null}
        {order.status === 'CANCELLED' ? (
          <p>
            This order was cancelled. If you did not cancel it yourself, an item was probably out
            of stock.
            {showCartHint ? (
              <>
                {' '}
                <Link href="/cart" className="underline underline-offset-4">
                  Back to your cart
                </Link>
                .
              </>
            ) : null}
          </p>
        ) : null}
        {error && isPolling ? (
          <p className="text-muted-foreground mt-1">
            The status could not be refreshed. Trying again…
          </p>
        ) : null}
      </div>

      <OrderTimeline status={order.status} />

      <div className="flex flex-wrap gap-2">
        {renderActions?.(order, setOrder)}
        {canCancel(order.status) ? (
          <CancelOrderDialog orderId={order.id} onCancelled={setOrder} />
        ) : null}
        {timedOut ? (
          <Button variant="outline" onClick={() => window.location.reload()}>
            Check again
          </Button>
        ) : null}
      </div>
    </section>
  );
}
