import { vi } from 'vitest';
import { toApiError } from '@/lib/api/errors';

/**
 * Stand-in for `@/lib/api/client` in Server Action tests. Each HTTP method is
 * a mock that returns the response body or throws the ApiError the real
 * client would build from a gateway error.
 *
 *   vi.mock('@/lib/api/client', () => mockApiModule(gateway));
 */
export function createGatewayMock() {
  return {
    GET: vi.fn(),
    POST: vi.fn(),
    PATCH: vi.fn(),
    DELETE: vi.fn(),
  };
}

export type GatewayMock = ReturnType<typeof createGatewayMock>;

export function mockApiModule(gateway: GatewayMock) {
  return {
    api: async () => gateway,
    publicApi: () => gateway,
    unwrap: async <T>(call: Promise<T> | T) => call,
  };
}

/** What a failed gateway call looks like after `unwrap`. */
export function gatewayError(status: number, message: string, errors?: unknown) {
  return toApiError(status, { statusCode: status, message, errors }, 'req-test');
}
