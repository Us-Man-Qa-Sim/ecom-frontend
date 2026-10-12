import type { OrderStatus } from '@/lib/api/types';

// The order state machine from BACKEND_PLAN.md §2:
//   PENDING → CONFIRMED → SHIPPED → DELIVERED
//   PENDING / CONFIRMED → CANCELLED

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Processing',
  CONFIRMED: 'Confirmed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && value in STATUS_LABELS;
}

/** Customers and admins may cancel only before shipping. */
export const canCancel = (status: OrderStatus | null) =>
  status === 'PENDING' || status === 'CONFIRMED';
export const canShip = (status: OrderStatus | null) => status === 'CONFIRMED';
export const canDeliver = (status: OrderStatus | null) => status === 'SHIPPED';

// ── Live status polling (§3) ──
// Stock is reserved asynchronously over Kafka and there is no push channel, so
// the order page polls while the order is PENDING.

export const FAST_POLL_MS = 1000;
export const SLOW_POLL_MS = 3000;
export const FAST_POLL_WINDOW_MS = 5000;
export const POLL_TIMEOUT_MS = 60_000;

/** Every 1 s for 5 s, then every 3 s, and stop after 60 s or once the order left PENDING. */
export function nextPollInterval(elapsedMs: number, status: OrderStatus | null): number | false {
  if (status !== 'PENDING') return false;
  if (elapsedMs >= POLL_TIMEOUT_MS) return false;
  return elapsedMs < FAST_POLL_WINDOW_MS ? FAST_POLL_MS : SLOW_POLL_MS;
}

export const pollTimedOut = (elapsedMs: number, status: OrderStatus | null) =>
  status === 'PENDING' && elapsedMs >= POLL_TIMEOUT_MS;

// ── Timeline ──

export type TimelineStep = {
  key: OrderStatus | 'PLACED';
  label: string;
  state: 'done' | 'current' | 'upcoming' | 'cancelled';
};

const HAPPY_PATH = ['CONFIRMED', 'SHIPPED', 'DELIVERED'] as const;

/**
 * GAP-9: the order response has no status history, so the timeline is drawn
 * from the current status only (no timestamps per step, no cancel reason).
 */
export function timelineSteps(status: OrderStatus | null): TimelineStep[] {
  const placed: TimelineStep = { key: 'PLACED', label: 'Order placed', state: 'done' };

  if (status === 'CANCELLED') {
    return [placed, { key: 'CANCELLED', label: 'Cancelled', state: 'cancelled' }];
  }

  const reached = status ? HAPPY_PATH.indexOf(status as (typeof HAPPY_PATH)[number]) : -1;
  return [
    placed,
    ...HAPPY_PATH.map((step, index): TimelineStep => {
      let state: TimelineStep['state'] = 'upcoming';
      if (index <= reached) state = 'done';
      else if (index === reached + 1) state = 'current';
      return {
        key: step,
        label:
          step === 'CONFIRMED' && state === 'current' ? 'Reserving stock' : STATUS_LABELS[step],
        state,
      };
    }),
  ];
}
