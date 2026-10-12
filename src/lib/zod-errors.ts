import type { z } from 'zod';
import type { FieldErrors } from '@/lib/api/errors';

/** First message per top-level field, in the same shape as gateway field errors. */
export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? 'root');
    result[field] ??= issue.message;
  }
  return result;
}
