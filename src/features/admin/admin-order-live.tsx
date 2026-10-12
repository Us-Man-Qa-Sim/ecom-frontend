'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { FormAlert } from '@/components/form/form-alert';
import { Button } from '@/components/ui/button';
import { OrderLive } from '@/features/orders/order-live';
import { canDeliver, canShip } from '@/features/orders/status';
import type { ActionError, ActionResult } from '@/lib/api/errors';
import type { Order } from '@/lib/api/types';
import { deliverOrderAction, shipOrderAction } from './actions';

/** Order status for admins: the buttons follow the state machine (ADM-7). */
export function AdminOrderLive({ order }: { order: Order }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<ActionError>();

  const run = (
    action: (id: string) => Promise<ActionResult<{ order: Order }>>,
    success: string,
    current: Order,
    setOrder: (order: Order) => void,
  ) =>
    startTransition(async () => {
      setError(undefined);
      const result = await action(current.id);
      if (result.ok) {
        toast.success(success);
        setOrder(result.order);
      } else {
        setError(result);
      }
    });

  return (
    <div className="flex flex-col gap-3">
      <FormAlert message={error?.message} requestId={error?.requestId} />
      <OrderLive
        order={order}
        showCartHint={false}
        renderActions={(current, setOrder) => (
          <>
            {canShip(current.status) ? (
              <Button
                disabled={pending}
                onClick={() => run(shipOrderAction, 'Order marked as shipped.', current, setOrder)}
              >
                Mark as shipped
              </Button>
            ) : null}
            {canDeliver(current.status) ? (
              <Button
                disabled={pending}
                onClick={() =>
                  run(deliverOrderAction, 'Order marked as delivered.', current, setOrder)
                }
              >
                Mark as delivered
              </Button>
            ) : null}
          </>
        )}
      />
    </div>
  );
}
