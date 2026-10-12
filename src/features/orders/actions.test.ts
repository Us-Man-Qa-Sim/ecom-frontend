// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGatewayMock, gatewayError, mockApiModule } from '../../../test/mock-api';

const gateway = createGatewayMock();
vi.mock('@/lib/api/client', () => mockApiModule(gateway));
vi.mock('@/lib/auth/session', () => ({ requireSession: vi.fn(async () => ({ userId: 'u1' })) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { cancelOrderAction, placeOrderAction } = await import('./actions');

const addressId = '3f0e8a52-7d1c-4b8e-9a52-1c2d3e4f5a6b';
const orderId = '9b2c7d10-1a2b-4c3d-8e4f-5a6b7c8d9e0f';
const productId = 'a'.repeat(24);
const input = { addressId, items: [{ productId, quantity: 2 }] };

beforeEach(() => vi.clearAllMocks());

describe('placeOrderAction', () => {
  it('sends addressId and items and returns the new order id', async () => {
    gateway.POST.mockResolvedValue({ id: orderId, status: 'PENDING' });

    const result = await placeOrderAction(input);

    expect(gateway.POST).toHaveBeenCalledWith('/orders', { body: input });
    expect(result).toEqual({ ok: true, orderId });
  });

  it('never sends client prices, even if the caller adds them', async () => {
    gateway.POST.mockResolvedValue({ id: orderId });

    await placeOrderAction({
      addressId,
      items: [{ productId, quantity: 1, unitPrice: { amountMinor: 1, currency: 'USD' } }],
    } as never);

    expect(gateway.POST.mock.calls[0]?.[1]).toEqual({
      body: { addressId, items: [{ productId, quantity: 1 }] },
    });
  });

  it('rejects bad input without calling the gateway', async () => {
    const empty = await placeOrderAction({ addressId, items: [] });
    const tooMany = await placeOrderAction({
      addressId,
      items: [{ productId, quantity: 10_001 }],
    });
    const noAddress = await placeOrderAction({ addressId: 'nope', items: input.items });

    expect(empty).toMatchObject({ ok: false, fieldErrors: { items: 'Your cart is empty' } });
    expect(tooMany).toMatchObject({ ok: false, status: 400 });
    expect(noAddress).toMatchObject({ ok: false, fieldErrors: { addressId: expect.any(String) } });
    expect(gateway.POST).not.toHaveBeenCalled();
  });

  it('409: explains the problem and says the cart was checked again', async () => {
    gateway.POST.mockRejectedValue(gatewayError(409, 'Product Blue Mug is not available'));

    const result = await placeOrderAction(input);

    expect(result).toMatchObject({ ok: false, status: 409, requestId: 'req-test' });
    expect(result.ok === false && result.message).toBe(
      'Product Blue Mug is not available. Your cart was checked again. Review it and try once more.',
    );
  });

  it('503: warns that the order may exist, so the user does not order twice', async () => {
    gateway.POST.mockRejectedValue(gatewayError(503, 'upstream connect error'));

    const result = await placeOrderAction(input);

    expect(result).toMatchObject({ ok: false, status: 503 });
    expect(result.ok === false && result.message).toMatch(/Check “Orders” before trying again/);
    expect(result.ok === false && result.message).not.toMatch(/upstream/);
  });
});

describe('cancelOrderAction', () => {
  it('sends the trimmed reason', async () => {
    gateway.POST.mockResolvedValue({ id: orderId, status: 'CANCELLED' });

    const result = await cancelOrderAction(orderId, { reason: '  Changed my mind ' });

    expect(gateway.POST).toHaveBeenCalledWith('/orders/{id}/cancel', {
      params: { path: { id: orderId } },
      body: { reason: 'Changed my mind' },
    });
    expect(result).toMatchObject({ ok: true, order: { status: 'CANCELLED' } });
  });

  it('sends no reason when it is empty', async () => {
    gateway.POST.mockResolvedValue({ id: orderId, status: 'CANCELLED' });
    await cancelOrderAction(orderId, { reason: '   ' });
    expect(gateway.POST.mock.calls[0]?.[1]).toMatchObject({ body: {} });
  });

  it('rejects a reason over 500 characters', async () => {
    const result = await cancelOrderAction(orderId, { reason: 'x'.repeat(501) });
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { reason: 'Use at most 500 characters' },
    });
    expect(gateway.POST).not.toHaveBeenCalled();
  });

  it('409: the order has already shipped or is cancelled', async () => {
    gateway.POST.mockRejectedValue(gatewayError(409, 'Cannot cancel order in status SHIPPED'));
    const result = await cancelOrderAction(orderId, { reason: '' });
    expect(result).toMatchObject({ ok: false, message: 'This order can no longer be cancelled.' });
  });
});
