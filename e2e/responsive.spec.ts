import { expect, test, type Page } from '@playwright/test';

// UX-2: the shop works at 360, 768 and 1280 px. Runs in the `mobile` project.

const WIDTHS = [360, 768, 1280] as const;

async function expectNoHorizontalScroll(page: Page, label: string) {
  await expect(page.locator('[aria-busy="true"]:visible')).toHaveCount(0);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `${label} scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(0);
}

test.describe('responsive layout', () => {
  test('no page scrolls sideways at 360, 768 or 1280 px', async ({ page }) => {
    await page.goto('/products');
    const productPath = await page
      .getByTestId('product-card')
      .first()
      .getByRole('link')
      .getAttribute('href');

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 });
      for (const path of ['/', '/products', productPath!, '/cart', '/login', '/register']) {
        await page.goto(path);
        await expectNoHorizontalScroll(page, `${path} at ${width}px`);
      }
    }
  });

  test('on a phone the filters and the navigation open in sheets', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/products');

    // The desktop sidebar and search are hidden; the sheet triggers are shown.
    await expect(page.getByRole('complementary', { name: 'Filters' })).toBeHidden();
    await page.getByRole('button', { name: 'Filters' }).click();
    const filters = page.getByRole('dialog', { name: 'Filters' });
    await expect(filters).toBeVisible();
    await filters.getByRole('button', { name: 'Books' }).click();
    await expect(filters).toBeHidden();
    await expect(page).toHaveURL('/products?category=books');
    await expect(page.getByTestId('result-count')).toContainText('in Books');

    await page.getByRole('button', { name: 'Open menu' }).click();
    const menu = page.getByRole('dialog', { name: 'Menu' });
    await menu.getByRole('searchbox', { name: 'Search products' }).fill('keyboard');
    await menu.getByRole('searchbox', { name: 'Search products' }).press('Enter');
    await expect(page).toHaveURL('/products?search=keyboard');
    await expect(menu).toBeHidden();

    // Two columns of cards on a phone.
    const cards = page.getByTestId('product-card');
    await expect(cards.first()).toBeVisible();
    const box = await cards.first().boundingBox();
    expect(box!.width).toBeLessThan(200);
  });

  test('touch targets in the header are at least 32 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/');
    for (const name of ['Open menu', 'Change theme', 'Cart']) {
      const box = await page.getByRole('button', { name, exact: true }).boundingBox();
      expect(Math.min(box!.width, box!.height), name).toBeGreaterThanOrEqual(32);
    }
  });
});
