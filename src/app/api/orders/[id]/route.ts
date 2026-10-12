import { getOrder, isOrderId } from '@/features/orders/data';
import { isApiError } from '@/lib/api/errors';
import { getSession } from '@/lib/auth/session';
import { getRequestId } from '@/lib/request-id';

// BFF endpoint for order-status polling (CHK-4). The browser has no token: the
// access cookie is read here on the server and sent to the gateway.
export async function GET(_request: Request, { params }: RouteContext<'/api/orders/[id]'>) {
  const { id } = await params;
  const headers = { 'cache-control': 'no-store' };

  if (!(await getSession())) {
    return Response.json({ message: 'Please log in to continue.' }, { status: 401, headers });
  }
  if (!isOrderId(id)) {
    return Response.json({ message: 'Order not found.' }, { status: 404, headers });
  }

  try {
    const order = await getOrder(id);
    if (!order) return Response.json({ message: 'Order not found.' }, { status: 404, headers });
    return Response.json({ order }, { headers });
  } catch (error) {
    if (!isApiError(error)) throw error;
    return Response.json(
      { message: error.message, requestId: error.requestId ?? (await getRequestId()) },
      { status: error.status, headers },
    );
  }
}
