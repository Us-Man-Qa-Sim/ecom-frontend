import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ListSkeleton } from '@/components/page-skeleton';
import { AddressBook } from '@/features/account/address-book';
import { listAddresses } from '@/features/account/data';
import { requireSession } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Addresses' };

export default function AddressesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Addresses</h1>
      <Suspense fallback={<ListSkeleton rows={2} label="Loading addresses" />}>
        <Addresses />
      </Suspense>
    </div>
  );
}

async function Addresses() {
  await requireSession('/account/addresses');
  return <AddressBook addresses={await listAddresses()} />;
}
