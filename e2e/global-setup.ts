const gateway = process.env.API_INTERNAL_URL ?? 'http://localhost:3000';

// Fail fast with a clear message when the backend stack is not running.
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
}
