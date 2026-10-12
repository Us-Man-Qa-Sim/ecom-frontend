import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Order, OrderStatus, Product } from '@/lib/api/types';
import { createGatewayMock, gatewayError, mockApiModule } from '../../../test/mock-api';

const gateway = createGatewayMock();
const updateTag = vi.fn();
const requireAdmin = vi.fn(async () => ({ userId: 'admin', role: 'ADMIN' }));

vi.mock('@/lib/api/client', () => mockApiModule(gateway));
vi.mock('@/lib/auth/session', () => ({ requireAdmin: () => requireAdmin() }));
vi.mock('next/cache', () => ({
  updateTag: (tag: string) => updateTag(tag),
  revalidatePath: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/features/orders/actions', () => ({ cancelOrderAction: vi.fn() }));

const actions = await import('./actions');
const { AdminOrderLive } = await import('./admin-order-live');
const { AdjustStockDialog, DeleteProductDialog } = await import('./product-row-actions');

const productId = 'a'.repeat(24);
const orderId = '9b2c7d10-1a2b-4c3d-8e4f-5a6b7c8d9e0f';

const product: Product = {
  id: productId,
  name: 'Blue Mug',
  description: 'A mug.',
  category: 'home',
  price: { amountMinor: 1299, currency: 'USD' },
  stock: { available: 8, reserved: 1 },
  attributes: {},
  images: [],
  isActive: true,
  createdAt: null,
  updatedAt: null,
};

function order(status: OrderStatus): Order {
  return {
    id: orderId,
    userId: 'u1',
    status,
    total: { amountMinor: 1299, currency: 'USD' },
    shippingAddress: null,
    items: [],
    createdAt: null,
    updatedAt: null,
  };
}

beforeEach(() => vi.clearAllMocks());

describe('admin product actions', () => {
  it('check the ADMIN role before calling the gateway', async () => {
    requireAdmin.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));

    await expect(actions.deleteProductAction(productId)).rejects.toThrow('NEXT_REDIRECT');
    expect(gateway.DELETE).not.toHaveBeenCalled();
  });

  it('PATCH passes on exactly the changed fields', async () => {
    gateway.PATCH.mockResolvedValue({ ...product, name: 'Green Mug' });

    await actions.updateProductAction(productId, { name: 'Green Mug' });

    expect(gateway.PATCH).toHaveBeenCalledWith('/admin/products/{id}', {
      params: { path: { id: productId } },
      body: { name: 'Green Mug' },
    });
  });

  it('refuses an empty PATCH and fields that are not part of the DTO', async () => {
    expect(await actions.updateProductAction(productId, {})).toMatchObject({
      ok: false,
      fieldErrors: { root: 'Nothing was changed.' },
    });
    expect(
      await actions.updateProductAction(productId, { stock: { available: 999 } } as never),
    ).toMatchObject({ ok: false, status: 400 });
    expect(gateway.PATCH).not.toHaveBeenCalled();
  });

  it.each([
    ['create', () => actions.createProductAction({
      name: 'Blue Mug',
      description: 'A mug.',
      category: 'home',
      price: { amountMinor: 1299, currency: 'USD' },
      initialStock: 5,
      attributes: {},
      images: [],
    })],
    ['update', () => actions.updateProductAction(productId, { isActive: false })],
    ['adjust stock', () => actions.adjustStockAction(productId, -2)],
    ['delete', () => actions.deleteProductAction(productId)],
  ])('%s refreshes the storefront caches right away (ADM-8)', async (_name, run) => {
    gateway.POST.mockResolvedValue(product);
    gateway.PATCH.mockResolvedValue(product);
    gateway.DELETE.mockResolvedValue(undefined);

    expect(await run()).toMatchObject({ ok: true });

    expect(updateTag).toHaveBeenCalledWith('products');
    expect(updateTag).toHaveBeenCalledWith(`product:${productId}`);
  });

  it('a failed mutation leaves the caches alone', async () => {
    gateway.PATCH.mockRejectedValue(gatewayError(404, 'Product not found'));

    expect(await actions.updateProductAction(productId, { name: 'X' })).toMatchObject({
      ok: false,
      status: 404,
    });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('adjust stock: rejects 0 locally and explains the 409', async () => {
    expect(await actions.adjustStockAction(productId, 0)).toMatchObject({ ok: false, status: 400 });
    expect(gateway.POST).not.toHaveBeenCalled();

    gateway.POST.mockRejectedValue(gatewayError(409, 'Insufficient stock'));
    const result = await actions.adjustStockAction(productId, -50);
    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(result.ok === false && result.message).toMatch(/cannot go below 0/);
  });
});

describe('admin order actions', () => {
  it('ship and deliver call their endpoints', async () => {
    gateway.POST.mockResolvedValue(order('SHIPPED'));

    await actions.shipOrderAction(orderId);
    await actions.deliverOrderAction(orderId);

    expect(gateway.POST.mock.calls.map((call) => call[0])).toEqual([
      '/admin/orders/{id}/ship',
      '/admin/orders/{id}/deliver',
    ]);
  });

  it('a 409 says which status is needed', async () => {
    gateway.POST.mockRejectedValue(gatewayError(409, 'Invalid transition'));
    const result = await actions.shipOrderAction(orderId);
    expect(result.ok === false && result.message).toMatch(/Only a confirmed order can be shipped/);
  });
});

describe('AdminOrderLive buttons follow the state machine', () => {
  const view = (status: OrderStatus) =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AdminOrderLive order={order(status)} />
      </QueryClientProvider>,
    );

  it.each([
    ['PENDING', { ship: false, deliver: false, cancel: true }],
    ['CONFIRMED', { ship: true, deliver: false, cancel: true }],
    ['SHIPPED', { ship: false, deliver: true, cancel: false }],
    ['DELIVERED', { ship: false, deliver: false, cancel: false }],
    ['CANCELLED', { ship: false, deliver: false, cancel: false }],
  ] as const)('%s', (status, expected) => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ order: order(status) })));
    view(status);

    const has = (name: string) => screen.queryByRole('button', { name }) !== null;
    expect({
      ship: has('Mark as shipped'),
      deliver: has('Mark as delivered'),
      cancel: has('Cancel order'),
    }).toEqual(expected);
    vi.unstubAllGlobals();
  });
});

