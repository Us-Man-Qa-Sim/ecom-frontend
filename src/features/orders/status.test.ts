import { describe, expect, it } from 'vitest';
import {
  canCancel,
  canDeliver,
  canShip,
  nextPollInterval,
  pollTimedOut,
  timelineSteps,
} from './status';

describe('nextPollInterval (§3)', () => {
  it('polls every second for the first 5 seconds', () => {
    expect(nextPollInterval(0, 'PENDING')).toBe(1000);
    expect(nextPollInterval(4999, 'PENDING')).toBe(1000);
  });

  it('then polls every 3 seconds', () => {
    expect(nextPollInterval(5000, 'PENDING')).toBe(3000);
    expect(nextPollInterval(59_999, 'PENDING')).toBe(3000);
  });

  it('stops after 60 seconds', () => {
    expect(nextPollInterval(60_000, 'PENDING')).toBe(false);
    expect(pollTimedOut(60_000, 'PENDING')).toBe(true);
    expect(pollTimedOut(59_999, 'PENDING')).toBe(false);
  });

  it.each(['CONFIRMED', 'CANCELLED', 'SHIPPED', 'DELIVERED'] as const)(
    'stops at once when the order is %s',
    (status) => {
      expect(nextPollInterval(0, status)).toBe(false);
      expect(pollTimedOut(120_000, status)).toBe(false);
    },
  );

  it('does not poll an order without a status', () => {
    expect(nextPollInterval(0, null)).toBe(false);
  });
});

describe('allowed actions follow the state machine', () => {
  it('cancel: only PENDING and CONFIRMED', () => {
    expect(canCancel('PENDING')).toBe(true);
    expect(canCancel('CONFIRMED')).toBe(true);
    expect(canCancel('SHIPPED')).toBe(false);
    expect(canCancel('DELIVERED')).toBe(false);
    expect(canCancel('CANCELLED')).toBe(false);
    expect(canCancel(null)).toBe(false);
  });

  it('ship: only CONFIRMED. deliver: only SHIPPED', () => {
    expect(canShip('CONFIRMED')).toBe(true);
    expect(canShip('PENDING')).toBe(false);
    expect(canShip('SHIPPED')).toBe(false);
    expect(canDeliver('SHIPPED')).toBe(true);
    expect(canDeliver('CONFIRMED')).toBe(false);
    expect(canDeliver('DELIVERED')).toBe(false);
  });
});

describe('timelineSteps', () => {
  const states = (status: Parameters<typeof timelineSteps>[0]) =>
    timelineSteps(status).map((step) => `${step.key}:${step.state}`);

  it('PENDING: placed, confirmation in progress', () => {
    expect(states('PENDING')).toEqual([
      'PLACED:done',
      'CONFIRMED:current',
      'SHIPPED:upcoming',
      'DELIVERED:upcoming',
    ]);
    expect(timelineSteps('PENDING')[1]?.label).toBe('Reserving stock');
  });

  it('SHIPPED: delivery in progress', () => {
    expect(states('SHIPPED')).toEqual([
      'PLACED:done',
      'CONFIRMED:done',
      'SHIPPED:done',
      'DELIVERED:current',
    ]);
  });

  it('DELIVERED: everything done', () => {
    expect(states('DELIVERED').every((state) => state.endsWith(':done'))).toBe(true);
  });

  it('CANCELLED: a short timeline', () => {
    expect(states('CANCELLED')).toEqual(['PLACED:done', 'CANCELLED:cancelled']);
  });
});
