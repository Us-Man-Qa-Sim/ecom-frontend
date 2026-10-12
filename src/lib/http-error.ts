/** Error for browser calls to this app's own `/api/*` route handlers. */
export class HttpError extends Error {
  readonly status: number;
  readonly requestId: string | undefined;

  constructor(status: number, message: string, requestId?: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.requestId = requestId;
  }
}

/** `fetch` for `/api/*` that throws HttpError on a non-2xx answer. */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
      requestId?: string;
    } | null;
    throw new HttpError(
      response.status,
      body?.message ?? 'Something went wrong. Please try again.',
      body?.requestId,
    );
  }
  return (await response.json()) as T;
}
