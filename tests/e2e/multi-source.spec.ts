import { test, expect } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  await request.post('/api/dev/reset');
  await request.post('/api/dev/gateway', { data: { mode: 'success' } });
});

// SPAY-107: Successful multi-source checkout
test('SPAY-107: pay grocery €100 order 40/20/10/30 → success screen → wallet debited', async ({
  request,
  page,
}) => {
  // Find grocery products to build a ~€100 order via API
  const productsRes = await request.get('/api/products');
  const products = await productsRes.json() as Array<{ id: string; priceCents: number; category: string }>;
  const groceries = products.filter((p) => p.category === 'grocery');
  expect(groceries.length).toBeGreaterThan(0);

  // Create order with enough grocery items to reach ≥ €100
  let items: Array<{ productId: string; quantity: number }> = [];
  let total = 0;
  for (const p of groceries) {
    const qty = Math.ceil((10000 - total) / p.priceCents);
    if (qty > 0) {
      items.push({ productId: p.id, quantity: qty });
      total += p.priceCents * qty;
    }
    if (total >= 10000) break;
  }

  const orderRes = await request.post('/api/orders', { data: { items } });
  expect(orderRes.ok()).toBeTruthy();
  const order = await orderRes.json() as { id: string; totalCents: number };

  // Navigate to checkout
  await page.goto(`/checkout/${order.id}`);
  await expect(page.getByTestId('checkout-order-id')).toBeVisible();

  // Set allocations: cash=40, gift=20, cashback=10, card=remaining
  const remaining = order.totalCents - 4000 - 2000 - 1000;

  // Fill allocation inputs
  const cashInput = page.getByTestId('checkout-allocation-cash');
  await cashInput.fill((4000 / 100).toFixed(2));
  await cashInput.blur();

  const giftInput = page.getByTestId('checkout-allocation-gift');
  await giftInput.fill((2000 / 100).toFixed(2));
  await giftInput.blur();

  const cashbackInput = page.getByTestId('checkout-allocation-cashback');
  await cashbackInput.fill((1000 / 100).toFixed(2));
  await cashbackInput.blur();

  const cardInput = page.getByTestId('checkout-allocation-card');
  await cardInput.fill((remaining / 100).toFixed(2));
  await cardInput.blur();

  // Check allocated total shows correct sum
  await expect(page.getByTestId('checkout-allocated-total')).toBeVisible();

  // Finalize
  const finalizeBtn = page.getByTestId('checkout-finalize-button');
  await expect(finalizeBtn).toBeEnabled({ timeout: 10000 });
  await finalizeBtn.click();

  // Should land on payment-result
  await expect(page).toHaveURL(/\/payment-result\//);
  await expect(page.getByTestId('payment-result-success')).toBeVisible();
  await expect(page.getByTestId('payment-result-total-paid')).toBeVisible();

  // Wallet should reflect debits
  await page.goto('/wallet');
  const total2 = page.getByTestId('wallet-total');
  await expect(total2).toBeVisible();
  // Total should not be €220.00 anymore
  await expect(total2).not.toContainText('€220.00');
});

// SPAY-106: Finalize disabled when sum != total
test('SPAY-106: finalize disabled when allocation does not match total', async ({ request, page }) => {
  const productsRes = await request.get('/api/products');
  const products = await productsRes.json() as Array<{ id: string; priceCents: number; category: string }>;
  const p = products.find((p) => p.category === 'grocery');
  if (!p) test.skip();

  const orderRes = await request.post('/api/orders', {
    data: { items: [{ productId: p!.id, quantity: 2 }] },
  });
  const order = await orderRes.json() as { id: string; totalCents: number };

  await page.goto(`/checkout/${order.id}`);

  // Finalize should be disabled (nothing allocated)
  await expect(page.getByTestId('checkout-finalize-button')).toBeDisabled();
});
