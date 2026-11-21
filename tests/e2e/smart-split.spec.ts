import { test, expect } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  await request.post('/api/dev/reset');
  await request.post('/api/dev/gateway', { data: { mode: 'success' } });
});

function allocationSum(allocations: Record<string, number>) {
  return Object.values(allocations).reduce((a, b) => a + b, 0);
}

async function readAllocations(page: import('@playwright/test').Page) {
  const sources = ['cash', 'gift', 'cashback', 'corporate', 'card'];
  const entries = await Promise.all(
    sources.map(async (s) => {
      const value = await page.getByTestId(`checkout-allocation-${s}`).inputValue();
      return [s, Math.round(parseFloat(value) * 100)] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<string, number>;
}

// SPAY-113 / AC-1: fills exactly to total on a grocery order with full wallet
test('SPAY-113 AC-1: Smart Split fills the full total and enables finalize', async ({ request, page }) => {
  const orderRes = await request.post('/api/orders', {
    data: { items: [{ productId: 'grocery-banana', quantity: 12 }] },
  });
  const order = await orderRes.json() as { id: string; totalCents: number };

  await page.goto(`/checkout/${order.id}`);
  await expect(page.getByTestId('checkout-smart-split-button')).toBeEnabled({ timeout: 5000 });

  await page.getByTestId('checkout-smart-split-button').click();

  await expect(page.getByTestId('checkout-finalize-button')).toBeEnabled({ timeout: 500 });
  const allocations = await readAllocations(page);
  expect(allocationSum(allocations)).toBe(order.totalCents);
});

// SPAY-113 / AC-2: respects eligibility — locked segments stay at 0
test('SPAY-113 AC-2: Smart Split respects eligibility on an electronics order', async ({ request, page }) => {
  const orderRes = await request.post('/api/orders', {
    data: { items: [{ productId: 'electronics-headphones', quantity: 1 }] },
  });
  const order = await orderRes.json() as { id: string; totalCents: number };

  await page.goto(`/checkout/${order.id}`);
  await expect(page.getByTestId('checkout-smart-split-button')).toBeEnabled({ timeout: 5000 });
  await page.getByTestId('checkout-smart-split-button').click();
  await page.waitForTimeout(400); // staggered writes (60ms x 5 sources)

  const allocations = await readAllocations(page);
  expect(allocations.cashback).toBe(0);
  expect(allocations.corporate).toBe(0);
  expect(allocationSum(allocations)).toBe(order.totalCents);
});

// SPAY-113 / AC-3: falls back to an all-card allocation when every wallet segment is empty
test('SPAY-113 AC-3: Smart Split falls back to card when the wallet is empty', async ({ request, page }) => {
  // Drain cash + gift + cashback with one grocery order sized to exhaust all three.
  const drain1 = await request.post('/api/orders', {
    data: { items: [{ productId: 'grocery-fruitpack', quantity: 7 }] },
  });
  const order1 = await drain1.json() as { id: string; totalCents: number };
  await request.post(`/api/orders/${order1.id}/pay`, {
    data: {
      allocations: [
        { source: 'cash', amountCents: 12000 },
        { source: 'gift', amountCents: 2500 },
        { source: 'cashback', amountCents: 1500 },
        { source: 'card', amountCents: order1.totalCents - 12000 - 2500 - 1500 },
      ],
      idempotencyKey: 'e2e-drain-cash-gift-cashback',
    },
  });

  // Drain corporate with an office order sized to exhaust it.
  const drain2 = await request.post('/api/orders', {
    data: { items: [{ productId: 'office-notebook', quantity: 14 }] },
  });
  const order2 = await drain2.json() as { id: string; totalCents: number };
  await request.post(`/api/orders/${order2.id}/pay`, {
    data: {
      allocations: [
        { source: 'corporate', amountCents: 6000 },
        { source: 'card', amountCents: order2.totalCents - 6000 },
      ],
      idempotencyKey: 'e2e-drain-corporate',
    },
  });

  const walletRes = await request.get('/api/wallet');
  const wallet = await walletRes.json() as { totalBalanceCents: number };
  expect(wallet.totalBalanceCents).toBe(0);

  // Now a fresh small order should Smart Split entirely onto card.
  const orderRes = await request.post('/api/orders', {
    data: { items: [{ productId: 'grocery-banana', quantity: 1 }] },
  });
  const order = await orderRes.json() as { id: string; totalCents: number };

  await page.goto(`/checkout/${order.id}`);
  await expect(page.getByTestId('checkout-smart-split-button')).toBeEnabled({ timeout: 5000 });
  await page.getByTestId('checkout-smart-split-button').click();
  await page.waitForTimeout(400);

  const allocations = await readAllocations(page);
  expect(allocations).toEqual({ cash: 0, gift: 0, cashback: 0, corporate: 0, card: order.totalCents });
});

// SPAY-113 / AC-4: disabled with a complete pill once already fully allocated
test('SPAY-113 AC-4: Smart Split button disables once allocation already matches the total', async ({ request, page }) => {
  const orderRes = await request.post('/api/orders', {
    data: { items: [{ productId: 'grocery-banana', quantity: 2 }] },
  });
  const order = await orderRes.json() as { id: string; totalCents: number };

  await page.goto(`/checkout/${order.id}`);
  await expect(page.getByTestId('checkout-smart-split-button')).toBeEnabled({ timeout: 5000 });

  const cardInput = page.getByTestId('checkout-allocation-card');
  await cardInput.fill((order.totalCents / 100).toFixed(2));
  await cardInput.blur();

  await expect(page.getByTestId('checkout-smart-split-button')).toBeDisabled();
  await expect(page.getByTestId('checkout-smart-split-complete')).toBeVisible();
});

// SPAY-113 / AC-5: idempotent — a second click (while disabled) never changes the allocation
test('SPAY-113 AC-5: clicking Smart Split again does not change the allocation', async ({ request, page }) => {
  const orderRes = await request.post('/api/orders', {
    data: { items: [{ productId: 'grocery-banana', quantity: 12 }] },
  });
  const order = await orderRes.json() as { id: string; totalCents: number };

  await page.goto(`/checkout/${order.id}`);
  await expect(page.getByTestId('checkout-smart-split-button')).toBeEnabled({ timeout: 5000 });
  await page.getByTestId('checkout-smart-split-button').click();
  await expect(page.getByTestId('checkout-finalize-button')).toBeEnabled({ timeout: 500 });

  const before = await readAllocations(page);

  // The button is disabled and visually collapsed now (zero area, pointer-events-none) —
  // a real click is physically impossible. Dispatch the click event directly to exercise
  // the handler's own idempotency guard rather than the browser's hit-testing.
  await expect(page.getByTestId('checkout-smart-split-button')).toBeDisabled();
  await page.getByTestId('checkout-smart-split-button').dispatchEvent('click');
  await page.waitForTimeout(200);

  const after = await readAllocations(page);
  expect(after).toEqual(before);
});
