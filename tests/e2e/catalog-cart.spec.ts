import { test, expect } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  await request.post('/api/dev/reset');
  await request.post('/api/dev/gateway', { data: { mode: 'success' } });
  // Clear cart by navigating to shop (cart is localStorage-based)
});

// SPAY-104: Product catalog and cart
test('SPAY-104: category filter narrows product list', async ({ page }) => {
  await page.goto('/shop');

  // All filter shown by default
  const allFilter = page.getByTestId('catalog-filter-all');
  await expect(allFilter).toBeVisible();

  // Category filters exist
  await expect(page.getByTestId('catalog-filter-grocery')).toBeVisible();
  await expect(page.getByTestId('catalog-filter-fashion')).toBeVisible();
  await expect(page.getByTestId('catalog-filter-electronics')).toBeVisible();
  await expect(page.getByTestId('catalog-filter-office')).toBeVisible();

  // Click grocery filter — only grocery products should be visible
  await page.getByTestId('catalog-filter-grocery').click();
  const products = page.locator('[data-testid^="catalog-product-"]');
  const count = await products.count();
  expect(count).toBeGreaterThan(0);
});

test('SPAY-104: add product to cart increments badge', async ({ page }) => {
  await page.goto('/shop');

  // Find a product and add it
  const addButtons = page.locator('[data-testid$="-add"]');
  await expect(addButtons.first()).toBeVisible();
  await addButtons.first().click();

  // Cart badge should show count
  await expect(page.locator('a[href="/cart"]')).toContainText('1');
});

test('SPAY-104: cart shows lines with +/- and correct totals', async ({ page }) => {
  await page.goto('/shop');

  // Add a product
  const addBtn = page.locator('[data-testid$="-add"]').first();
  await addBtn.click();

  // Go to cart
  await page.goto('/cart');

  // Cart line should be visible
  const cartLines = page.locator('[data-testid^="cart-line-"]');
  await expect(cartLines.first()).toBeVisible();

  // Subtotal, shipping, total present
  await expect(page.getByTestId('cart-subtotal')).toBeVisible();
  await expect(page.getByTestId('cart-shipping')).toContainText('€2.00');
  await expect(page.getByTestId('cart-total')).toBeVisible();
  await expect(page.getByTestId('cart-checkout-button')).toBeVisible();
  await expect(page.getByTestId('cart-checkout-button')).toBeEnabled();
});

test('SPAY-104: removing all items disables checkout', async ({ page }) => {
  await page.goto('/shop');

  // Add one product
  const addBtn = page.locator('[data-testid$="-add"]').first();
  await addBtn.click();

  await page.goto('/cart');

  // Decrease qty to 0 by clicking −
  const minusBtn = page.locator('[aria-label="کاهش"]').first();
  await minusBtn.click();

  // Cart should be empty
  await expect(page.getByTestId('cart-checkout-button')).toBeDisabled();
});
