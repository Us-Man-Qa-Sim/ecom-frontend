// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGatewayMock, gatewayError, mockApiModule } from '../../../test/mock-api';
import { addressSchema, type AddressInput } from './schemas';

const gateway = createGatewayMock();
vi.mock('@/lib/api/client', () => mockApiModule(gateway));
vi.mock('@/lib/auth/session', () => ({ requireSession: vi.fn(async () => ({ userId: 'u1' })) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { createAddressAction, deleteAddressAction, updateAddressAction } = await import('./actions');

const valid: AddressInput = {
  label: 'Home',
  street: '221B Baker Street',
  city: 'London',
  state: '',
  postalCode: 'NW1 6XE',
  country: 'GB',
  isDefault: true,
};
const addressId = '3f0e8a52-7d1c-4b8e-9a52-1c2d3e4f5a6b';

beforeEach(() => vi.clearAllMocks());

describe('addressSchema matches the gateway DTO', () => {
  it('accepts a normal address', () => {
    expect(addressSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ['street', 200],
    ['city', 100],
    ['postalCode', 20],
    ['label', 50],
    ['state', 100],
  ] as const)('%s allows %i characters and not one more', (field, max) => {
    expect(addressSchema.safeParse({ ...valid, [field]: 'x'.repeat(max) }).success).toBe(true);
    expect(addressSchema.safeParse({ ...valid, [field]: 'x'.repeat(max + 1) }).success).toBe(false);
  });

  it.each(['street', 'city', 'postalCode'] as const)('%s is required', (field) => {
    expect(addressSchema.safeParse({ ...valid, [field]: '   ' }).success).toBe(false);
  });

  it('label and state are optional', () => {
    expect(addressSchema.safeParse({ ...valid, label: '', state: '' }).success).toBe(true);
  });

  it('country must be an uppercase ISO 3166-1 alpha-2 code', () => {
    for (const country of ['gb', 'GBR', 'XX', '', 'United Kingdom']) {
      expect(addressSchema.safeParse({ ...valid, country }).success, country).toBe(false);
    }
    expect(addressSchema.safeParse({ ...valid, country: 'US' }).success).toBe(true);
  });

  it('trims text', () => {
    expect(addressSchema.parse({ ...valid, city: '  London ' }).city).toBe('London');
  });
});

describe('address actions', () => {
  it('create leaves out empty optional fields', async () => {
    gateway.POST.mockResolvedValue({ id: addressId, ...valid });

    const result = await createAddressAction({ ...valid, label: '' });

    expect(gateway.POST).toHaveBeenCalledWith('/users/me/addresses', {
      body: {
        street: valid.street,
        city: valid.city,
        postalCode: valid.postalCode,
        country: 'GB',
        isDefault: true,
      },
    });
    expect(result).toMatchObject({ ok: true, address: { id: addressId } });
  });

  it('create re-checks the input on the server', async () => {
    const result = await createAddressAction({ ...valid, country: 'gb', street: '' });

    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { street: 'Enter a street address', country: 'Choose a country' },
    });
    expect(gateway.POST).not.toHaveBeenCalled();
  });

  it('create passes gateway field errors through', async () => {
    gateway.POST.mockRejectedValue(
      gatewayError(400, 'postalCode: invalid', [
        { field: 'postalCode', errors: ['postalCode is invalid'] },
      ]),
    );
    const result = await createAddressAction(valid);
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { postalCode: 'postalCode is invalid' },
    });
  });

  it("update of another user's address reports not found (the gateway answers 404)", async () => {
    gateway.PATCH.mockRejectedValue(gatewayError(404, 'Address not found'));

    const result = await updateAddressAction(addressId, valid);

    expect(result).toMatchObject({ ok: false, status: 404, message: 'Address not found' });
  });

  it('an id that is not a UUID never reaches the gateway', async () => {
    expect(await updateAddressAction('../admin', valid)).toMatchObject({ ok: false });
    expect(await deleteAddressAction("1' OR '1'='1")).toMatchObject({ ok: false });
    expect(gateway.PATCH).not.toHaveBeenCalled();
    expect(gateway.DELETE).not.toHaveBeenCalled();
  });

  it('delete treats "already gone" as done', async () => {
    gateway.DELETE.mockRejectedValue(gatewayError(404, 'Address not found'));
    expect(await deleteAddressAction(addressId)).toEqual({ ok: true });
  });
});
