import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'correct-horse-battery-staple';

export function uniqueEmail(prefix = 'e2e') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export type TestUser = { firstName: string; lastName: string; email: string; password: string };

export function newUser(prefix?: string): TestUser {
  return { firstName: 'Test', lastName: 'Shopper', email: uniqueEmail(prefix), password: PASSWORD };
}

export async function register(page: Page, user: TestUser, next?: string) {
  await page.goto(next ? `/register?next=${encodeURIComponent(next)}` : '/register');
  await field(page, 'First name').fill(user.firstName);
  await field(page, 'Last name').fill(user.lastName);
  await field(page, 'Email').fill(user.email);
  await field(page, 'Password').fill(user.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('button', { name: /Account menu/ })).toBeVisible();
}

export async function login(page: Page, email: string, password: string) {
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
