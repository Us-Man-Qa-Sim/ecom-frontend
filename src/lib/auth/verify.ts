import { jwtVerify } from 'jose';
import { serverEnv } from '@/env';
import type { Role } from '@/lib/api/types';
import { loadPublicKey } from './keys';

// No `server-only`: proxy.ts verifies tokens too.

export type Session = {
  userId: string;
  email: string;
  role: Role;
  /** Unix seconds. */
  expiresAt: number;
};

const CLOCK_TOLERANCE_SECONDS = 5;

/** Verifies an access token (RS256, issuer, audience, expiry). Returns null if it is not valid. */
export async function verifyAccessToken(token: string): Promise<Session | null> {
  const env = serverEnv();
  try {
    const { payload } = await jwtVerify(token, await loadPublicKey(), {
      algorithms: ['RS256'],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
    });
    const { sub, exp, role, email } = payload;
    if (typeof sub !== 'string' || typeof exp !== 'number') return null;
    if (role !== 'CUSTOMER' && role !== 'ADMIN') return null;
    return { userId: sub, email: typeof email === 'string' ? email : '', role, expiresAt: exp };
  } catch {
    return null;
  }
}
