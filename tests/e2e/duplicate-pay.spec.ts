import { test, expect } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  await request.post('/api/dev/reset');
  await request.post('/api/dev/gateway', { data: { mode: 'success' } });
});

// SPAY-109: Idempotency and duplicate payment prevention
test('SPAY-109: replay with same idempotency key does not double-charge', async ({
  request,
  page,
}) => {
  // Create and pay an order
  const productsRes = await request.get('/api/products');
  const products = await productsRes.json() as Array<{ id: string; priceCents: number; category: string }>;
  const grocery = products.find((p) => p.category === 'grocery');
  if (!grocery) { test.skip(); return; }

  const orderRes = await request.post('/api/orders', {
    data: { items: [{ productId: grocery.id, quantity: 1 }] },
  });
  const order = await orderRes.json() as { id: string; totalCents: number };

  const ikey = 'ikey_test-idempotency-109';
  const allocations = [{ source: 'cash', amountCents: order.totalCents }];

  // First pay
  const pay1 = await request.post(`/api/orders/${order.id}/pay`, {
    data: { allocations, idempotencyKey: ikey },
  });
  expect(pay1.ok()).toBeTruthy();
  const pay1Body = await pay1.json() as { order: { status: string } };
  expect(pay1Body.order.status).toBe('paid');

  // Get wallet after first pay
  const walletAfterPay = await (await request.get('/api/wallet')).json() as { totalBalanceCents: number };

  // Replay with same key
  const pay2 = await request.post(`/api/orders/${order.id}/pay`, {
    data: { allocations, idempotencyKey: ikey },
  });
  // Should succeed (idempotent replay) or return success
  const pay2Body = await pay2.json() as { order?: { status: string }; error?: { code: string } };

  // Wallet should be unchanged
  const walletAfterReplay = await (await request.get('/api/wallet')).json() as { totalBalanceCents: number };
  expect(walletAfterReplay.totalBalanceCents).toBe(walletAfterPay.totalBalanceCents);

  // Try with a new key — should get ORDER_ALREADY_PAID
  const pay3 = await request.post(`/api/orders/${order.id}/pay`, {
    data: { allocations, idempotencyKey: 'ikey_different-key' },
  });
  expect(pay3.ok()).toBeFalsy();
  const pay3Body = await pay3.json() as { error: { code: string } };
  expect(pay3Body.error.code).toBe('ORDER_ALREADY_PAID');
});

test('SPAY-109: qa-replay-last-payment button is accessible', async ({ page }) => {
  await page.goto('/wallet');

  // Open QA controls
  await page.locator('button:has-text("کنترل‌های QA")').click();

  const replayBtn = page.getByTestId('qa-replay-last-payment');
  await expect(replayBtn).toBeVisible();
  await expect(replayBtn).toBeEnabled();
});
