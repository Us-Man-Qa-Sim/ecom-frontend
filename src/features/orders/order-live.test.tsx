import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Order, OrderStatus } from '@/lib/api/types';
import { OrderLive } from './order-live';

vi.mock('./actions', () => ({ cancelOrderAction: vi.fn() }));

function order(status: OrderStatus): Order {
  return {
    id: '9b2c7d10-1a2b-4c3d-8e4f-5a6b7c8d9e0f',
    userId: 'u1',
    status,
    total: { amountMinor: 2598, currency: 'USD' },
    shippingAddress: null,
    items: [],
    createdAt: '2026-10-13T10:00:00.000Z',
    updatedAt: '2026-10-13T10:00:00.000Z',
  };
}

const fetchMock = vi.fn<typeof fetch>();

function respondWith(status: OrderStatus) {
  fetchMock.mockImplementation(async () => Response.json({ order: order(status) }));
}

function renderLive(status: OrderStatus) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OrderLive order={order(status)} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('OrderLive', () => {
  it.each([
    ['PENDING', true],
    ['CONFIRMED', true],
    ['SHIPPED', false],
    ['DELIVERED', false],
    ['CANCELLED', false],
  ] as const)('%s: cancel button shown = %s', (status, shown) => {
    respondWith(status);
    renderLive(status);

    const button = screen.queryByRole('button', { name: 'Cancel order' });
    expect(button !== null).toBe(shown);
  });

  it('does not poll an order that is not PENDING', async () => {
    renderLive('CONFIRMED');
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('polls a PENDING order every second, then stops when it is confirmed', async () => {
    respondWith('PENDING');
    renderLive('PENDING');
    expect(screen.getByTestId('order-status')).toHaveTextContent('Processing');

    await act(() => vi.advanceTimersByTimeAsync(3100));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/orders/9b2c7d10-1a2b-4c3d-8e4f-5a6b7c8d9e0f',
      expect.objectContaining({ cache: 'no-store' }),
    );

    respondWith('CONFIRMED');
    await act(() => vi.advanceTimersByTimeAsync(1100));
    expect(screen.getByTestId('order-status')).toHaveTextContent('Confirmed');

    const callsWhenConfirmed = fetchMock.mock.calls.length;
    await act(() => vi.advanceTimersByTimeAsync(20_000));
    expect(fetchMock).toHaveBeenCalledTimes(callsWhenConfirmed);
  });

  it('slows down after 5 seconds and gives up after 60 with a message', async () => {
    respondWith('PENDING');
    renderLive('PENDING');

    await act(() => vi.advanceTimersByTimeAsync(5050));
    const afterFastWindow = fetchMock.mock.calls.length;
    expect(afterFastWindow).toBeGreaterThanOrEqual(4);
    expect(afterFastWindow).toBeLessThanOrEqual(5);

    // 9 more seconds at one call per 3 s.
    await act(() => vi.advanceTimersByTimeAsync(9000));
    expect(fetchMock.mock.calls.length - afterFastWindow).toBe(3);

    await act(() => vi.advanceTimersByTimeAsync(50_000));
    expect(screen.getByTestId('still-processing')).toHaveTextContent('we will email you');
    const callsAtTimeout = fetchMock.mock.calls.length;

    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(fetchMock).toHaveBeenCalledTimes(callsAtTimeout);
    // The order can still be cancelled while it is PENDING.
    expect(screen.getByRole('button', { name: 'Cancel order' })).toBeInTheDocument();
  });

  it('explains a cancelled order and links back to the cart', () => {
    renderLive('CANCELLED');
    expect(screen.getByText(/This order was cancelled/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to your cart' })).toHaveAttribute(
      'href',
      '/cart',
    );
  });
});
