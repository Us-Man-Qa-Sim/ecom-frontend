// Runs once when the server starts. Fails the boot on bad env (FE0-6).
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { serverEnv } = await import('./env');
  const { loadPublicKey } = await import('./lib/auth/keys');

  serverEnv();
  await loadPublicKey();
}
