import { headers } from 'next/headers';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * The id proxy.ts gave this request. It is forwarded to the gateway, which
 * passes it on to gRPC and Kafka, so one id follows a click to the email.
 */
export async function getRequestId(): Promise<string> {
  return (await headers()).get(REQUEST_ID_HEADER) ?? crypto.randomUUID();
}
