import { connection } from 'next/server';
import { publicEnv } from '@/env';
import { lastGatewayCall } from '@/lib/api/debug';

// Feeds the debug footer (API-6). Off unless NEXT_PUBLIC_SHOW_DEBUG=true.
export async function GET() {
  await connection();
  if (!publicEnv.NEXT_PUBLIC_SHOW_DEBUG) return new Response(null, { status: 404 });
  return Response.json({ last: lastGatewayCall() }, { headers: { 'cache-control': 'no-store' } });
}
