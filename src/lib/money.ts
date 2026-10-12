// Money is integer minor units end to end (API-5). No floats anywhere.

export type Money = { amountMinor: number; currency: string };

/** order-service stores amounts as int32. */
export const MAX_AMOUNT_MINOR = 2_147_483_647;

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY'] as const;

const exponentCache = new Map<string, number>();

/** Number of decimals for a currency: USD = 2, JPY = 0, KWD = 3. */
export function currencyExponent(currency: string): number {
  const code = currency.toUpperCase();
  let exponent = exponentCache.get(code);
  if (exponent === undefined) {
    try {
      exponent =
        new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions()
          .maximumFractionDigits ?? 2;
    } catch {
      exponent = 2;
    }
    exponentCache.set(code, exponent);
  }
  return exponent;
}

export function formatMoney(money: Money | null | undefined, locale = 'en-US'): string {
  if (!money) return '—';
  const exponent = currencyExponent(money.currency);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: money.currency.toUpperCase(),
    }).format(money.amountMinor / 10 ** exponent);
  } catch {
    return `${minorToDecimalString(money.amountMinor, money.currency)} ${money.currency}`;
  }
}

/** 1234 → "12.34" (USD). Used to prefill price inputs. */
export function minorToDecimalString(amountMinor: number, currency: string): string {
  const exponent = currencyExponent(currency);
  if (exponent === 0) return String(amountMinor);
  const digits = String(Math.abs(amountMinor)).padStart(exponent + 1, '0');
  const sign = amountMinor < 0 ? '-' : '';
  return `${sign}${digits.slice(0, -exponent)}.${digits.slice(-exponent)}`;
}

export type ParseMoneyResult = { ok: true; amountMinor: number } | { ok: false; error: string };

/**
 * "12.34" + USD → 1234, using string arithmetic only (never `parseFloat * 100`).
 * Rejects negatives, too many decimals and amounts above int32.
 */
export function parseMoneyInput(input: string, currency: string): ParseMoneyResult {
  const exponent = currencyExponent(currency);
  const value = input.trim();
  const match = /^(\d+)(?:\.(\d*))?$/.exec(value);
  if (!match) return { ok: false, error: 'Enter a positive amount, for example 12.34' };

  const whole = match[1]!;
  const fraction = match[2] ?? '';
  if (fraction.length > exponent) {
    return {
      ok: false,
      error:
        exponent === 0
          ? `${currency.toUpperCase()} has no decimals`
          : `${currency.toUpperCase()} allows at most ${exponent} decimals`,
    };
  }

  const digits = (whole + fraction.padEnd(exponent, '0')).replace(/^0+(?=\d)/, '');
  if (digits.length > 10 || Number(digits) > MAX_AMOUNT_MINOR) {
    return { ok: false, error: 'Amount is too large' };
  }
  return { ok: true, amountMinor: Number(digits) };
}

/** Sums amounts of one currency. Throws on mixed currencies or int32 overflow. */
export function sumMoney(amounts: Money[]): Money | null {
  const first = amounts[0];
  if (!first) return null;
  let total = 0;
  for (const amount of amounts) {
    if (amount.currency !== first.currency) {
      throw new Error(`Cannot add ${amount.currency} to ${first.currency}`);
    }
    total += amount.amountMinor;
  }
  if (!Number.isSafeInteger(total)) throw new Error('Money total overflow');
  return { amountMinor: total, currency: first.currency };
}

export function multiplyMoney(money: Money, quantity: number): Money {
  return { amountMinor: money.amountMinor * quantity, currency: money.currency };
}
