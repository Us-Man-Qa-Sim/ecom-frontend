'use server';

import { revalidatePath } from 'next/cache';
import { api, unwrap } from '@/lib/api/client';
import { isApiError, toActionError, validationError, type ActionResult } from '@/lib/api/errors';
import type { Address } from '@/lib/api/types';
import { requireSession } from '@/lib/auth/session';
import { zodFieldErrors } from '@/lib/zod-errors';
import { addressSchema, type AddressInput } from './schemas';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function revalidateAddresses() {
  revalidatePath('/account/addresses');
  revalidatePath('/checkout');
}

/** Empty optional fields are left out on create. */
function toCreateBody(input: AddressInput) {
  return {
    street: input.street,
    city: input.city,
    postalCode: input.postalCode,
    country: input.country,
    isDefault: input.isDefault,
    ...(input.label ? { label: input.label } : {}),
    ...(input.state ? { state: input.state } : {}),
  };
}

export async function createAddressAction(
  input: AddressInput,
): Promise<ActionResult<{ address: Address }>> {
  await requireSession('/account/addresses');
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return validationError(zodFieldErrors(parsed.error));

  try {
    const client = await api();
    const address = (await unwrap(
      client.POST('/users/me/addresses', { body: toCreateBody(parsed.data) }),
    )) as Address;
    revalidateAddresses();
    return { ok: true, address };
  } catch (error) {
    if (!isApiError(error)) throw error;
    return toActionError(error);
  }
}

export async function updateAddressAction(
  id: string,
  input: AddressInput,
): Promise<ActionResult<{ address: Address }>> {
  await requireSession('/account/addresses');
  if (!UUID.test(id)) return validationError({ root: 'Unknown address.' });
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return validationError(zodFieldErrors(parsed.error));

  try {
    const client = await api();
    const address = (await unwrap(
      client.PATCH('/users/me/addresses/{id}', {
        params: { path: { id } },
        body: toCreateBody(parsed.data),
      }),
    )) as Address;
    revalidateAddresses();
    return { ok: true, address };
  } catch (error) {
    if (!isApiError(error)) throw error;
    return toActionError(error);
  }
}

export async function setDefaultAddressAction(id: string): Promise<ActionResult> {
  await requireSession('/account/addresses');
  if (!UUID.test(id)) return validationError({ root: 'Unknown address.' });

  try {
    const client = await api();
    await unwrap(
      client.PATCH('/users/me/addresses/{id}', {
        params: { path: { id } },
        body: { isDefault: true },
      }),
    );
    revalidateAddresses();
    return { ok: true };
  } catch (error) {
    if (!isApiError(error)) throw error;
    return toActionError(error);
  }
}

export async function deleteAddressAction(id: string): Promise<ActionResult> {
  await requireSession('/account/addresses');
  if (!UUID.test(id)) return validationError({ root: 'Unknown address.' });

  try {
    const client = await api();
    await unwrap(client.DELETE('/users/me/addresses/{id}', { params: { path: { id } } }));
    revalidateAddresses();
    return { ok: true };
  } catch (error) {
    if (!isApiError(error)) throw error;
    // Already gone: the list just needs a refresh.
    if (error.status === 404) {
      revalidateAddresses();
      return { ok: true };
    }
    return toActionError(error);
  }
}
