import 'server-only';
import { api, unwrap } from '@/lib/api/client';
import type { Address } from '@/lib/api/types';

// Per-user data: never cached (FD7).

export async function listAddresses(): Promise<Address[]> {
  const client = await api();
  const { addresses } = await unwrap(client.GET('/users/me/addresses'));
  // Default first, then newest.
  return (addresses as Address[]).toSorted(
    (a, b) =>
      Number(b.isDefault) - Number(a.isDefault) ||
      (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
  );
}
