'use server';

import type { Route } from 'next';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, unwrap } from '@/lib/api/client';
import {
  isApiError,
  toActionError,
  validationError,
  type ActionError,
  type ActionResult,
} from '@/lib/api/errors';
import type { AuthTokens } from '@/lib/api/types';
import { clearAuthCookies, readRefreshToken, setAuthCookies } from '@/lib/auth/cookies';
import { safeNextPath } from '@/lib/auth/safe-next';
import { zodFieldErrors } from '@/lib/zod-errors';
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from './schemas';

function authError(error: unknown): ActionError {
  const result = toActionError(error);
  if (result.status === 401) return { ...result, message: 'Invalid email or password.' };
  if (result.status === 409) {
    return {
      ...result,
      message: 'This email is already registered.',
      fieldErrors: { email: 'This email is already registered. Try logging in.' },
    };
  }
  if (result.status === 429) {
    return { ...result, message: 'Too many attempts. Please wait a minute and try again.' };
  }
  return result;
}

async function login(input: LoginInput): Promise<void> {
  const client = await api();
  const { tokens } = await unwrap(client.POST('/auth/login', { body: input }));
  await setAuthCookies(tokens as AuthTokens);
}

export async function loginAction(input: LoginInput, next?: string): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return validationError(zodFieldErrors(parsed.error));

  try {
    await login(parsed.data);
  } catch (error) {
    if (!isApiError(error)) throw error;
    return authError(error);
  }

  revalidatePath('/', 'layout');
  redirect((safeNextPath(next) ?? '/') as Route);
}

export async function registerAction(input: RegisterInput, next?: string): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return validationError(zodFieldErrors(parsed.error));

  try {
    const client = await api();
    await unwrap(client.POST('/auth/register', { body: parsed.data }));
  } catch (error) {
    if (!isApiError(error)) throw error;
    return authError(error);
  }

  // Register returns no tokens, so log in with the same credentials.
  try {
    await login({ email: parsed.data.email, password: parsed.data.password });
  } catch (error) {
    if (!isApiError(error)) throw error;
    // The account exists. Let the user log in by hand.
    redirect('/login?registered=1');
  }

  revalidatePath('/', 'layout');
  redirect((safeNextPath(next) ?? '/') as Route);
}

export async function logoutAction(): Promise<void> {
  const refreshToken = await readRefreshToken();
  if (refreshToken) {
    try {
      const client = await api();
      await client.POST('/auth/logout', { body: { refreshToken } });
    } catch {
      // Best effort: the cookies are cleared either way.
    }
  }
  await clearAuthCookies();
  revalidatePath('/', 'layout');
  redirect('/');
}
