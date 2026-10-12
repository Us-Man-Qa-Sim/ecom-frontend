// Container healthcheck (OPS-1). No gateway call: it only says Next.js is up.
export function GET() {
  return Response.json({ status: 'ok' });
}
