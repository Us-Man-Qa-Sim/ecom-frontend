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

let last: GatewayDebugInfo | null = null;

export function recordGatewayCall(info: GatewayDebugInfo) {
  last = info;
}

export function lastGatewayCall(): GatewayDebugInfo | null {
  return last;
}
