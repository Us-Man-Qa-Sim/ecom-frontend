import 'server-only';

// Last gateway call seen by this Next.js process (API-6). Process-wide and
// only read by the debug footer, so it is "about right", not per user.

export type GatewayDebugInfo = {
  requestId: string | null;
  gatewayInstance: string | null;
  path: string;
  status: number;
  at: string;
};

// On `globalThis`: `use cache` functions and route handlers do not share module state.
const store = globalThis as typeof globalThis & { __ecomLastGatewayCall?: GatewayDebugInfo };

export function recordGatewayCall(info: GatewayDebugInfo) {
  store.__ecomLastGatewayCall = info;
}

export function lastGatewayCall(): GatewayDebugInfo | null {
  return store.__ecomLastGatewayCall ?? null;
}
