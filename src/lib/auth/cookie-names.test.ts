import { describe, expect, it } from 'vitest';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE_SECONDS,
  authCookies,
  clearedAuthCookies,
} from './cookie-names';

const now = Date.parse('2026-10-13T10:00:00.000Z');
const tokens = {
  accessToken: 'access',
  refreshToken: 'refresh',
  accessTokenExpiresAt: '2026-10-13T10:15:00.000Z',
};

describe('authCookies', () => {
  it('sets both cookies httpOnly, SameSite=Lax, Path=/', () => {
    const cookies = authCookies(tokens, false, now);
    expect(cookies.map((cookie) => cookie.name)).toEqual([ACCESS_COOKIE, REFRESH_COOKIE]);
    for (const cookie of cookies) {
      expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/', secure: false });
    }
  });

  it('adds Secure when asked', () => {
    expect(authCookies(tokens, true, now).every((cookie) => cookie.secure)).toBe(true);
  });

  it('gives the access cookie the lifetime of its token and the refresh cookie 30 days', () => {
    const [access, refresh] = authCookies(tokens, false, now);
    expect(access?.maxAge).toBe(15 * 60);
    expect(refresh?.maxAge).toBe(REFRESH_MAX_AGE_SECONDS);
    expect(REFRESH_MAX_AGE_SECONDS).toBe(2_592_000);
  });

  it('falls back to 15 minutes when the expiry is missing', () => {
    const [access] = authCookies({ ...tokens, accessTokenExpiresAt: null }, false, now);
    expect(access?.maxAge).toBe(900);
  });

  it('never sets a zero or negative lifetime for a fresh token', () => {
    const [access] = authCookies(
      { ...tokens, accessTokenExpiresAt: '2026-10-13T09:59:59.000Z' },
      false,
      now,
    );
    expect(access?.maxAge).toBe(1);
  });
});

describe('clearedAuthCookies', () => {
  it('expires both cookies with the same flags', () => {
    for (const cookie of clearedAuthCookies(true)) {
      expect(cookie).toMatchObject({ value: '', maxAge: 0, httpOnly: true, path: '/' });
    }
  });
});
