import { execFileSync } from 'node:child_process';
import { ADMIN, authSlot } from './helpers';

const gateway = process.env.API_INTERNAL_URL ?? 'http://localhost:3000';

async function adminCanLogIn(): Promise<boolean> {
  await authSlot();
  const response = await fetch(`${gateway}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(ADMIN),
  });
  return response.ok;
}

// Checks the backend stack and makes sure the test admin exists (TST-2).
export default async function globalSetup() {
  try {
    const response = await fetch(`${gateway}/health/live`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    throw new Error(
      `The API gateway is not reachable at ${gateway}. Start it with ` +
        '"docker compose --profile app up -d" in ../infra.',
      { cause: error },
    );
  }

  if (await adminCanLogIn()) return;

  // USR-7: the seed creates the user or promotes it to ADMIN.
  try {
    execFileSync(
      'docker',
      [
        'exec',
        ...['-e', `ADMIN_EMAIL=${ADMIN.email}`],
        ...['-e', `ADMIN_PASSWORD=${ADMIN.password}`],
        ...['-e', 'ADMIN_FIRST_NAME=Admin', '-e', 'ADMIN_LAST_NAME=User'],
        ...['-e', 'OUTBOX_RELAY_ENABLED=false'],
        process.env.E2E_USER_SERVICE_CONTAINER ?? 'ecom-user-service',
        'node',
        'dist/seed/seed-admin.js',
      ],
      { stdio: 'inherit' },
    );
  } catch (error) {
    throw new Error(
      `No admin can log in as ${ADMIN.email}. Seed one with "npm run seed:admin" in user-service ` +
        'or set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.',
      { cause: error },
    );
  }
}
