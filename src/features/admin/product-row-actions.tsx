'use client';

import { EllipsisVerticalIcon } from 'lucide-react';
import Link from 'next/link';
import { useId, useRef, useState, useTransition, type RefObject } from 'react';
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
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ActionError } from '@/lib/api/errors';
import type { Product } from '@/lib/api/types';
import { adjustStockAction, deleteProductAction, updateProductAction } from './actions';
import { parseDelta } from './product-form-model';

type Open = 'stock' | 'delete' | null;

export function ProductRowActions({ product }: { product: Product }) {
  const [open, setOpen] = useState<Open>(null);
  const [pending, startTransition] = useTransition();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const setActive = (isActive: boolean) =>
    startTransition(async () => {
      const result = await updateProductAction(product.id, { isActive });
      if (result.ok) toast.success(isActive ? 'Product activated.' : 'Product deactivated.');
      else toast.error(result.message);
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={menuButtonRef}
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${product.name}`}
          >
            <EllipsisVerticalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/products/${product.id}/edit`}>Edit</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setOpen('stock')}>Adjust stock</DropdownMenuItem>
          <DropdownMenuItem disabled={pending} onSelect={() => setActive(!product.isActive)}>
            {product.isActive ? 'Deactivate' : 'Activate'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setOpen('delete')}>
            Delete…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {open === 'stock' ? (
        <AdjustStockDialog
          product={product}
          onClose={() => setOpen(null)}
          returnFocusRef={menuButtonRef}
        />
      ) : null}
      {open === 'delete' ? (
        <DeleteProductDialog
          product={product}
          onClose={() => setOpen(null)}
          returnFocusRef={menuButtonRef}
        />
      ) : null}
    </>
  );
}

/** Signed delta with a preview of the result (ADM-5). */
type RowDialogProps = {
  product: Product;
  onClose: () => void;
  /** The row's menu button. Focus returns to it when the dialog closes. */
  returnFocusRef?: RefObject<HTMLButtonElement | null>;
};

function returnFocus(ref: RowDialogProps['returnFocusRef']) {
  return (event: Event) => {
    event.preventDefault();
    ref?.current?.focus();
  };
}

export function AdjustStockDialog({ product, onClose, returnFocusRef }: RowDialogProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<ActionError>();
  const [pending, startTransition] = useTransition();
  const inputId = useId();

  const available = product.stock?.available ?? 0;
  const delta = parseDelta(input);
  const result = delta === null ? null : available + delta;
  const invalid = delta === null || delta === 0 || (result !== null && result < 0);

  let hint = 'Use a negative number to remove stock, for example -3.';
  if (input.trim() && delta === null) hint = 'Enter a whole number, for example 10 or -3.';
  else if (delta === 0) hint = 'Enter a number other than 0.';
  else if (result !== null && result < 0)
    hint = `Only ${available} available. The stock cannot go below 0.`;

  const submit = () => {
    if (invalid || delta === null) return;
    startTransition(async () => {
      const response = await adjustStockAction(product.id, delta);
      if (response.ok) {
        toast.success(`Stock is now ${response.product.stock?.available ?? '—'}.`);
        onClose();
      } else {
        setError(response);
      }
    });
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent onCloseAutoFocus={returnFocus(returnFocusRef)}>
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>{product.name}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <FormAlert message={error?.message} requestId={error?.requestId} />
          <dl className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-lg border p-2">
              <dt className="text-xs text-muted-foreground">Available now</dt>
              <dd className="text-lg font-semibold">{available}</dd>
            </div>
            <div className="rounded-lg border p-2">
              <dt className="text-xs text-muted-foreground">Change</dt>
              <dd className="text-lg font-semibold">
                {delta === null ? '—' : delta > 0 ? `+${delta}` : delta}
              </dd>
            </div>
            <div className="rounded-lg border p-2">
              <dt className="text-xs text-muted-foreground">After</dt>
              <dd className="text-lg font-semibold" data-testid="stock-after">
                {result === null || result < 0 ? '—' : result}
              </dd>
            </div>
          </dl>
          <Label htmlFor={inputId}>Change by</Label>
          <Input
            id={inputId}
            inputMode="numeric"
            placeholder="+10 or -3"
            autoFocus
            value={input}
            aria-invalid={input.trim() && invalid ? true : undefined}
            aria-describedby={`${inputId}-hint`}
            onChange={(event) => setInput(event.target.value)}
          />
          <p id={`${inputId}-hint`} className="text-sm text-muted-foreground" aria-live="polite">
            {hint}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={invalid || pending}>
              {pending ? 'Saving…' : 'Apply'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Hard delete behind a typed confirmation (ADM-4). */
export function DeleteProductDialog({ product, onClose, returnFocusRef }: RowDialogProps) {
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<ActionError>();
  const [pending, startTransition] = useTransition();
  const inputId = useId();
  const matches = typed.trim() === product.name;

  const deactivate = () =>
    startTransition(async () => {
      const result = await updateProductAction(product.id, { isActive: false });
      if (result.ok) {
        toast.success('Product deactivated.');
        onClose();
      } else {
        setError(result);
      }
    });

  const remove = () =>
    startTransition(async () => {
      const result = await deleteProductAction(product.id);
      if (result.ok) {
        toast.success('Product deleted.');
        onClose();
      } else {
        setError(result);
      }
    });

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent onCloseAutoFocus={returnFocus(returnFocusRef)}>
        <DialogHeader>
          <DialogTitle>Delete “{product.name}”?</DialogTitle>
          <DialogDescription>
            This removes the product for good. It cannot be undone. Deactivating is usually better:
            the product disappears from the shop but can be turned back on.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <FormAlert message={error?.message} requestId={error?.requestId} />
          {product.isActive ? (
            <Button
              variant="outline"
              onClick={deactivate}
              disabled={pending}
              className="self-start"
            >
              Deactivate instead
            </Button>
          ) : null}
          <Label htmlFor={inputId}>Type the product name to confirm</Label>
          <Input
            id={inputId}
            value={typed}
            autoComplete="off"
            placeholder={product.name}
            onChange={(event) => setTyped(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={remove} disabled={!matches || pending}>
            {pending ? 'Deleting…' : 'Delete for good'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
