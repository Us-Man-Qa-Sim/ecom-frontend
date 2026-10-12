import { expect, test } from '@playwright/test';

test.describe('catalog and cart', () => {
  test('browse, filter, open a product and fill the cart as a guest', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Newest products' })).toBeVisible();
    await expect(page.getByTestId('product-card').first()).toBeVisible();

    // Category tile → filtered catalog, state in the URL.
    await page.getByRole('link', { name: 'Books' }).first().click();
    await expect(page).toHaveURL('/products?category=books');
    await expect(page.getByTestId('result-count')).toContainText('in Books');
    const bookCount = await page.getByTestId('product-card').count();
    expect(bookCount).toBeGreaterThan(0);

    // Search from the header.
    await page.getByRole('searchbox', { name: 'Search products' }).first().fill('keyboard');
    await page.getByRole('searchbox', { name: 'Search products' }).first().press('Enter');
    await expect(page).toHaveURL('/products?search=keyboard');
    const card = page.getByTestId('product-card').filter({ hasText: 'Mechanical Keyboard' });
    await expect(card).toBeVisible();

    // Product page.
    await card.getByRole('link').click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Mechanical Keyboard');
    await expect(page.getByTestId('product-price').filter({ visible: true })).toHaveText('$129.00');
    await expect(page.getByText('Tenkeyless mechanical keyboard')).toBeVisible();

    // Add two to the cart.
    await page.getByRole('button', { name: 'Increase quantity' }).click();
    await page.getByRole('button', { name: /Add to cart/ }).click();
    await expect(page.getByTestId('cart-count')).toHaveText('2');

    // The cart survives a reload (localStorage) and shows the right totals.
    await page.goto('/cart');
    await expect(page.getByTestId('cart-line')).toHaveCount(1);
    await expect(page.getByTestId('line-total')).toHaveText('$258.00');
    await expect(page.getByTestId('cart-subtotal')).toHaveText('$258.00');

    await page.getByRole('button', { name: 'Increase quantity' }).click();
    await expect(page.getByTestId('cart-subtotal')).toHaveText('$387.00');

    await page.getByRole('button', { name: /^Remove / }).click();
    await expect(page.getByText('Your cart is empty')).toBeVisible();
  });

  test('a corrupted cart in localStorage becomes an empty cart', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ecom.cart.v1', '{"state":{"lines":"x"}'));
    await page.goto('/cart');
    await expect(page.getByText('Your cart is empty')).toBeVisible();
  });

  test('a cart line for a product that no longer exists is removed with a message', async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        'ecom.cart.v1',
        JSON.stringify({
          version: 1,
          state: {
            lines: [
              {
                productId: '0123456789abcdef01234567',
                quantity: 1,
                snapshot: {
                  name: 'Discontinued Lamp',
                  price: { amountMinor: 1000, currency: 'USD' },
                  image: null,
                },
              },
            ],
          },
        }),
      ),
    );
    await page.goto('/cart');
    await expect(page.getByTestId('cart-notices')).toContainText(
      'Discontinued Lamp is no longer available',
    );
    await expect(page.getByText('Your cart is empty')).toBeVisible();
  });

  test('an unknown product shows the not-found page', async ({ page }) => {
    await page.goto('/products/0123456789abcdef01234567');
    await expect(page.getByRole('heading', { name: 'Product not found' })).toBeVisible();
  });
});
