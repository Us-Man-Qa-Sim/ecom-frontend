// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/auth/cookie-names';
import type { RefreshResult } from '@/lib/auth/refresh';
import type { Session } from '@/lib/auth/verify';

const farFuture = () => Math.floor(Date.now() / 1000) + 600;
const sessions: Record<string, () => Session> = {
  'customer-token': () => ({
    userId: 'u1',
    email: 'c@x.io',
    role: 'CUSTOMER',
    expiresAt: farFuture(),
  }),
  'admin-token': () => ({ userId: 'u2', email: 'a@x.io', role: 'ADMIN', expiresAt: farFuture() }),
  'expiring-token': () => ({
    userId: 'u1',
    email: 'c@x.io',
    role: 'CUSTOMER',
    expiresAt: Math.floor(Date.now() / 1000) + 10,
  }),
};

const refreshTokens = vi.fn<(token: string) => Promise<RefreshResult>>();

vi.mock('@/lib/auth/verify', () => ({
  verifyAccessToken: async (token: string) => sessions[token]?.() ?? null,
}));
vi.mock('@/lib/auth/refresh', () => ({
  refreshTokens: (token: string) => refreshTokens(token),
}));

const { proxy } = await import('./proxy');

function request(path: string, cookies: Record<string, string> = {}) {
  const cookie = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
  return new NextRequest(`http://localhost:3001${path}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

const location = (response: Response) => {
  const header = response.headers.get('location');
  return header ? new URL(header).pathname + new URL(header).search : null;
};

beforeEach(() => refreshTokens.mockReset());

describe('proxy route protection', () => {
  const guest = {};
  const customer = { [ACCESS_COOKIE]: 'customer-token' };
  const admin = { [ACCESS_COOKIE]: 'admin-token' };

  it.each([
    // [who, cookies, path, expected redirect (null = allowed)]
    ['guest', guest, '/', null],
    ['guest', guest, '/products', null],
    ['guest', guest, '/cart', null],
    ['guest', guest, '/login', null],
    ['guest', guest, '/checkout', '/login?next=%2Fcheckout'],
    ['guest', guest, '/orders/42', '/login?next=%2Forders%2F42'],
    ['guest', guest, '/account/addresses', '/login?next=%2Faccount%2Faddresses'],
    ['guest', guest, '/admin', '/login?next=%2Fadmin'],
    ['guest', guest, '/admin/products?page=2', '/login?next=%2Fadmin%2Fproducts%3Fpage%3D2'],
    ['customer', customer, '/', null],
    ['customer', customer, '/checkout', null],
    ['customer', customer, '/orders', null],
    ['customer', customer, '/account', null],
    ['customer', customer, '/admin', '/'],
    ['customer', customer, '/admin/orders/1', '/'],
    ['customer', customer, '/login', '/'],
    ['customer', customer, '/register', '/'],
    ['admin', admin, '/admin', null],
    ['admin', admin, '/admin/products/new', null],
    ['admin', admin, '/checkout', null],
    ['admin', admin, '/login', '/'],
  ])('%s on %s%s', async (_who, cookies, path, expected) => {
    const response = await proxy(request(path, cookies));
    if (expected === null) {
      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    } else {
      expect(response.status).toBe(307);
      expect(location(response)).toBe(expected);
    }
  });

  it('does not treat /adminx or /ordersomething as protected', async () => {
    expect((await proxy(request('/adminx'))).status).toBe(200);
    expect((await proxy(request('/ordersomething'))).status).toBe(200);
  });

  it('sends a logged-in user from /login to a safe ?next= only', async () => {
    const safe = await proxy(request('/login?next=%2Fcheckout', customer));
    expect(location(safe)).toBe('/checkout');

    const unsafe = await proxy(request('/login?next=https%3A%2F%2Fevil.example', customer));
    expect(location(unsafe)).toBe('/');
  });

  it('sets a fresh x-request-id on every response', async () => {
    const first = (await proxy(request('/'))).headers.get('x-request-id');
    const second = (await proxy(request('/'))).headers.get('x-request-id');
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(second).not.toBe(first);
  });
});

describe('proxy token refresh', () => {
  const newPair = {
    accessToken: 'customer-token',
    refreshToken: 'new-refresh',
    accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
  };

  it('does not refresh while the access token is fresh', async () => {
    await proxy(request('/orders', { [ACCESS_COOKIE]: 'customer-token', [REFRESH_COOKIE]: 'r' }));
    expect(refreshTokens).not.toHaveBeenCalled();
  });

  it('refreshes when the access cookie is gone, sets both cookies and lets the request through', async () => {
    refreshTokens.mockResolvedValue({ ok: true, tokens: newPair });

    const response = await proxy(request('/orders', { [REFRESH_COOKIE]: 'old-refresh' }));

    expect(refreshTokens).toHaveBeenCalledWith('old-refresh');
    expect(response.status).toBe(200);
    expect(response.cookies.get(ACCESS_COOKIE)).toMatchObject({
      value: 'customer-token',
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    expect(response.cookies.get(REFRESH_COOKIE)?.value).toBe('new-refresh');
    // The Server Components of the same request get the new cookies.
    expect(response.headers.get('x-middleware-request-cookie')).toContain(
      `${ACCESS_COOKIE}=customer-token`,
    );
  });

  it('refreshes when the access token is about to expire', async () => {
    refreshTokens.mockResolvedValue({ ok: true, tokens: newPair });
    await proxy(request('/', { [ACCESS_COOKIE]: 'expiring-token', [REFRESH_COOKIE]: 'old' }));
    expect(refreshTokens).toHaveBeenCalledTimes(1);
  });

  it('clears the cookies and redirects to login when the refresh token is rejected', async () => {
    refreshTokens.mockResolvedValue({ ok: false, reason: 'rejected' });

    const response = await proxy(request('/orders', { [REFRESH_COOKIE]: 'revoked' }));

    expect(location(response)).toBe('/login?next=%2Forders');
    expect(response.cookies.get(ACCESS_COOKIE)).toMatchObject({ value: '', maxAge: 0 });
    expect(response.cookies.get(REFRESH_COOKIE)).toMatchObject({ value: '', maxAge: 0 });
  });

  it('keeps a still-valid session when the gateway is unavailable', async () => {
    refreshTokens.mockResolvedValue({ ok: false, reason: 'unavailable' });

    const response = await proxy(
      request('/orders', { [ACCESS_COOKIE]: 'expiring-token', [REFRESH_COOKIE]: 'old' }),
    );

    expect(response.status).toBe(200);
    expect(response.cookies.get(REFRESH_COOKIE)).toBeUndefined();
  });

  it('clears a bad access cookie when there is no refresh token', async () => {
    const response = await proxy(request('/', { [ACCESS_COOKIE]: 'garbage' }));
    expect(response.status).toBe(200);
    expect(response.cookies.get(ACCESS_COOKIE)).toMatchObject({ value: '', maxAge: 0 });
  });
});
