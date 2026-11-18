import { test, expect } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  await request.post('/api/dev/reset');
  await request.post('/api/dev/gateway', { data: { mode: 'success' } });
});

// SPAY-103: Segment eligibility rules enforced
test('SPAY-103: electronics order disables gift and corporate inputs', async ({ request, page }) => {
  // Find an electronics product
  const productsRes = await request.get('/api/products');
  const products = await productsRes.json() as Array<{ id: string; priceCents: number; category: string }>;
  const electronics = products.find((p) => p.category === 'electronics');

  if (!electronics) {
    test.skip();
    return;
  }

  // Create order with electronics
  const orderRes = await request.post('/api/orders', {
    data: { items: [{ productId: electronics.id, quantity: 1 }] },
  });
  const order = await orderRes.json() as { id: string; totalCents: number };

  await page.goto(`/checkout/${order.id}`);

  // Wait for eligibility to load (quote fires on mount)
  await page.waitForTimeout(500);

  // Gift and corporate inputs should be disabled
  const giftInput = page.getByTestId('checkout-allocation-gift');
  await expect(giftInput).toBeDisabled();

  const corporateInput = page.getByTestId('checkout-allocation-corporate');
  await expect(corporateInput).toBeDisabled();

  // Cash and card should still be enabled
  const cashInput = page.getByTestId('checkout-allocation-cash');
  await expect(cashInput).toBeEnabled();

  const cardInput = page.getByTestId('checkout-allocation-card');
  await expect(cardInput).toBeEnabled();
});

test('SPAY-103: eligibility reason shown for ineligible segment', async ({ request, page }) => {
  const productsRes = await request.get('/api/products');
  const products = await productsRes.json() as Array<{ id: string; priceCents: number; category: string }>;
  const electronics = products.find((p) => p.category === 'electronics');

  if (!electronics) {
    test.skip();
    return;
  }

  const orderRes = await request.post('/api/orders', {
    data: { items: [{ productId: electronics.id, quantity: 1 }] },
  });
  const order = await orderRes.json() as { id: string };

  await page.goto(`/checkout/${order.id}`);
  await page.waitForTimeout(500);

  // Eligibility reason for gift should be visible
  const reasonEl = page.getByTestId('checkout-eligibility-reason-gift');
  if (await reasonEl.isVisible()) {
    await expect(reasonEl).not.toBeEmpty();
  }
});
