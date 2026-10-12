import { NextResponse, type NextRequest } from 'next/server';
import { serverEnv } from '@/env';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  authCookies,
  clearedAuthCookies,
  type CookieDescriptor,
} from '@/lib/auth/cookie-names';
import { refreshTokens } from '@/lib/auth/refresh';
import { routeAccess } from '@/lib/auth/routes';
import { loginPathWithNext, safeNextPath } from '@/lib/auth/safe-next';
import { verifyAccessToken } from '@/lib/auth/verify';
import { REQUEST_ID_HEADER } from '@/lib/request-id';

/** Refresh when the access token has less than this left (FD3). */
const REFRESH_WINDOW_SECONDS = 60;

export async function proxy(request: NextRequest) {
  const env = serverEnv();
  const requestId = crypto.randomUUID();
  const { pathname, search } = request.nextUrl;

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  let session = accessToken ? await verifyAccessToken(accessToken) : null;
  let cookiesToSet: CookieDescriptor[] = [];

  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiring = !session || session.expiresAt - nowSeconds < REFRESH_WINDOW_SECONDS;

  if (refreshToken && expiring) {
    const result = await refreshTokens(refreshToken, {
      requestId,
      clientIp: request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim(),
    });
    if (result.ok) {
      session = await verifyAccessToken(result.tokens.accessToken);
      cookiesToSet = authCookies(result.tokens, env.COOKIE_SECURE);
    } else if (result.reason === 'rejected') {
      session = null;
      cookiesToSet = clearedAuthCookies(env.COOKIE_SECURE);
    }
    // 'unavailable': keep the cookies. A still-valid access token keeps working.
  } else if (accessToken && !session && !refreshToken) {
    cookiesToSet = clearedAuthCookies(env.COOKIE_SECURE);
  }

  // The Server Components of this same request must see the new cookies (FD3).
  for (const cookie of cookiesToSet) {
    if (cookie.maxAge > 0) request.cookies.set(cookie.name, cookie.value);
    else request.cookies.delete(cookie.name);
  }
  const headers = new Headers(request.headers);
  headers.set(REQUEST_ID_HEADER, requestId);
  const cookieHeader = request.cookies.toString();
  if (cookieHeader) headers.set('cookie', cookieHeader);
  else headers.delete('cookie');

  const access = routeAccess(pathname);
  let response: NextResponse;

  if ((access === 'user' || access === 'admin') && !session) {
    response = NextResponse.redirect(
      new URL(loginPathWithNext(`${pathname}${search}`), request.url),
    );
  } else if (access === 'admin' && session?.role !== 'ADMIN') {
    response = NextResponse.redirect(new URL('/', request.url));
  } else if (access === 'guest-only' && session) {
    const next = safeNextPath(request.nextUrl.searchParams.get('next'));
    response = NextResponse.redirect(new URL(next ?? '/', request.url));
  } else {
    response = NextResponse.next({ request: { headers } });
  }

  for (const { name, value, ...options } of cookiesToSet) {
    response.cookies.set(name, value, options);
  }
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  // Everything except Next.js internals and static files.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|woff2?)$).*)',
  ],
};
