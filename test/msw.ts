import { http, type HttpResponseResolver } from 'msw';
import type { paths } from '@/lib/api/schema';

// MSW handlers for the gateway, typed from the generated OpenAPI types (TST-1):
// a handler for a path or method the gateway does not have is a type error.

export const GATEWAY_URL = 'http://localhost:3000';

type Method = 'get' | 'post' | 'patch' | 'delete';
type PathsWith<M extends Method> = {
  [P in keyof paths]: paths[P] extends Record<M, object> ? P : never;
}[keyof paths];

/** `gateway('get', '/products/{id}', …)` → MSW handler for `GET /products/:id`. */
export function gateway<M extends Method>(
  method: M,
  path: PathsWith<M>,
  resolver: HttpResponseResolver,
) {
  const mswPath = String(path).replace(/\{(\w+)\}/g, ':$1');
  return http[method](`${GATEWAY_URL}${mswPath}`, resolver);
}
