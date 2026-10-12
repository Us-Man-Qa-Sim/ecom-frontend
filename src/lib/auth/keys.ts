import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { importSPKI } from 'jose';
import { serverEnv } from '@/env';

// No `server-only` here: proxy.ts and instrumentation.ts load this file too.

type PublicKey = Awaited<ReturnType<typeof importSPKI>>;

let keyPromise: Promise<PublicKey> | undefined;

/** The RS256 public key that user-service signs access tokens with (FD4). */
export function loadPublicKey(): Promise<PublicKey> {
  keyPromise ??= readFile(resolve(serverEnv().JWT_PUBLIC_KEY_PATH), 'utf8')
    .then((pem) => importSPKI(pem, 'RS256'))
    .catch((error: unknown) => {
      keyPromise = undefined;
      throw new Error(
        `Cannot load JWT public key from JWT_PUBLIC_KEY_PATH=${serverEnv().JWT_PUBLIC_KEY_PATH}`,
        { cause: error },
      );
    });
  return keyPromise;
}
