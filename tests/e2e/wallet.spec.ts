import { test, expect } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  await request.post('/api/dev/reset');
  await request.post('/api/dev/gateway', { data: { mode: 'success' } });
});

// SPAY-101: Wallet overview screen
test('SPAY-101: wallet total and four segments visible', async ({ page }) => {
  await page.goto('/wallet');

  // Total balance
  const total = page.getByTestId('wallet-total');
  await expect(total).toBeVisible();
  await expect(total).toHaveText(/€220\.00/);

  // Four segment cards
  await expect(page.getByTestId('wallet-segment-cash')).toBeVisible();
  await expect(page.getByTestId('wallet-segment-gift')).toBeVisible();
  await expect(page.getByTestId('wallet-segment-cashback')).toBeVisible();
  await expect(page.getByTestId('wallet-segment-corporate')).toBeVisible();

  // Seeded balances
  await expect(page.getByTestId('wallet-segment-cash')).toContainText('€120.00');
  await expect(page.getByTestId('wallet-segment-gift')).toContainText('€25.00');
  await expect(page.getByTestId('wallet-segment-cashback')).toContainText('€15.00');
  await expect(page.getByTestId('wallet-segment-corporate')).toContainText('€60.00');
});

// SPAY-102: Multi-segment balances with isolated accounting
test('SPAY-102: paying from cash only affects cash segment', async ({ request, page }) => {
  // Create an order with grocery item and pay with cash only
  const orderRes = await request.post('/api/orders', {
    data: { items: [{ productId: 'grocery-banana', quantity: 4 }] },
  });
  const order = await orderRes.json() as { id: string; totalCents: number };

  // Pay with cash only
  await request.post(`/api/orders/${order.id}/pay`, {
    data: {
      allocations: [{ source: 'cash', amountCents: order.totalCents }],
      idempotencyKey: `ikey_test-spay102`,
    },
  });

  // Check wallet
  await page.goto('/wallet');

  // Cash should have dropped
  const cashCard = page.getByTestId('wallet-segment-cash');
  await expect(cashCard).toBeVisible();
  // gift, cashback, corporate unchanged
  await expect(page.getByTestId('wallet-segment-gift')).toContainText('€25.00');
  await expect(page.getByTestId('wallet-segment-cashback')).toContainText('€15.00');
  await expect(page.getByTestId('wallet-segment-corporate')).toContainText('€60.00');

  // Cash should NOT show €120.00 anymore
  await expect(page.getByTestId('wallet-segment-cash')).not.toContainText('€120.00');
});
