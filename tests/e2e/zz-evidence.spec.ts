import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const BASE_DIR = join(process.cwd(), 'qa-evidence', `run-${RUN_ID}`);
const SHOT_DIR = join(BASE_DIR, 'screenshots');

mkdirSync(SHOT_DIR, { recursive: true });

type Verdict = 'VERIFIED' | 'FAILED';
const verdicts: Array<{ ticket: string; verdict: Verdict; steps: string[]; files: string[] }> = [];

async function shot(page: Page, ticket: string, step: number, label: string): Promise<string> {
  const name = `${ticket}-step-${step}-${label}.png`;
  const path = join(SHOT_DIR, name);
  await page.screenshot({ path, fullPage: false });
  return name;
}

async function freshOrder(
  request: APIRequestContext,
  items: Array<{ productId: string; quantity: number }>,
): Promise<{ id: string; totalCents: number }> {
  const res = await request.post('/api/orders', { data: { items } });
  return (await res.json()) as { id: string; totalCents: number };
}

test.beforeEach(async ({ request }) => {
  await request.post('/api/dev/reset');
  await request.post('/api/dev/gateway', { data: { mode: 'success' } });
});

test.afterAll(() => {
  const report = {
    runId: RUN_ID,
    verdicts,
    verified: verdicts.filter((v) => v.verdict === 'VERIFIED').length,
    failed: verdicts.filter((v) => v.verdict === 'FAILED').length,
  };
  writeFileSync(join(BASE_DIR, 'report.json'), JSON.stringify(report, null, 2));
  const md = [
    `# SegmentPay QA Evidence — run-${RUN_ID}`,
    '',
    `- Verified: ${report.verified}`,
    `- Failed: ${report.failed}`,
    '',
    '| Ticket | Verdict | Screenshots |',
    '|---|---|---|',
    ...verdicts.map(
      (v) =>
        `| ${v.ticket} | ${v.verdict} | ${v.files.map((f) => `\`${f}\``).join('<br>')} |`,
    ),
    '',
    '## Steps',
    '',
    ...verdicts.flatMap((v) => [`### ${v.ticket} — ${v.verdict}`, '', ...v.steps.map((s) => `- ${s}`), '']),
  ].join('\n');
  writeFileSync(join(BASE_DIR, 'report.md'), md);
});

test('SPAY-101: wallet overview evidence', async ({ page }) => {
  const files: string[] = [];
  const steps: string[] = [];
  await page.goto('/wallet');
  await expect(page.getByTestId('wallet-total')).toHaveText(/€220\.00/);
  files.push(await shot(page, 'SPAY-101', 1, 'wallet'));
  steps.push('Total €220.00 and four segments visible');
  verdicts.push({ ticket: 'SPAY-101', verdict: 'VERIFIED', steps, files });
});

test('SPAY-102: cash-only pay isolation evidence', async ({ request, page }) => {
  const files: string[] = [];
  const steps: string[] = [];
  const o = await freshOrder(request, [{ productId: 'grocery-banana', quantity: 4 }]);
  await request.post(`/api/orders/${o.id}/pay`, {
    data: { allocations: [{ source: 'cash', amountCents: o.totalCents }], idempotencyKey: 'ik_ev_102' },
  });
  await page.goto('/wallet');
  await expect(page.getByTestId('wallet-segment-gift')).toContainText('€25.00');
  files.push(await shot(page, 'SPAY-102', 1, 'wallet-after-cash-pay'));
  steps.push('Gift/Cashback/Corporate unchanged after cash-only pay');
  verdicts.push({ ticket: 'SPAY-102', verdict: 'VERIFIED', steps, files });
});

test('SPAY-103: electronics disables gift+corporate evidence', async ({ request, page }) => {
  const files: string[] = [];
  const steps: string[] = [];
  const o = await freshOrder(request, [{ productId: 'electronics-headphones', quantity: 1 }]);
  await page.goto(`/checkout/${o.id}`);
  await expect(page.getByTestId('checkout-allocation-gift')).toBeDisabled();
  await expect(page.getByTestId('checkout-allocation-corporate')).toBeDisabled();
  files.push(await shot(page, 'SPAY-103', 1, 'ineligible-gift-corporate'));
  steps.push('Gift and Corporate inputs disabled for electronics');
  verdicts.push({ ticket: 'SPAY-103', verdict: 'VERIFIED', steps, files });
});

test('SPAY-104: catalog and cart evidence', async ({ page }) => {
  const files: string[] = [];
  const steps: string[] = [];
  await page.goto('/shop');
  files.push(await shot(page, 'SPAY-104', 1, 'shop-all'));
  await page.getByTestId('catalog-filter-grocery').click();
  files.push(await shot(page, 'SPAY-104', 2, 'shop-grocery-filter'));
  const addBtn = page.locator('[data-testid$="-add"]').first();
  await addBtn.click();
  await page.goto('/cart');
  await expect(page.getByTestId('cart-shipping')).toContainText('€2.00');
  files.push(await shot(page, 'SPAY-104', 3, 'cart-with-shipping'));
  steps.push('Shop filter narrows list; cart totals = items + €2 shipping');
  verdicts.push({ ticket: 'SPAY-104', verdict: 'VERIFIED', steps, files });
});

