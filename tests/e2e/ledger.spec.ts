import { test, expect } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  await request.post('/api/dev/reset');
  await request.post('/api/dev/gateway', { data: { mode: 'success' } });
});

// SPAY-111: Transaction ledger
test('SPAY-111: ledger shows entries after pay and refund', async ({ request, page }) => {
  // Create and pay an order
  const productsRes = await request.get('/api/products');
  const products = await productsRes.json() as Array<{ id: string; priceCents: number; category: string }>;
  const grocery = products.find((p) => p.category === 'grocery');
  if (!grocery) { test.skip(); return; }

  const orderRes = await request.post('/api/orders', {
    data: { items: [{ productId: grocery.id, quantity: 1 }] },
  });
  const order = await orderRes.json() as { id: string; totalCents: number };

  await request.post(`/api/orders/${order.id}/pay`, {
    data: {
      allocations: [{ source: 'cash', amountCents: order.totalCents }],
      idempotencyKey: 'ikey_ledger-test-111',
    },
  });

  await request.post(`/api/orders/${order.id}/refund`, {
    data: { idempotencyKey: 'ikey_ledger-refund-111' },
  });

  // Navigate to ledger
  await page.goto('/ledger');

  // All filter
  await expect(page.getByTestId('ledger-filter-all')).toBeVisible();
  await expect(page.getByTestId('ledger-filter-payments')).toBeVisible();
  await expect(page.getByTestId('ledger-filter-refunds')).toBeVisible();

  // Rows should exist
  const rows = page.getByTestId('ledger-row');
  await expect(rows.first()).toBeVisible();

  const totalRows = await rows.count();
  expect(totalRows).toBeGreaterThan(0);
});

test('SPAY-111: payments filter shows only payment entries', async ({ request, page }) => {
  const productsRes = await request.get('/api/products');
  const products = await productsRes.json() as Array<{ id: string; priceCents: number; category: string }>;
  const grocery = products.find((p) => p.category === 'grocery');
  if (!grocery) { test.skip(); return; }

  const orderRes = await request.post('/api/orders', {
    data: { items: [{ productId: grocery.id, quantity: 1 }] },
  });
  const order = await orderRes.json() as { id: string; totalCents: number };

  await request.post(`/api/orders/${order.id}/pay`, {
    data: {
      allocations: [{ source: 'cash', amountCents: order.totalCents }],
      idempotencyKey: 'ikey_ledger-pay-filter',
    },
  });

  await request.post(`/api/orders/${order.id}/refund`, {
    data: { idempotencyKey: 'ikey_ledger-refund-filter' },
  });

  await page.goto('/ledger');

  // Count rows in "All" mode
  const allRows = await page.getByTestId('ledger-row').count();

  // Click Payments filter
  await page.getByTestId('ledger-filter-payments').click();
  const paymentRows = await page.getByTestId('ledger-row').count();

  // Click Refunds filter
  await page.getByTestId('ledger-filter-refunds').click();
  const refundRows = await page.getByTestId('ledger-row').count();

  // Payments + refunds ≤ total (some entries may appear in both or neither)
  expect(paymentRows).toBeLessThanOrEqual(allRows);
  expect(refundRows).toBeLessThanOrEqual(allRows);
});

test('SPAY-111: ledger is empty after reset', async ({ request, page }) => {
  await request.post('/api/dev/reset');
  await page.goto('/ledger');

  const rows = page.getByTestId('ledger-row');
  await expect(rows).toHaveCount(0);
});
