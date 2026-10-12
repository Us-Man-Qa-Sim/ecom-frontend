import { describe, expect, it } from 'vitest';
import {
  currencyExponent,
  formatMoney,
  minorToDecimalString,
  multiplyMoney,
  parseMoneyInput,
  sumMoney,
} from './money';

describe('currencyExponent', () => {
  it('reads the decimals from the currency', () => {
    expect(currencyExponent('USD')).toBe(2);
    expect(currencyExponent('jpy')).toBe(0);
    expect(currencyExponent('KWD')).toBe(3);
  });

  it('falls back to 2 for an unknown code', () => {
    expect(currencyExponent('not-a-code')).toBe(2);
  });
});

describe('formatMoney', () => {
  it('formats minor units with the currency decimals', () => {
    expect(formatMoney({ amountMinor: 1999, currency: 'USD' })).toBe('$19.99');
    expect(formatMoney({ amountMinor: 1999, currency: 'JPY' })).toBe('¥1,999');
    expect(formatMoney({ amountMinor: 5, currency: 'USD' })).toBe('$0.05');
  });

  it('shows a dash for a missing price', () => {
    expect(formatMoney(null)).toBe('—');
  });
});

describe('minorToDecimalString', () => {
  it('converts without floats', () => {
    expect(minorToDecimalString(1234, 'USD')).toBe('12.34');
    expect(minorToDecimalString(5, 'USD')).toBe('0.05');
    expect(minorToDecimalString(500, 'JPY')).toBe('500');
  });
});

describe('parseMoneyInput', () => {
  it('parses decimal strings exactly', () => {
    expect(parseMoneyInput('12.34', 'USD')).toEqual({ ok: true, amountMinor: 1234 });
    expect(parseMoneyInput('12', 'USD')).toEqual({ ok: true, amountMinor: 1200 });
    expect(parseMoneyInput('12.3', 'USD')).toEqual({ ok: true, amountMinor: 1230 });
    expect(parseMoneyInput(' 0.07 ', 'USD')).toEqual({ ok: true, amountMinor: 7 });
    expect(parseMoneyInput('1999', 'JPY')).toEqual({ ok: true, amountMinor: 1999 });
  });

  it('avoids the classic float errors', () => {
    // 19.99 * 100 === 1998.9999999999998 and 0.29 * 100 === 28.999999999999996
    expect(parseMoneyInput('19.99', 'USD')).toEqual({ ok: true, amountMinor: 1999 });
    expect(parseMoneyInput('0.29', 'USD')).toEqual({ ok: true, amountMinor: 29 });
  });

  it('rejects too many decimals', () => {
    expect(parseMoneyInput('1.234', 'USD').ok).toBe(false);
    expect(parseMoneyInput('1.5', 'JPY').ok).toBe(false);
  });

  it('rejects junk and negatives', () => {
    for (const input of ['', 'abc', '-1', '1,50', '1e3', '.5', '1.2.3']) {
      expect(parseMoneyInput(input, 'USD').ok, input).toBe(false);
    }
  });

  it('enforces the int32 cap', () => {
    expect(parseMoneyInput('21474836.47', 'USD')).toEqual({ ok: true, amountMinor: 2147483647 });
    expect(parseMoneyInput('21474836.48', 'USD').ok).toBe(false);
    expect(parseMoneyInput('99999999999999999999', 'USD').ok).toBe(false);
  });
});

describe('sumMoney', () => {
  it('adds one currency', () => {
    expect(
      sumMoney([
        { amountMinor: 1000, currency: 'USD' },
        { amountMinor: 250, currency: 'USD' },
      ]),
    ).toEqual({ amountMinor: 1250, currency: 'USD' });
  });

  it('returns null for an empty list', () => {
    expect(sumMoney([])).toBeNull();
  });

  it('refuses mixed currencies', () => {
    expect(() =>
      sumMoney([
        { amountMinor: 1, currency: 'USD' },
        { amountMinor: 1, currency: 'EUR' },
      ]),
    ).toThrow(/Cannot add EUR to USD/);
  });
});

describe('multiplyMoney', () => {
  it('multiplies by a quantity', () => {
    expect(multiplyMoney({ amountMinor: 1999, currency: 'USD' }, 3)).toEqual({
      amountMinor: 5997,
      currency: 'USD',
    });
  });
});