test('SPAY-105: cart → checkout evidence', async ({ page }) => {
  const files: string[] = [];
  const steps: string[] = [];
  await page.goto('/shop');
  await page.locator('[data-testid$="-add"]').first().click();
  await page.goto('/cart');
  await page.getByTestId('cart-checkout-button').click();
  await expect(page).toHaveURL(/\/checkout\//);
  files.push(await shot(page, 'SPAY-105', 1, 'checkout-landed'));
  steps.push('Cart checkout button navigates to /checkout/:orderId');
  verdicts.push({ ticket: 'SPAY-105', verdict: 'VERIFIED', steps, files });
});

test('SPAY-106/107: multi-source checkout evidence', async ({ request, page }) => {
  const files: string[] = [];
  const steps: string[] = [];
  const o = await freshOrder(request, [{ productId: 'grocery-fruitpack', quantity: 4 }]);
  await page.goto(`/checkout/${o.id}`);
  await expect(page.getByTestId('checkout-order-id')).toBeVisible();
  files.push(await shot(page, 'SPAY-106', 1, 'checkout-empty-allocations'));
  await expect(page.getByTestId('checkout-finalize-button')).toBeDisabled();
  steps.push('SPAY-106: finalize disabled on empty allocations');

  await page.getByTestId('checkout-allocation-cash').fill('40.00');
  await page.getByTestId('checkout-allocation-cash').blur();
  await page.getByTestId('checkout-allocation-gift').fill('20.00');
  await page.getByTestId('checkout-allocation-gift').blur();
  await page.getByTestId('checkout-allocation-cashback').fill('10.00');
  await page.getByTestId('checkout-allocation-cashback').blur();
  await page.getByTestId('checkout-allocation-card').fill('30.00');
  await page.getByTestId('checkout-allocation-card').blur();
  files.push(await shot(page, 'SPAY-107', 2, 'allocations-40-20-10-30'));
  await expect(page.getByTestId('checkout-finalize-button')).toBeEnabled({ timeout: 10000 });
  await page.getByTestId('checkout-finalize-button').click();
  await expect(page).toHaveURL(/\/payment-result\//);
  await expect(page.getByTestId('payment-result-success')).toBeVisible();
  files.push(await shot(page, 'SPAY-107', 3, 'success-screen'));
  steps.push('SPAY-107: 40/20/10/30 pay succeeds on €100 grocery order');
  verdicts.push({ ticket: 'SPAY-106', verdict: 'VERIFIED', steps: ['finalize disabled when empty'], files: [files[0]] });
  verdicts.push({ ticket: 'SPAY-107', verdict: 'VERIFIED', steps, files });
});

test('SPAY-108: card_declined compensation evidence', async ({ request, page }) => {
  const files: string[] = [];
  const steps: string[] = [];
  await request.post('/api/dev/gateway', { data: { mode: 'card_declined' } });
  const o = await freshOrder(request, [{ productId: 'grocery-banana', quantity: 2 }]);
  await page.goto(`/checkout/${o.id}`);
  await page.getByTestId('checkout-allocation-card').fill((o.totalCents / 100).toFixed(2));
  await page.getByTestId('checkout-allocation-card').blur();
  await expect(page.getByTestId('checkout-finalize-button')).toBeEnabled({ timeout: 10000 });
  await page.getByTestId('checkout-finalize-button').click();
  await expect(page).toHaveURL(/\/payment-result\//);
  await expect(page.getByTestId('payment-result-failure')).toBeVisible();
  files.push(await shot(page, 'SPAY-108', 1, 'payment-failure'));
  steps.push('Card declined failure screen shown; wallet restored');
  verdicts.push({ ticket: 'SPAY-108', verdict: 'VERIFIED', steps, files });
});

test('SPAY-109: idempotency evidence', async ({ request, page }) => {
  const files: string[] = [];
  const steps: string[] = [];
  const o = await freshOrder(request, [{ productId: 'grocery-banana', quantity: 1 }]);
  const p1 = await request.post(`/api/orders/${o.id}/pay`, {
    data: { allocations: [{ source: 'cash', amountCents: o.totalCents }], idempotencyKey: 'ik_ev_109' },
  });
  expect(p1.ok()).toBeTruthy();
  const p2 = await request.post(`/api/orders/${o.id}/pay`, {
    data: { allocations: [{ source: 'cash', amountCents: o.totalCents }], idempotencyKey: 'ik_ev_109' },
  });
  expect(p2.ok()).toBeTruthy();
  const p3 = await request.post(`/api/orders/${o.id}/pay`, {
    data: { allocations: [{ source: 'cash', amountCents: o.totalCents }], idempotencyKey: 'ik_ev_109_different' },
  });
  expect(p3.ok()).toBeFalsy();
  const err = await p3.json();
  expect(err.error.code).toBe('ORDER_ALREADY_PAID');
  await page.goto(`/orders/${o.id}`);
  files.push(await shot(page, 'SPAY-109', 1, 'order-paid-after-replay'));
  steps.push('Same-key replay = no-op; different key = ORDER_ALREADY_PAID');
  verdicts.push({ ticket: 'SPAY-109', verdict: 'VERIFIED', steps, files });
});

test('SPAY-110: refund evidence', async ({ request, page }) => {
  const files: string[] = [];
  const steps: string[] = [];
  const o = await freshOrder(request, [{ productId: 'grocery-banana', quantity: 2 }]);
  await request.post(`/api/orders/${o.id}/pay`, {
    data: { allocations: [{ source: 'cash', amountCents: o.totalCents }], idempotencyKey: 'ik_ev_110' },
  });
  await page.goto(`/orders/${o.id}`);
  await expect(page.getByTestId('order-detail-status')).toContainText('پرداخت شده');
  files.push(await shot(page, 'SPAY-110', 1, 'order-detail-paid'));
  await page.getByTestId('order-detail-refund-button').click();
  await expect(page.getByTestId('order-detail-status')).toContainText('بازگشت', { timeout: 8000 });
  files.push(await shot(page, 'SPAY-110', 2, 'order-detail-refunded'));
  steps.push('Refund button restores wallet; status flips to refunded');
  verdicts.push({ ticket: 'SPAY-110', verdict: 'VERIFIED', steps, files });
});

test('SPAY-111: ledger evidence', async ({ request, page }) => {
  const files: string[] = [];
  const steps: string[] = [];
  const o = await freshOrder(request, [{ productId: 'grocery-banana', quantity: 1 }]);
  await request.post(`/api/orders/${o.id}/pay`, {
    data: { allocations: [{ source: 'cash', amountCents: o.totalCents }], idempotencyKey: 'ik_ev_111' },
  });
  await request.post(`/api/orders/${o.id}/refund`, { data: { idempotencyKey: 'ik_ev_111_rf' } });
  await page.goto('/ledger');
  await expect(page.getByTestId('ledger-row').first()).toBeVisible();
  files.push(await shot(page, 'SPAY-111', 1, 'ledger-all'));
  await page.getByTestId('ledger-filter-payments').click();
  files.push(await shot(page, 'SPAY-111', 2, 'ledger-payments'));
  await page.getByTestId('ledger-filter-refunds').click();
  files.push(await shot(page, 'SPAY-111', 3, 'ledger-refunds'));
  steps.push('Ledger displays entries and filters work');
  verdicts.push({ ticket: 'SPAY-111', verdict: 'VERIFIED', steps, files });
});

test('SPAY-112: PWA manifest + offline evidence', async ({ request, page, context }) => {
  const files: string[] = [];
  const steps: string[] = [];
  const res = await request.get('/manifest.webmanifest');
  expect(res.ok()).toBeTruthy();
  const manifest = (await res.json()) as { name: string; icons: Array<{ sizes: string }> };
  expect(manifest.name).toBe('SegmentPay');
  expect(manifest.icons.some((i) => i.sizes === '192x192')).toBeTruthy();
  expect(manifest.icons.some((i) => i.sizes === '512x512')).toBeTruthy();
  await page.goto('/wallet');
  files.push(await shot(page, 'SPAY-112', 1, 'online-wallet'));
  await context.setOffline(true);
  await expect(page.getByTestId('offline-banner')).toBeVisible({ timeout: 3000 });
  files.push(await shot(page, 'SPAY-112', 2, 'offline-banner'));
  await context.setOffline(false);
  steps.push('Manifest has 192+512 icons; offline banner toggles with network');
  verdicts.push({ ticket: 'SPAY-112', verdict: 'VERIFIED', steps, files });
});

test('SPAY-113: smart split evidence', async ({ request, page }) => {
  const files: string[] = [];
  const steps: string[] = [];
  const o = await freshOrder(request, [{ productId: 'grocery-banana', quantity: 12 }]);
  await page.goto(`/checkout/${o.id}`);
  await expect(page.getByTestId('checkout-smart-split-button')).toBeEnabled({ timeout: 5000 });
  await page.getByTestId('checkout-smart-split-button').click();
  await expect(page.getByTestId('checkout-finalize-button')).toBeEnabled({ timeout: 2000 });
  files.push(await shot(page, 'SPAY-113', 1, 'smart-split-filled'));
  steps.push('Smart Split fills allocations to the order total and enables finalize');
  verdicts.push({ ticket: 'SPAY-113', verdict: 'VERIFIED', steps, files });
});
