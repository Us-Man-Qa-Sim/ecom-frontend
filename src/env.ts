import { z } from 'zod';

// Zod-validated environment (FE0-6). Bad values stop the build (next.config.ts
// imports this file) and the boot (instrumentation.ts). Every value has a
// local-dev default, so a missing variable is fine but a wrong one is not.

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

const serverSchema = z.object({
  API_INTERNAL_URL: z.url().default('http://localhost:3000'),
  API_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60_000).default(8000),
  JWT_PUBLIC_KEY_PATH: z.string().min(1).default('../infra/keys/jwt-public.pem'),
  JWT_ISSUER: z.string().min(1).default('user-service'),
  JWT_AUDIENCE: z.string().min(1).default('ecom-api'),
  COOKIE_SECURE: booleanString.default(false),
  IMAGE_HOSTS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((host) => host.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().regex(/^[a-z0-9.-]+$/i, 'IMAGE_HOSTS must be bare hostnames'))),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default('http://localhost:3001'),
  NEXT_PUBLIC_SHOW_DEBUG: booleanString.default(false),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type PublicEnv = z.infer<typeof publicSchema>;

function parse<T>(schema: z.ZodType<T>, input: unknown, label: string): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid ${label} environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

// NEXT_PUBLIC_* must be read as literal `process.env.X` so Next.js can inline them.
export const publicEnv: PublicEnv = parse(
  publicSchema,
  {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SHOW_DEBUG: process.env.NEXT_PUBLIC_SHOW_DEBUG,
  },
  'public',
);

let cachedServerEnv: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv() was called in the browser');
  }
  cachedServerEnv ??= parse(serverSchema, process.env, 'server');
  return cachedServerEnv;
}
