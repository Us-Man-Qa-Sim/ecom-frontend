import { expect, test } from '@playwright/test';
import { ADMIN, addProductToCart, field, fillAddress, login, newUser, register } from './helpers';

test.describe('admin', () => {
  test('create a product, sell it, ship and deliver it, then retire it (TST-5)', async ({
    page,
    browser,
  }) => {
    test.setTimeout(240_000);
    const name = `E2E Desk Lamp ${Date.now()}`;

    // ── Admin creates a product ──
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/admin');
    await expect(page.getByTestId('count-PENDING')).toBeVisible();

    await page.goto('/admin/products/new');
    await field(page, 'Name').fill(name);
    await field(page, 'Description').fill('A lamp created by the end-to-end test.');
    await field(page, 'Category').fill('home');
    await field(page, 'Price').fill('49.90');
    await field(page, 'Initial stock').fill('3');
    await page.getByRole('button', { name: 'Add attribute' }).click();
    await page.getByLabel('Attribute 1 name').fill('color');
    await page.getByLabel('Attribute 1 value').fill('black');
    await page.getByRole('button', { name: 'Create product' }).click();
    await expect(page).toHaveURL('/admin/products', { timeout: 30_000 });

    await page.goto(`/admin/products?search=${encodeURIComponent(name)}`);
    const row = page.getByTestId('admin-product-row').filter({ hasText: name });
    await expect(row.getByTestId('admin-stock')).toHaveText('3 / 0');

    // ── A customer sees it at once (ADM-8) and orders it ──
    const customerContext = await browser.newContext();
    const customer = await customerContext.newPage();
    await register(customer, newUser('buyer'));
    await addProductToCart(customer, name);
    await expect(customer.getByTestId('product-price').filter({ visible: true })).toHaveText(
      '$49.90',
    );
    await customer.goto('/checkout');
    await fillAddress(customer);
    await customer.getByRole('button', { name: 'Save and use this address' }).click();
    await customer.getByRole('button', { name: 'Place order' }).click();
    await expect(customer).toHaveURL(/\/orders\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    const status = customer.getByTestId('order-status').filter({ visible: true });
    await expect(status).toHaveAttribute('data-status', 'CONFIRMED', { timeout: 30_000 });
    const orderId = customer.url().split('/').pop()!;

    // ── Admin ships and delivers it ──
    await page.goto('/admin/orders?status=CONFIRMED');
    await expect(page.getByTestId('admin-order-row').first()).toBeVisible();
    await page.goto(`/admin/orders/${orderId}`);
    const adminStatus = page.getByTestId('order-status').filter({ visible: true });
    await expect(adminStatus).toHaveAttribute('data-status', 'CONFIRMED');
    await expect(page.getByRole('button', { name: 'Mark as delivered' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Mark as shipped' }).click();
    await expect(adminStatus).toHaveAttribute('data-status', 'SHIPPED');
    await expect(page.getByRole('button', { name: 'Cancel order' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Mark as delivered' }).click();
    await expect(adminStatus).toHaveAttribute('data-status', 'DELIVERED');
    await expect(page.getByRole('button', { name: /Mark as/ })).toHaveCount(0);

    // ── The customer sees DELIVERED ──
    await customer.reload();
    await expect(status).toHaveAttribute('data-status', 'DELIVERED');
    await customerContext.close();

    // ── Stock: the sale took one, the admin adds five ──
    await page.goto(`/admin/products?search=${encodeURIComponent(name)}`);
    await expect(row.getByTestId('admin-stock')).toHaveText('2 / 0');
    await row.getByRole('button', { name: `Actions for ${name}` }).click();
    await page.getByRole('menuitem', { name: 'Adjust stock' }).click();
    await page.getByLabel('Change by').fill('+5');
    await expect(page.getByTestId('stock-after')).toHaveText('7');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(row.getByTestId('admin-stock')).toHaveText('7 / 0');

    // ── Edit the price: the shop shows the new one right away ──
    await row.getByRole('link', { name }).click();
    await field(page, 'Price').fill('59.00');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page).toHaveURL('/admin/products', { timeout: 30_000 });
    await page.goto(`/products?search=${encodeURIComponent(name)}`);
    await expect(page.getByTestId('product-card').filter({ hasText: name })).toContainText(
      '$59.00',
    );

    // ── Delete with a typed confirmation: gone from the shop ──
    await page.goto(`/admin/products?search=${encodeURIComponent(name)}`);
    await row.getByRole('button', { name: `Actions for ${name}` }).click();
    await page.getByRole('menuitem', { name: 'Delete…' }).click();
    await expect(page.getByRole('button', { name: 'Delete for good' })).toBeDisabled();
    await page.getByLabel('Type the product name to confirm').fill(name);
    await page.getByRole('button', { name: 'Delete for good' }).click();
    await expect(row).toHaveCount(0);

    await page.goto(`/products?search=${encodeURIComponent(name)}`);
    // The search is fuzzy, so other products may match: only this one must be gone.
    await expect(page.getByRole('region', { name: 'Results' })).toContainText(
      /No products found|\d+ products?/,
    );
    await expect(page.getByTestId('product-card').filter({ hasText: name })).toHaveCount(0);
  });
});