describe('AdjustStockDialog', () => {
  it('shows the result first and blocks 0 and a negative result', async () => {
    const user = userEvent.setup();
    render(<AdjustStockDialog product={product} onClose={vi.fn()} />);
    const input = screen.getByLabelText('Change by');
    const apply = screen.getByRole('button', { name: 'Apply' });

    expect(apply).toBeDisabled();

    await user.type(input, '-3');
    expect(screen.getByTestId('stock-after')).toHaveTextContent('5');
    expect(apply).toBeEnabled();

    await user.clear(input);
    await user.type(input, '0');
    expect(apply).toBeDisabled();

    await user.clear(input);
    await user.type(input, '-9');
    expect(apply).toBeDisabled();
    expect(screen.getByText(/cannot go below 0/)).toBeInTheDocument();
  });

  it('sends the signed delta', async () => {
    gateway.POST.mockResolvedValue({ ...product, stock: { available: 18, reserved: 1 } });
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AdjustStockDialog product={product} onClose={onClose} />);

    await user.type(screen.getByLabelText('Change by'), '+10');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(gateway.POST).toHaveBeenCalledWith('/admin/products/{id}/adjust-stock', {
      params: { path: { id: productId } },
      body: { delta: 10 },
    });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('DeleteProductDialog', () => {
  it('needs the exact product name and offers deactivating instead', async () => {
    const user = userEvent.setup();
    render(<DeleteProductDialog product={product} onClose={vi.fn()} />);
    const remove = screen.getByRole('button', { name: 'Delete for good' });

    expect(screen.getByRole('button', { name: 'Deactivate instead' })).toBeInTheDocument();
    expect(remove).toBeDisabled();

    await user.type(screen.getByLabelText('Type the product name to confirm'), 'blue mug');
    expect(remove).toBeDisabled();

    await user.clear(screen.getByLabelText('Type the product name to confirm'));
    await user.type(screen.getByLabelText('Type the product name to confirm'), 'Blue Mug');
    expect(remove).toBeEnabled();
  });
});
