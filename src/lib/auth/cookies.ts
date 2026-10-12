import 'server-only';
import { cookies } from 'next/headers';
import { serverEnv } from '@/env';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  authCookies,
  clearedAuthCookies,
  type TokenPair,
} from './cookie-names';

// Only Server Actions and Route Handlers may write cookies.

export async function setAuthCookies(tokens: TokenPair) {
  const store = await cookies();
  for (const { name, value, ...options } of authCookies(tokens, serverEnv().COOKIE_SECURE)) {
    store.set(name, value, options);
  }
}

export async function clearAuthCookies() {
  const store = await cookies();
  for (const { name, value, ...options } of clearedAuthCookies(serverEnv().COOKIE_SECURE)) {
    store.set(name, value, options);
  }
}

export async function readAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_COOKIE)?.value;
}

export async function readRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_COOKIE)?.value;
}
