import { CheckIcon, LoaderCircleIcon, XIcon } from 'lucide-react';
import type { OrderStatus } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { timelineSteps } from './status';

export function OrderTimeline({ status }: { status: OrderStatus | null }) {
  const steps = timelineSteps(status);

  return (
    <ol className="flex flex-col gap-0" aria-label="Order progress">
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <li
            key={step.key}
            className="flex gap-3"
            aria-current={step.state === 'current' ? 'step' : undefined}
          >
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs',
                  step.state === 'done' && 'border-primary bg-primary text-primary-foreground',
                  step.state === 'current' && 'border-primary text-primary',
                  step.state === 'upcoming' && 'text-muted-foreground',
                  step.state === 'cancelled' &&
                    'border-destructive/40 bg-destructive/10 text-destructive',
                )}
                aria-hidden
              >
                {step.state === 'done' ? <CheckIcon className="size-3.5" /> : null}
                {step.state === 'current' ? (
                  <LoaderCircleIcon className="size-3.5 motion-safe:animate-spin" />
                ) : null}
                {step.state === 'cancelled' ? <XIcon className="size-3.5" /> : null}
              </span>
              {last ? null : (
                <span
                  className={cn(
                    'my-1 w-px flex-1',
                    step.state === 'done' ? 'bg-primary' : 'bg-border',
                  )}
                  aria-hidden
                />
              )}
            </div>
            <p
              className={cn(
                'pb-5 text-sm',
                step.state === 'upcoming' && 'text-muted-foreground',
                step.state === 'cancelled' && 'font-medium text-destructive',
                (step.state === 'done' || step.state === 'current') && 'font-medium',
              )}
            >
              {step.label}
              <span className="sr-only">
                {step.state === 'done' ? ' (done)' : null}
                {step.state === 'current' ? ' (in progress)' : null}
                {step.state === 'upcoming' ? ' (not yet)' : null}
              </span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}
