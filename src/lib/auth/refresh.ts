import { createHash } from 'node:crypto';
import { serverEnv } from '@/env';
import type { TokenPair } from './cookie-names';

// Token refresh with single-flight per refresh token (FD3). No `server-only`:
// proxy.ts calls this.
//
// user-service rotates refresh tokens and treats a second use of the same
// token as theft: it revokes the whole family and the user is logged out
// (GAP-8). A browser often sends several requests at once with the same old
// cookie, so every caller holding one refresh token must share one gateway
// call and get the same new pair. The result is kept for a short time for
// requests that were already on their way when the first one finished.
//
// The map lives in this process, so this only works with ONE Next.js instance.

export type RefreshResult =
  | { ok: true; tokens: TokenPair }
  /** The gateway refused the token (expired, revoked, reused). Log the user out. */
  | { ok: false; reason: 'rejected' }
  /** The gateway did not answer. Keep the cookies and try again later. */
  | { ok: false; reason: 'unavailable' };

const RESULT_TTL_MS = 15_000;

type Store = Map<string, Promise<RefreshResult>>;
const globalStore = globalThis as typeof globalThis & { __ecomRefreshFlights?: Store };
const flights: Store = (globalStore.__ecomRefreshFlights ??= new Map());

type RefreshContext = { requestId: string; clientIp?: string };

async function callGateway(refreshToken: string, context: RefreshContext): Promise<RefreshResult> {
  const env = serverEnv();
  try {
    const response = await fetch(`${env.API_INTERNAL_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-request-id': context.requestId,
        ...(context.clientIp ? { 'x-forwarded-for': context.clientIp } : {}),
      },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(env.API_TIMEOUT_MS),
      cache: 'no-store',
    });

    if (response.ok) {
      const body = (await response.json()) as { tokens?: TokenPair };
      if (body.tokens?.accessToken && body.tokens.refreshToken) {
        return { ok: true, tokens: body.tokens };
      }
      return { ok: false, reason: 'unavailable' };
    }
    // 400/401 mean the token itself is bad. 429 and 5xx say nothing about the token.
    return {
      ok: false,
      reason: response.status === 400 || response.status === 401 ? 'rejected' : 'unavailable',
    };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

export function refreshTokens(
  refreshToken: string,
  context: RefreshContext,
  call: typeof callGateway = callGateway,
): Promise<RefreshResult> {
  const key = createHash('sha256').update(refreshToken).digest('hex');

  const existing = flights.get(key);
  if (existing) return existing;

  const flight = call(refreshToken, context).then((result) => {
    if (!result.ok && result.reason === 'unavailable') {
      // Nothing was rotated, so the next request may try again at once.
      flights.delete(key);
    } else {
      setTimeout(() => flights.delete(key), RESULT_TTL_MS).unref?.();
    }
    return result;
  });

  flights.set(key, flight);
  return flight;
}

/** Test helper. */
export function resetRefreshFlights() {
  flights.clear();
}
