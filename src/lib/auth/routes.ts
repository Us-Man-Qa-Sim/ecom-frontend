// Which paths need a session (FD4). Used by proxy.ts.

const PROTECTED_PREFIXES = ['/checkout', '/orders', '/account'];
const ADMIN_PREFIX = '/admin';
const GUEST_ONLY = ['/login', '/register'];

const matches = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export type RouteAccess = 'public' | 'guest-only' | 'user' | 'admin';

export function routeAccess(pathname: string): RouteAccess {
  if (matches(pathname, ADMIN_PREFIX)) return 'admin';
  if (PROTECTED_PREFIXES.some((prefix) => matches(pathname, prefix))) return 'user';
  if (GUEST_ONLY.includes(pathname)) return 'guest-only';
  return 'public';
}
