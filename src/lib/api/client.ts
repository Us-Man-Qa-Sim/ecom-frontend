import 'server-only';
import { cookies, headers } from 'next/headers';
import createClient, { type Client, type Middleware } from 'openapi-fetch';
import { serverEnv } from '@/env';
import { ACCESS_COOKIE } from '@/lib/auth/cookie-names';
import { REQUEST_ID_HEADER } from '@/lib/request-id';
import { recordGatewayCall } from './debug';
import { toApiError, toNetworkError } from './errors';
import type { paths } from './schema';

export type ApiClient = Client<paths>;

type ClientContext = {
  requestId: string;
  accessToken?: string;
  clientIp?: string;
};

function build({ requestId, accessToken, clientIp }: ClientContext): ApiClient {
  const env = serverEnv();

  const client = createClient<paths>({
    baseUrl: env.API_INTERNAL_URL,
    // Every call has a timeout and is uncached unless the caller wraps it in `use cache`.
    fetch: (request) =>
      fetch(request, { signal: AbortSignal.timeout(env.API_TIMEOUT_MS), cache: 'no-store' }).catch(
        (error: unknown) => {
          throw toNetworkError(error, requestId);
        },
      ),
  });

  const middleware: Middleware = {
    onRequest({ request }) {
      request.headers.set(REQUEST_ID_HEADER, requestId);
      if (accessToken) request.headers.set('authorization', `Bearer ${accessToken}`);
      // GAP-2: the gateway rate-limits per client IP once it trusts this hop.
      if (clientIp) request.headers.set('x-forwarded-for', clientIp);
      return request;
    },
    onResponse({ request, response }) {
      recordGatewayCall({
        requestId: response.headers.get(REQUEST_ID_HEADER) ?? requestId,
        gatewayInstance: response.headers.get('x-gateway-instance'),
        path: `${request.method} ${new URL(request.url).pathname}`,
        status: response.status,
        at: new Date().toISOString(),
      });
      return response;
    },
  };
  client.use(middleware);

  return client;
}

/** The client address as Next.js saw it (first hop only, never the browser's own header chain). */
function clientIpFrom(forwardedFor: string | null): string | undefined {
  return forwardedFor?.split(',').at(-1)?.trim() || undefined;
}

/**
 * Per-request client. Adds the access token from the cookie, the request id
 * and the client IP. Reads cookies and headers, so it cannot be used inside
 * `use cache`.
 */
export async function api(): Promise<ApiClient> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return build({
    requestId: headerStore.get(REQUEST_ID_HEADER) ?? crypto.randomUUID(),
    accessToken: cookieStore.get(ACCESS_COOKIE)?.value,
    clientIp: clientIpFrom(headerStore.get('x-forwarded-for')),
  });
}

/** Anonymous client for public catalog reads. Safe inside `use cache`. */
export function publicApi(): ApiClient {
  return build({ requestId: crypto.randomUUID() });
}

type FetchResult<T> = { data?: T; error?: unknown; response: Response };

/** Returns the body of a 2xx response, or throws an ApiError. */
export async function unwrap<T>(call: Promise<FetchResult<T>>): Promise<T> {
  const { data, error, response } = await call;
  if (response.ok) return data as T;
  throw toApiError(response.status, error, response.headers.get(REQUEST_ID_HEADER) ?? undefined);
}
