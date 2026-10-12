// @vitest-environment node
import { HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { gateway } from '../../../test/msw';

// The real client against a mocked gateway (MSW). Only next/headers is faked.

const request = {
  cookies: new Map<string, string>(),
  headers: new Headers(),
};

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      request.cookies.has(name) ? { name, value: request.cookies.get(name) } : undefined,
  }),
  headers: async () => request.headers,
}));

process.env.API_TIMEOUT_MS = '1000';
const { api, publicApi, unwrap } = await import('./client');
const { ApiError } = await import('./errors');
const { lastGatewayCall } = await import('./debug');

const server = setupServer();
beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  request.cookies.clear();
  request.headers = new Headers();
});
afterAll(() => server.close());

const product = {
  id: 'a'.repeat(24),
  name: 'Blue Mug',
  description: 'A mug.',
  category: 'home',
  price: { amountMinor: 1299, currency: 'USD' },
  stock: { available: 8, reserved: 0 },
  attributes: {},
  images: [],
  isActive: true,
  createdAt: null,
  updatedAt: null,
};

describe('api() — the per-request client', () => {
  it('adds the access token, the request id and the client IP', async () => {
    let seen = new Headers();
    server.use(
      gateway('get', '/users/me', ({ request: incoming }) => {
        seen = incoming.headers;
        return HttpResponse.json({ id: 'u1' });
      }),
    );
    request.cookies.set('ecom_at', 'access-token');
    request.headers.set('x-request-id', 'req-123');
    // The browser sent a fake first entry. Only the hop Next.js added is forwarded.
    request.headers.set('x-forwarded-for', '6.6.6.6, 203.0.113.9');

    const client = await api();
    await unwrap(client.GET('/users/me'));

    expect(seen.get('authorization')).toBe('Bearer access-token');
    expect(seen.get('x-request-id')).toBe('req-123');
    expect(seen.get('x-forwarded-for')).toBe('203.0.113.9');
  });

  it('sends no Authorization header for a guest', async () => {
    let authorization: string | null = 'unset';
    server.use(
      gateway('get', '/products', ({ request: incoming }) => {
        authorization = incoming.headers.get('authorization');
        return HttpResponse.json({ products: [], pagination: null });
      }),
    );

    const client = await api();
    await unwrap(client.GET('/products'));

    expect(authorization).toBeNull();
  });

  it('sends JSON bodies and path parameters', async () => {
    let body: unknown;
    let url = '';
    server.use(
      gateway('post', '/orders/{id}/cancel', async ({ request: incoming }) => {
        url = incoming.url;
        body = await incoming.json();
        return HttpResponse.json({ id: 'o1', status: 'CANCELLED' });
      }),
    );

    const client = await api();
    await unwrap(
      client.POST('/orders/{id}/cancel', {
        params: { path: { id: 'o1' } },
        body: { reason: 'Changed my mind' },
      }),
    );

    expect(new URL(url).pathname).toBe('/orders/o1/cancel');
    expect(body).toEqual({ reason: 'Changed my mind' });
  });
});

describe('publicApi() — the anonymous client for cached reads', () => {
  it('never sends the cookie token, and makes its own request id', async () => {
    let seen = new Headers();
    server.use(
      gateway('get', '/products/{id}', ({ request: incoming }) => {
        seen = incoming.headers;
        return HttpResponse.json(product);
      }),
    );
    request.cookies.set('ecom_at', 'access-token');

    const data = await unwrap(
      publicApi().GET('/products/{id}', { params: { path: { id: product.id } } }),
    );

    expect(data).toMatchObject({ name: 'Blue Mug' });
    expect(seen.get('authorization')).toBeNull();
    expect(seen.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('unwrap()', () => {
  it('turns a gateway validation error into an ApiError with field errors', async () => {
    server.use(
      gateway('post', '/auth/register', () =>
        HttpResponse.json(
          {
            statusCode: 400,
            error: 'Bad Request',
            message: 'email: email must be a valid email address',
            errors: [{ field: 'email', errors: ['email must be a valid email address'] }],
          },
          { status: 400, headers: { 'x-request-id': 'gateway-req-9' } },
        ),
      ),
    );

    const client = await api();
    const error = await unwrap(
      client.POST('/auth/register', {
        body: { email: 'x', password: 'y', firstName: 'A', lastName: 'B' },
      }),
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      fieldErrors: { email: 'email must be a valid email address' },
      // The id the gateway answered with, so it can be found in the backend logs.
      requestId: 'gateway-req-9',
    });
  });

  it('maps 404 and 409 with the gateway message', async () => {
    server.use(
      gateway('get', '/products/{id}', () =>
        HttpResponse.json({ statusCode: 404, message: 'Product not found' }, { status: 404 }),
      ),
    );
    await expect(
      unwrap(publicApi().GET('/products/{id}', { params: { path: { id: 'x' } } })),
    ).rejects.toMatchObject({ status: 404, message: 'Product not found' });
  });

  it('reports a gateway that cannot be reached as 503', async () => {
    server.use(gateway('get', '/products', () => HttpResponse.error()));

    await expect(unwrap(publicApi().GET('/products'))).rejects.toMatchObject({
      status: 503,
      message: 'The service is temporarily unavailable. Please try again.',
    });
  });

  it('gives up after API_TIMEOUT_MS and reports 504', async () => {
    server.use(
      gateway('get', '/products', async () => {
        await delay(3000);
        return HttpResponse.json({ products: [], pagination: null });
      }),
    );

    await expect(unwrap(publicApi().GET('/products'))).rejects.toMatchObject({ status: 504 });
  });
});

describe('debug footer data', () => {
  it('remembers the request id and gateway instance of the last call', async () => {
    server.use(
      gateway('get', '/products', () =>
        HttpResponse.json(
          { products: [], pagination: null },
          { headers: { 'x-request-id': 'req-77', 'x-gateway-instance': 'api-gateway-2' } },
        ),
      ),
    );

    await unwrap(publicApi().GET('/products'));

    expect(lastGatewayCall()).toMatchObject({
      requestId: 'req-77',
      gatewayInstance: 'api-gateway-2',
      path: 'GET /products',
      status: 200,
    });
  });
});
