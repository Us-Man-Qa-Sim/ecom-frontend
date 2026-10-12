import { expect, test } from '@playwright/test';
import { newUser, register } from './helpers';

// TST-6: the session survives an expired access token.
//
// When the access token expires the browser drops the `ecom_at` cookie (its
// max-age is the token lifetime), so only the refresh cookie is sent. The test
// removes the access cookie to get that state without waiting 15 minutes, and
// needs no special token lifetime in the backend.

test.describe('session refresh', () => {
  test('an expired access token is refreshed silently and the page still works', async ({
    page,
    context,
  }) => {
    await register(page, newUser('refresh'));
    const before = await context.cookies();
    const oldRefresh = before.find((cookie) => cookie.name === 'ecom_rt')!.value;

    await context.clearCookies({ name: 'ecom_at' });
    await page.goto('/account');

    // No redirect to /login: proxy.ts refreshed and the same request rendered the page.
    await expect(page).toHaveURL('/account');
    await expect(page.getByTestId('profile')).toContainText('Test Shopper');

    const after = await context.cookies();
    expect(after.find((cookie) => cookie.name === 'ecom_at')?.value).toBeTruthy();
    // The refresh token was rotated.
    expect(after.find((cookie) => cookie.name === 'ecom_rt')?.value).not.toBe(oldRefresh);
  });

  test('parallel requests with one expired token do not revoke the session', async ({
    page,
    context,
  }) => {
    await register(page, newUser('parallel'));
    const refresh = (await context.cookies()).find((cookie) => cookie.name === 'ecom_rt')!;
    await context.clearCookies({ name: 'ecom_at' });

    // Six requests at once, all with the same old refresh token and no access
    // token: two tabs, a page plus its prefetches, and so on. user-service
    // treats a second use of a refresh token as theft and revokes the family,
    // so these must share one refresh call (FD3 single-flight).
    const cookie = `ecom_rt=${refresh.value}`;
    const responses = await Promise.all(
      ['/account', '/orders', '/account/addresses', '/checkout', '/account', '/orders'].map(
        (path) =>
          fetch(new URL(path, page.url()), { headers: { cookie }, redirect: 'manual' }).then(
            (response) => ({
              path,
              status: response.status,
              cookies: response.headers.getSetCookie(),
            }),
          ),
      ),
    );

    for (const response of responses) {
      expect(response.status, `${response.path} was redirected to login`).toBe(200);
    }
    // Everyone got the same new pair.
    const newRefreshTokens = new Set(
      responses.map(
        (response) => response.cookies.find((value) => value.startsWith('ecom_rt='))?.split(';')[0],
      ),
    );
    expect(newRefreshTokens.size).toBe(1);

    // A late request that still carries the old token (it left before the
    // Set-Cookie arrived) is also fine.
    const late = await fetch(new URL('/account', page.url()), {
      headers: { cookie },
      redirect: 'manual',
    });
    expect(late.status).toBe(200);

    // And the browser's own session is alive: it takes the rotated cookies and carries on.
    const [newRefresh] = [...newRefreshTokens];
    await context.addCookies([{ ...refresh, value: newRefresh!.slice('ecom_rt='.length) }]);
    await page.goto('/orders');
    await expect(page).toHaveURL('/orders');
    await expect(page.getByRole('heading', { name: 'Orders', level: 1 })).toBeVisible();
  });

  test('a revoked refresh token logs the user out cleanly', async ({ page, context }) => {
    await page.goto('/');
    await context.addCookies([
      { name: 'ecom_rt', value: 'not-a-real-refresh-token', url: page.url() },
    ]);

    await page.goto('/account');

    await expect(page).toHaveURL('/login?next=%2Faccount');
    expect((await context.cookies()).filter((cookie) => cookie.name.startsWith('ecom_'))).toEqual(
      [],
    );
  });
});
