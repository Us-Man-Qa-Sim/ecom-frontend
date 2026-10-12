import { expect, test } from '@playwright/test';
import { authSlot, field, login, logout, newUser, register } from './helpers';

test.describe('auth', () => {
  test('register logs the user in, and logout and login work', async ({ page, context }) => {
    const user = newUser('auth');

    await register(page, user);
    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('user-name')).toHaveText(user.firstName);

    // Tokens are httpOnly cookies. Page scripts cannot read them.
    const cookies = await context.cookies();
    for (const name of ['ecom_at', 'ecom_rt']) {
      expect(cookies.find((cookie) => cookie.name === name)).toMatchObject({
        httpOnly: true,
        sameSite: 'Lax',
        path: '/',
      });
    }
    expect(await page.evaluate(() => document.cookie)).not.toContain('ecom_');

    await logout(page);
    expect((await context.cookies()).filter((cookie) => cookie.name.startsWith('ecom_'))).toEqual(
      [],
    );

    await login(page, user.email, user.password);
    await expect(page.getByTestId('user-name')).toHaveText(user.firstName);
  });

  test('a guest is sent to login and back to the page they wanted', async ({ page }) => {
    const user = newUser('next');

    await page.goto('/account');
    await expect(page).toHaveURL('/login?next=%2Faccount');

    await authSlot(2);
    await page.getByRole('link', { name: 'Create an account' }).click();
    await expect(page).toHaveURL('/register?next=%2Faccount');
    await field(page, 'First name').fill(user.firstName);
    await field(page, 'Last name').fill(user.lastName);
    await field(page, 'Email').fill(user.email);
    await field(page, 'Password').fill(user.password);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL('/account');
  });

  test('wrong password and short password show clear errors', async ({ page }) => {
    await authSlot();
    await page.goto('/login');
    await field(page, 'Email').fill('nobody@example.com');
    await field(page, 'Password').fill('definitely-wrong-password');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByText('Invalid email or password.')).toBeVisible();

    await page.goto('/register');
    await field(page, 'First name').fill('A');
    await field(page, 'Last name').fill('B');
    await field(page, 'Email').fill('short@example.com');
    await field(page, 'Password').fill('too-short');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Use at least 12 characters')).toBeVisible();
  });

  test('a customer cannot open the admin area', async ({ page }) => {
    await register(page, newUser('noadmin'));
    await page.goto('/admin');
    await expect(page).toHaveURL('/');
  });
});
