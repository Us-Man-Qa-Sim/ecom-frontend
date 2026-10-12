'use client';

import { useId, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { FormAlert } from '@/components/form/form-alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ActionError } from '@/lib/api/errors';
import type { Order } from '@/lib/api/types';
import { cancelOrderAction } from './actions';
import { CANCEL_REASON_MAX } from './schemas';

type Props = {
  orderId: string;
  onCancelled: (order: Order) => void;
};

/** Cancel with an optional reason (CHK-6). Shown only for PENDING and CONFIRMED orders. */
export function CancelOrderDialog({ orderId, onCancelled }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<ActionError>();
  const [pending, startTransition] = useTransition();
  const reasonId = useId();

  const submit = () =>
    startTransition(async () => {
      const result = await cancelOrderAction(orderId, { reason });
      if (result.ok) {
        toast.success('Order cancelled.');
        setOpen(false);
        onCancelled(result.order);
      } else {
        setError(result);
      }
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(undefined);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive">Cancel order</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this order?</DialogTitle>
          <DialogDescription>
            Reserved stock is released. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <FormAlert
            message={error?.fieldErrors.reason ?? error?.message}
            requestId={error?.requestId}
          />
          <Label htmlFor={reasonId}>Reason (optional)</Label>
          <Textarea
            id={reasonId}
            value={reason}
            maxLength={CANCEL_REASON_MAX}
            rows={3}
            placeholder="Changed my mind"
            onChange={(event) => setReason(event.target.value)}
          />
          <p className="text-muted-foreground text-xs" aria-live="polite">
            {reason.length}/{CANCEL_REASON_MAX}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Keep order
          </Button>
          <Button variant="destructive" onClick={submit} disabled={pending}>
            {pending ? 'Cancelling…' : 'Cancel order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
