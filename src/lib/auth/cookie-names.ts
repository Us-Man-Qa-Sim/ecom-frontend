// Cookie names and flags (FD2). No `server-only`: proxy.ts uses this file too.

export const ACCESS_COOKIE = 'ecom_at';
export const REFRESH_COOKIE = 'ecom_rt';

/** Matches JWT_REFRESH_TTL_SECONDS in user-service (30 days). */
export const REFRESH_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const ACCESS_FALLBACK_MAX_AGE_SECONDS = 15 * 60;

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string | null;
};

export type CookieDescriptor = {
  name: string;
  value: string;
  httpOnly: true;
  sameSite: 'lax';
  path: '/';
  secure: boolean;
  maxAge: number;
};

function base(secure: boolean) {
  return { httpOnly: true, sameSite: 'lax', path: '/', secure } as const;
}

/** The two auth cookies for a token pair. The access cookie dies with its token. */
export function authCookies(
  tokens: TokenPair,
  secure: boolean,
  now = Date.now(),
): CookieDescriptor[] {
  const expiresAt = tokens.accessTokenExpiresAt ? Date.parse(tokens.accessTokenExpiresAt) : NaN;
  const accessMaxAge = Number.isFinite(expiresAt)
    ? Math.max(1, Math.floor((expiresAt - now) / 1000))
    : ACCESS_FALLBACK_MAX_AGE_SECONDS;

  return [
    { ...base(secure), name: ACCESS_COOKIE, value: tokens.accessToken, maxAge: accessMaxAge },
    {
      ...base(secure),
      name: REFRESH_COOKIE,
      value: tokens.refreshToken,
      maxAge: REFRESH_MAX_AGE_SECONDS,
    },
  ];
}

export function clearedAuthCookies(secure: boolean): CookieDescriptor[] {
  return [ACCESS_COOKIE, REFRESH_COOKIE].map((name) => ({
    ...base(secure),
    name,
    value: '',
    maxAge: 0,
  }));
}
