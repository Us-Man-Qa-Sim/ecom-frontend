import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, type Page } from '@playwright/test';

export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com',
  password: process.env.E2E_ADMIN_PASSWORD ?? 'admin-password-for-dev-only',
};

// The gateway allows 10 /auth/* calls per minute for the whole site (GAP-2:
// every call comes from the Next.js server IP). The tests stay under it by
// waiting here before each call. The log is a file so it survives worker restarts.
const AUTH_LOG = join(tmpdir(), 'ecom-e2e-auth-calls.json');
const AUTH_LIMIT = 8;
const AUTH_WINDOW_MS = 62_000;

export async function authSlot(calls = 1) {
  for (;;) {
    const now = Date.now();
    const recent: number[] = (
      existsSync(AUTH_LOG) ? (JSON.parse(readFileSync(AUTH_LOG, 'utf8')) as number[]) : []
    ).filter((at) => now - at < AUTH_WINDOW_MS);
    if (recent.length + calls <= AUTH_LIMIT) {
      writeFileSync(AUTH_LOG, JSON.stringify([...recent, ...Array<number>(calls).fill(now)]));
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

export const PASSWORD = 'correct-horse-battery-staple';

export function uniqueEmail(prefix = 'e2e') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export type TestUser = { firstName: string; lastName: string; email: string; password: string };

export function newUser(prefix?: string): TestUser {
  return { firstName: 'Test', lastName: 'Shopper', email: uniqueEmail(prefix), password: PASSWORD };
}

export async function register(page: Page, user: TestUser, next?: string) {
  await authSlot(2); // register + login
  await page.goto(next ? `/register?next=${encodeURIComponent(next)}` : '/register');
  await field(page, 'First name').fill(user.firstName);
  await field(page, 'Last name').fill(user.lastName);
  await field(page, 'Email').fill(user.email);
  await field(page, 'Password').fill(user.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('button', { name: /Account menu/ })).toBeVisible();
}

export async function login(page: Page, email: string, password: string) {
  await authSlot();
  await page.goto('/login');
  await field(page, 'Email').fill(email);
  await field(page, 'Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('button', { name: /Account menu/ })).toBeVisible();
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: /Account menu/ }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
}

/** Next.js keeps the previous page in the DOM (hidden), so labels must be matched on visible inputs. */
export function field(page: Page, label: string) {
  return page.getByLabel(label, { exact: true }).filter({ visible: true });
}

/** Opens the catalog search and adds a product to the cart from its page. */
export async function addProductToCart(page: Page, name: string, quantity = 1) {
  await page.goto(`/products?search=${encodeURIComponent(name)}`);
  await page.getByTestId('product-card').filter({ hasText: name }).getByRole('link').click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  for (let step = 1; step < quantity; step += 1) {
    await page.getByRole('button', { name: 'Increase quantity' }).click();
  }
  await page.getByRole('button', { name: /Add to cart/ }).click();
  await expect(page.getByText(`Added to cart: ${name}`)).toBeVisible();
}

export async function fillAddress(page: Page) {
  await field(page, 'Street address').fill('221B Baker Street');
  await field(page, 'City').fill('London');
  await field(page, 'Postal code').fill('NW1 6XE');
  await field(page, 'Country').selectOption('GB');
}

const MAILPIT = process.env.MAILPIT_URL ?? 'http://localhost:8025';

/** Waits for an email to `to` whose subject matches, using the Mailpit API. */
export async function waitForEmail(to: string, subject: RegExp, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const response = await fetch(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`,
    );
    if (response.ok) {
      const body = (await response.json()) as { messages?: { Subject: string }[] };
      const match = body.messages?.find((message) => subject.test(message.Subject));
      if (match) return match;
    }
    if (Date.now() > deadline) throw new Error(`No email to ${to} matching ${subject}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
