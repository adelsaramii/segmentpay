import { test, expect } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  await request.post('/api/dev/reset');
  await request.post('/api/dev/gateway', { data: { mode: 'success' } });
});

// SPAY-110: Full refund restoring original allocations
test('SPAY-110: refund restores wallet and disables refund button', async ({ request, page }) => {
  // Create and pay an order
  const productsRes = await request.get('/api/products');
  const products = await productsRes.json() as Array<{ id: string; priceCents: number; category: string }>;
  const grocery = products.find((p) => p.category === 'grocery');
  if (!grocery) { test.skip(); return; }

  const orderRes = await request.post('/api/orders', {
    data: { items: [{ productId: grocery.id, quantity: 2 }] },
  });
  const order = await orderRes.json() as { id: string; totalCents: number };

  await request.post(`/api/orders/${order.id}/pay`, {
    data: {
      allocations: [{ source: 'cash', amountCents: order.totalCents }],
      idempotencyKey: 'ikey_refund-test-110',
    },
  });

  // Get wallet after pay
  const walletAfterPay = await (await request.get('/api/wallet')).json() as { totalBalanceCents: number };

  // Navigate to order detail
  await page.goto(`/orders/${order.id}`);

  // Status should be paid
  await expect(page.getByTestId('order-detail-status')).toContainText('پرداخت شده');

  // Refund button should be visible and enabled
  const refundBtn = page.getByTestId('order-detail-refund-button');
  await expect(refundBtn).toBeVisible();
  await expect(refundBtn).toBeEnabled();

  // Click refund
  await refundBtn.click();

  // Wait for status to update
  await expect(page.getByTestId('order-detail-status')).toContainText('بازگشت', { timeout: 8000 });

  // Refund button should now be disabled
  await expect(refundBtn).toBeDisabled();

  // Refund history should show an entry
  await expect(page.getByTestId('order-detail-refund-history')).toBeVisible();

  // Wallet should be restored
  const walletAfterRefund = await (await request.get('/api/wallet')).json() as { totalBalanceCents: number };
  expect(walletAfterRefund.totalBalanceCents).toBeGreaterThan(walletAfterPay.totalBalanceCents);
});

test('SPAY-110: refund button not shown on non-paid order', async ({ request, page }) => {
  const productsRes = await request.get('/api/products');
  const products = await productsRes.json() as Array<{ id: string; priceCents: number; category: string }>;
  const grocery = products.find((p) => p.category === 'grocery');
  if (!grocery) { test.skip(); return; }

  const orderRes = await request.post('/api/orders', {
    data: { items: [{ productId: grocery.id, quantity: 1 }] },
  });
  const order = await orderRes.json() as { id: string };

  await page.goto(`/orders/${order.id}`);

  // Order is pending_payment — refund button should be disabled
  const refundBtn = page.getByTestId('order-detail-refund-button');
  await expect(refundBtn).toBeDisabled();
});
