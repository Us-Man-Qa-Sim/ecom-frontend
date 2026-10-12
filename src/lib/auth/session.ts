import 'server-only';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { cache } from 'react';
import { api, unwrap } from '@/lib/api/client';
import { isNotFound, isUnauthorized } from '@/lib/api/errors';
import type { User } from '@/lib/api/types';
import { readAccessToken } from './cookies';
import { loginPathWithNext } from './safe-next';
import { verifyAccessToken, type Session } from './verify';

/** The verified session from the access cookie, or null. One verification per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const token = await readAccessToken();
  return token ? verifyAccessToken(token) : null;
});

/** The full user from `GET /users/me`, or null for a guest. One call per request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  if (!(await getSession())) return null;
  try {
    const client = await api();
    return (await unwrap(client.GET('/users/me'))) as User;
  } catch (error) {
    if (isUnauthorized(error) || isNotFound(error)) return null;
    throw error;
  }
});

/** For pages and actions that need a logged-in user. proxy.ts already redirects; this is the second check. */
export async function requireSession(next: string): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(loginPathWithNext(next) as Route);
  return session;
}

/** Second ADMIN check, after proxy.ts and before the gateway's own check (FD4). */
export async function requireAdmin(next: string): Promise<Session> {
  const session = await requireSession(next);
  if (session.role !== 'ADMIN') redirect('/');
  return session;
}
