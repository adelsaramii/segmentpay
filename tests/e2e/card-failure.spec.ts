import { test, expect } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  await request.post('/api/dev/reset');
  await request.post('/api/dev/gateway', { data: { mode: 'success' } });
});

// SPAY-108: Card failure with wallet compensation
test('SPAY-108: card_declined shows failure screen and wallet is restored', async ({
  request,
  page,
}) => {
  // Set gateway to card_declined via QA controls
  await request.post('/api/dev/gateway', { data: { mode: 'card_declined' } });

  // Get initial wallet
  const walletBefore = await (await request.get('/api/wallet')).json() as { totalBalanceCents: number };

  // Find a grocery product
  const productsRes = await request.get('/api/products');
  const products = await productsRes.json() as Array<{ id: string; priceCents: number; category: string }>;
  const grocery = products.find((p) => p.category === 'grocery');
  if (!grocery) { test.skip(); return; }

  const orderRes = await request.post('/api/orders', {
    data: { items: [{ productId: grocery.id, quantity: 2 }] },
  });
  const order = await orderRes.json() as { id: string; totalCents: number };

  await page.goto(`/checkout/${order.id}`);
  await page.waitForTimeout(500);

  // Allocate everything to card
  const cardInput = page.getByTestId('checkout-allocation-card');
  await cardInput.fill((order.totalCents / 100).toFixed(2));
  await cardInput.blur();

  // Finalize
  const finalizeBtn = page.getByTestId('checkout-finalize-button');
  await expect(finalizeBtn).toBeEnabled({ timeout: 8000 });
  await finalizeBtn.click();

  // Should show failure screen
  await expect(page).toHaveURL(/\/payment-result\//);
  await expect(page.getByTestId('payment-result-failure')).toBeVisible();
  await expect(page.getByTestId('payment-result-error-code')).toBeVisible();

  // Wallet should be restored
  const walletAfter = await (await request.get('/api/wallet')).json() as { totalBalanceCents: number };
  expect(walletAfter.totalBalanceCents).toBe(walletBefore.totalBalanceCents);
});

test('SPAY-108: QA controls gateway select works', async ({ page }) => {
  await page.goto('/wallet');

  // Open QA controls
  const qaBtn = page.locator('button:has-text("کنترل‌های QA")');
  await qaBtn.click();

  // Gateway select should be visible
  const gatewaySelect = page.getByTestId('qa-gateway-select');
  await expect(gatewaySelect).toBeVisible();

  // Change to card_declined
  await gatewaySelect.selectOption('card_declined');

  // Verify the select reflects the change
  await expect(gatewaySelect).toHaveValue('card_declined');
});
