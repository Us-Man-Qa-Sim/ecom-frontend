'use client';

import { MapPinIcon, PencilIcon, PlusIcon, StarIcon, Trash2Icon } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Address } from '@/lib/api/types';
import { deleteAddressAction, setDefaultAddressAction } from './actions';
import { AddressForm } from './address-form';
import { AddressLines } from './address-lines';

type Editing = { mode: 'new' } | { mode: 'edit'; address: Address } | null;

export function AddressBook({ addresses }: { addresses: Address[] }) {
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; message?: string }>, success: string) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(success);
      else toast.error(result.message ?? 'Something went wrong. Please try again.');
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          {addresses.length === 0
            ? 'You have no saved addresses yet.'
            : `${addresses.length} saved ${addresses.length === 1 ? 'address' : 'addresses'}`}
        </p>
        <Button onClick={() => setEditing({ mode: 'new' })}>
          <PlusIcon /> Add address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-12 text-center">
          <MapPinIcon className="text-muted-foreground size-8" aria-hidden />
          <p className="text-muted-foreground text-sm">Add an address to check out faster.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2" aria-label="Saved addresses">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="flex flex-col gap-3 rounded-lg border p-4"
              data-testid="address-card"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{address.label || 'Address'}</p>
                {address.isDefault ? <Badge variant="secondary">Default</Badge> : null}
              </div>
              <AddressLines address={address} />
              <div className="mt-auto flex flex-wrap gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing({ mode: 'edit', address })}
                  aria-label={`Edit ${address.label || address.street}`}
                >
                  <PencilIcon /> Edit
                </Button>
                {address.isDefault ? null : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(() => setDefaultAddressAction(address.id), 'Default address updated.')
                    }
                  >
                    <StarIcon /> Make default
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => setDeleting(address)}
                  aria-label={`Delete ${address.label || address.street}`}
                >
                  <Trash2Icon /> Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.mode === 'edit' ? 'Edit address' : 'Add address'}</DialogTitle>
            <DialogDescription>Orders keep their own copy of the address.</DialogDescription>
          </DialogHeader>
          {editing ? (
            <AddressForm
              key={editing.mode === 'edit' ? editing.address.id : 'new'}
              address={editing.mode === 'edit' ? editing.address : undefined}
              forceDefault={editing.mode === 'new' && addresses.length === 0}
              onCancel={() => setEditing(null)}
              onSaved={() => {
                toast.success(editing.mode === 'edit' ? 'Address updated.' : 'Address added.');
                setEditing(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this address?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? `${deleting.street}, ${deleting.city}. ` : ''}
              Existing orders are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const target = deleting;
                if (target) run(() => deleteAddressAction(target.id), 'Address deleted.');
                setDeleting(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
