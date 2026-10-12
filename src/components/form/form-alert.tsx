import { CircleAlertIcon } from 'lucide-react';

/** Form-level error. Shows the request id so a problem can be traced in the backend logs. */
export function FormAlert({ message, requestId }: { message?: string; requestId?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
    >
      <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p>{message}</p>
        {requestId ? (
          <p className="mt-1 font-mono text-xs break-all opacity-80">Reference: {requestId}</p>
        ) : null}
      </div>
    </div>
  );
}
