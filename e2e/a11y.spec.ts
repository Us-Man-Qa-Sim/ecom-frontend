import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ADMIN, addProductToCart, login, newUser, register } from './helpers';

// UX-1: automatic WCAG 2.1 A/AA checks on the main pages, plus the keyboard
// and focus behaviour that axe cannot see.

async function expectNoViolations(page: Page, label: string) {
  // Wait for streamed content: skeletons are `aria-busy`.
  await expect(page.locator('[aria-busy="true"]:visible')).toHaveCount(0);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    // The devtools button only exists in `next dev`.
    .exclude('.tsqd-parent-container')
    .exclude('nextjs-portal')
    .analyze();

  const summary = results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.help}\n` +
      violation.nodes.map((node) => `    ${node.target.join(' ')}`).join('\n'),
  );
  expect(summary, `${label}\n${summary.join('\n')}`).toEqual([]);
}

async function firstProductPath(page: Page) {
  await page.goto('/products');
  const href = await page.getByTestId('product-card').first().getByRole('link').getAttribute('href');
  return href!;
}

test.describe('accessibility', () => {
  test('public pages have no WCAG A/AA violations, in light and dark', async ({ page }) => {
    const cspErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && /Content Security Policy/i.test(message.text())) {
        cspErrors.push(message.text());
      }
    });

    const productPath = await firstProductPath(page);
    for (const path of ['/', '/products', productPath, '/cart', '/login', '/register']) {
      await page.goto(path);
      await expectNoViolations(page, path);
    }

    await page.emulateMedia({ colorScheme: 'dark' });
    for (const path of ['/', productPath, '/login']) {
      await page.goto(path);
      await expect(page.locator('html')).toHaveClass(/dark/);
      await expectNoViolations(page, `${path} (dark)`);
    }

    // The CSP (UX-4) must not block anything the pages need.
    expect(cspErrors).toEqual([]);
  });

  test('customer pages have no WCAG A/AA violations', async ({ page }) => {
    await register(page, newUser('a11y'));
    await addProductToCart(page, 'The Pragmatic Programmer');
    for (const path of ['/cart', '/checkout', '/orders', '/account', '/account/addresses']) {
      await page.goto(path);
      await expectNoViolations(page, path);
    }
  });

  test('admin pages have no WCAG A/AA violations', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    for (const path of ['/admin', '/admin/products', '/admin/products/new', '/admin/orders']) {
      await page.goto(path);
      await expectNoViolations(page, path);
    }
  });

  test('keyboard: add to cart, and the cart sheet traps and returns focus', async ({ page }) => {
    await page.goto(await firstProductPath(page));

    // The first Tab stop on every page lets keyboard users skip the header.
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();

    const addToCart = page.getByRole('button', { name: /Add to cart/ });
    // Disabled until the cart has been read from localStorage.
    await expect(addToCart).toBeEnabled();
    await addToCart.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('cart-count')).toHaveText('1');

    const cartButton = page.getByRole('button', { name: /^Cart, 1 item/ });
    await cartButton.focus();
    await page.keyboard.press('Enter');
    const sheet = page.getByRole('dialog', { name: 'Your cart' });
    await expect(sheet).toBeVisible();

    // Focus is inside the dialog and stays there.
    for (let step = 0; step < 12; step += 1) {
      await page.keyboard.press('Tab');
      expect(await sheet.evaluate((node) => node.contains(document.activeElement))).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(cartButton).toBeFocused();
  });

  test('the theme switch is remembered across reloads', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    await page.getByRole('button', { name: 'Change theme' }).click();
    await page.getByRole('menuitemradio', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.getByRole('button', { name: 'Change theme' }).click();
    await page.getByRole('menuitemradio', { name: 'System' }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });
});
