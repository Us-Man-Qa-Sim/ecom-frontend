import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3001';

// E2E tests run against the real compose stack (FD13):
//   in ../infra:  docker compose --profile app up -d
export default defineConfig({
  testDir: './e2e',
  // One worker: all gateway calls come from one IP and share one rate-limit bucket (GAP-2).
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /responsive.spec.ts/,
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      // The responsive checks are the only tests that need a phone viewport.
      testMatch: /responsive\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: `${baseURL}/api/health`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
