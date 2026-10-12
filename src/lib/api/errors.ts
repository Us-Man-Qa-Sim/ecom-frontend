// The one error type for gateway calls (API-4). No `server-only`: client code
// uses the `ActionError` shape and the type guards.

export type FieldErrors = Record<string, string>;

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: FieldErrors;
  readonly requestId: string | undefined;
  /** Next.js keeps a thrown error's `digest`, so error pages can show the request id. */
  readonly digest: string | undefined;

  constructor(init: {
    status: number;
    message: string;
    fieldErrors?: FieldErrors;
    requestId?: string;
    cause?: unknown;
  }) {
    super(init.message, { cause: init.cause });
    this.name = 'ApiError';
    this.status = init.status;
    this.fieldErrors = init.fieldErrors ?? {};
    this.requestId = init.requestId;
    this.digest = init.requestId;
  }
}

type GatewayErrorBody = {
  statusCode?: unknown;
  message?: unknown;
  errors?: unknown;
};

function toFieldErrors(errors: unknown): FieldErrors {
  if (!Array.isArray(errors)) return {};
  const result: FieldErrors = {};
  for (const entry of errors) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { field, errors: messages } = entry as { field?: unknown; errors?: unknown };
    if (typeof field !== 'string' || !Array.isArray(messages)) continue;
    const first = messages.find((message): message is string => typeof message === 'string');
    if (first) result[field] = first;
  }
  return result;
}

const FALLBACK_MESSAGES: Record<number, string> = {
  401: 'Please log in to continue.',
  403: 'You are not allowed to do that.',
  404: 'Not found.',
  429: 'Too many requests. Please wait a minute and try again.',
  502: 'The service is temporarily unavailable. Please try again.',
  503: 'The service is temporarily unavailable. Please try again.',
  504: 'The service took too long to answer. Please try again.',
};

/** Builds an ApiError from the gateway's `{ statusCode, message, errors[] }` body. */
export function toApiError(status: number, body: unknown, requestId?: string): ApiError {
  const parsed: GatewayErrorBody = typeof body === 'object' && body !== null ? body : {};
  const fieldErrors = toFieldErrors(parsed.errors);
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  let message = FALLBACK_MESSAGES[status] ?? 'Something went wrong. Please try again.';
  if (hasFieldErrors) {
    message = 'Please check the highlighted fields.';
  } else if (typeof parsed.message === 'string' && parsed.message && status < 500) {
    message = parsed.message;
  }

  return new ApiError({ status, message, fieldErrors, requestId });
}

/** Network failure or timeout: the gateway never answered. */
export function toNetworkError(cause: unknown, requestId?: string): ApiError {
  // A DOMException is not always an `Error` instance, so only the name is checked.
  const timedOut = (cause as { name?: unknown } | null)?.name === 'TimeoutError';
  return new ApiError({
    status: timedOut ? 504 : 503,
    message: FALLBACK_MESSAGES[timedOut ? 504 : 503]!,
    requestId,
    cause,
  });
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;
const hasStatus = (error: unknown, status: number) => isApiError(error) && error.status === status;

export const isUnauthorized = (error: unknown) => hasStatus(error, 401);
export const isForbidden = (error: unknown) => hasStatus(error, 403);
export const isNotFound = (error: unknown) => hasStatus(error, 404);
export const isConflict = (error: unknown) => hasStatus(error, 409);
export const isRateLimited = (error: unknown) => hasStatus(error, 429);

/** What a Server Action returns to the client instead of throwing. */
export type ActionError = {
  ok: false;
  status: number;
  message: string;
  fieldErrors: FieldErrors;
  requestId?: string;
};

export type ActionResult<T = undefined> =
  ({ ok: true } & (T extends undefined ? object : T)) | ActionError;

export function toActionError(error: unknown): ActionError {
  if (isApiError(error)) {
    return {
      ok: false,
      status: error.status,
      message: error.message,
      fieldErrors: error.fieldErrors,
      requestId: error.requestId,
    };
  }
  throw error;
}

export function validationError(fieldErrors: FieldErrors): ActionError {
  return { ok: false, status: 400, message: 'Please check the highlighted fields.', fieldErrors };
}
