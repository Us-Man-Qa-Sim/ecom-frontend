import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import type { ActionError } from '@/lib/api/errors';

/**
 * Puts a Server Action's errors into a react-hook-form: field errors next to
 * their inputs, everything else as the form-level `root` error.
 */
export function applyActionError<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: ActionError,
) {
  const known = new Set(Object.keys(form.getValues()));
  let placed = 0;
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    if (!known.has(field)) continue;
    form.setError(field as Path<T>, { type: 'server', message });
    placed += 1;
  }

  const unplaced = Object.entries(error.fieldErrors).filter(([field]) => !known.has(field));
  if (placed === 0 || unplaced.length > 0) {
    const message =
      unplaced.length > 0 ? unplaced.map(([, text]) => text).join(' ') : error.message;
    form.setError('root', { type: String(error.status), message });
  }
  return error.requestId;
}
