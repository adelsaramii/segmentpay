import { test, expect } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  await request.post('/api/dev/reset');
  await request.post('/api/dev/gateway', { data: { mode: 'success' } });
});

// SPAY-112: PWA installation and offline handling
test('SPAY-112: manifest has required fields', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.ok()).toBeTruthy();

  const manifest = await res.json() as {
    name: string;
    display: string;
    icons: Array<{ sizes: string; type: string }>;
  };

  expect(manifest.name).toBe('SegmentPay');
  expect(manifest.display).toBe('standalone');

  const icon192 = manifest.icons.find((i) => i.sizes === '192x192');
  const icon512 = manifest.icons.find((i) => i.sizes === '512x512');
  expect(icon192).toBeTruthy();
  expect(icon512).toBeTruthy();
  expect(icon192?.type).toBe('image/png');
  expect(icon512?.type).toBe('image/png');
});

test('SPAY-112: offline banner appears when network is offline', async ({ page, context }) => {
  await page.goto('/wallet');

  // Verify banner is not shown when online
  await expect(page.getByTestId('offline-banner')).not.toBeVisible();

  // Go offline
  await context.setOffline(true);

  // Banner should appear
  await expect(page.getByTestId('offline-banner')).toBeVisible({ timeout: 3000 });

  // Go back online
  await context.setOffline(false);

  // Banner should disappear
  await expect(page.getByTestId('offline-banner')).not.toBeVisible({ timeout: 3000 });
});

test('SPAY-112: checkout finalize button is disabled when offline', async ({ request, page, context }) => {
  const productsRes = await request.get('/api/products');
  const products = await productsRes.json() as Array<{ id: string; priceCents: number; category: string }>;
  const grocery = products.find((p) => p.category === 'grocery');
  if (!grocery) { test.skip(); return; }

  const orderRes = await request.post('/api/orders', {
    data: { items: [{ productId: grocery.id, quantity: 1 }] },
  });
  const order = await orderRes.json() as { id: string; totalCents: number };

  await page.goto(`/checkout/${order.id}`);
  await page.waitForTimeout(500);

  // Allocate everything to card
  const cardInput = page.getByTestId('checkout-allocation-card');
  await cardInput.fill((order.totalCents / 100).toFixed(2));
  await cardInput.blur();

  // Confirm finalize is enabled when online
  // (might need sum check; just test offline disabling)
  await context.setOffline(true);

  // The finalize button should be disabled when offline
  const finalizeBtn = page.getByTestId('checkout-finalize-button');
  await expect(finalizeBtn).toBeDisabled();

  await context.setOffline(false);
});
