import { expect, test } from '@playwright/test';
import { addProductToCart, fillAddress, newUser, register, waitForEmail } from './helpers';

test.describe('checkout and orders', () => {
  test('happy path: guest cart → register → checkout → order is confirmed → email (E2E-1)', async ({
    page,
  }) => {
    const user = newUser('happy');

    // A guest fills the cart, then is asked to log in at checkout. The cart is kept.
    await addProductToCart(page, 'French Press — 1L', 2);
    await page.goto('/cart');
    await page.getByRole('link', { name: 'Continue to checkout' }).click();
    await expect(page).toHaveURL('/login?next=%2Fcheckout');
    await register(page, user, '/checkout');
    await expect(page).toHaveURL('/checkout');

    // No address yet: the form is shown inline.
    await expect(page.getByText('Add your shipping address')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Place order' })).toBeDisabled();
    await fillAddress(page);
    await page.getByRole('button', { name: 'Save and use this address' }).click();
    await expect(page.getByRole('radio')).toBeChecked();

    const total = await page.getByTestId('checkout-total').innerText();
    await page.getByRole('button', { name: 'Place order' }).click();

    // 201 → order page, status goes PENDING → CONFIRMED without a reload.
    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/);
    await expect(page.getByTestId('order-status').filter({ visible: true })).toHaveAttribute('data-status', 'CONFIRMED', {
      timeout: 30_000,
    });
    await expect(page.getByTestId('order-total')).toHaveText(total);
    await expect(page.getByTestId('order-item')).toContainText('French Press — 1L');
    await expect(page.getByText('221B Baker Street').filter({ visible: true })).toBeVisible();

    // The cart was cleared after the 201.
    await expect(page.getByTestId('cart-count')).toHaveCount(0);

    // The Kafka flow reached notification-service.
    await waitForEmail(user.email, /order/i);

    // The order is in the list, and it can be cancelled while CONFIRMED.
    await page.getByRole('link', { name: 'All orders' }).click();
    await expect(page.getByTestId('order-row')).toHaveCount(1);
    await page.getByTestId('order-row').getByRole('link').click();
    await page.getByRole('button', { name: 'Cancel order' }).click();
    await page.getByLabel('Reason (optional)').fill('Changed my mind');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel order' }).click();
    await expect(page.getByTestId('order-status').filter({ visible: true })).toHaveAttribute('data-status', 'CANCELLED');
    await expect(page.getByRole('button', { name: 'Cancel order' })).toHaveCount(0);
  });

  test('failure path: ordering more than the stock ends as CANCELLED (E2E-2)', async ({ page }) => {
    await register(page, newUser('nostock'));

    // The UI clamps quantities to the stock it knows, so make it believe there is plenty.
    await page.route('**/api/cart/refresh', async (route) => {
      const response = await route.fetch();
      const body = (await response.json()) as {
        products: Record<string, { available: number } | null>;
      };
      for (const product of Object.values(body.products)) {
        if (product) product.available = 10_000;
      }
      await route.fulfill({ response, json: body });
    });

    await addProductToCart(page, 'Linen Throw Blanket');
    await page.goto('/cart');
    await page.getByRole('spinbutton', { name: /Quantity of/ }).fill('9999');
    await page.getByRole('link', { name: 'Continue to checkout' }).click();
    await fillAddress(page);
    await page.getByRole('button', { name: 'Save and use this address' }).click();
    await page.getByRole('button', { name: 'Place order' }).click();

    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/);
    await expect(page.getByTestId('order-status').filter({ visible: true })).toHaveAttribute('data-status', 'CANCELLED', {
      timeout: 30_000,
    });
    await expect(page.getByText(/This order was cancelled/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to your cart' })).toBeVisible();
  });

  test("another user's order is not found", async ({ page }) => {
    await register(page, newUser('other'));
    await page.goto('/orders/9b2c7d10-1a2b-4c3d-8e4f-5a6b7c8d9e0f');
    await expect(page.getByRole('heading', { name: 'Order not found' })).toBeVisible();
  });
});
