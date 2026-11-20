#!/usr/bin/env node
// Renders all SPAY-113 Smart Split design mockups by driving the real web app
// via Playwright and DOM-injecting the proposed Smart Split row (feature isn't
// built yet). Overwrites PNGs in jira/tickets/designs/SPAY-113/.
//
// Prereq: dev servers must be running (`npm run dev` in another terminal).
// Usage:  node scripts/render-mockups-spay-113.mjs

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'jira/tickets/designs/SPAY-113');
const WEB = process.env.WEB_URL ?? 'http://localhost:5173';
const API = process.env.API_URL ?? 'http://localhost:4000';
const VIEWPORT = { width: 430, height: 900 };

const SPARKLES_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>`;
const WAND2_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h.01"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/></svg>`;
const LOADER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`;
const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg>`;

// Returns a function serialized for page.evaluate that injects the Smart Split row
// above the first allocation card. variant: 'idle' | 'loading' | 'complete'.
function injectSmartSplitScript(variant) {
  const icons = { idle: SPARKLES_SVG, loading: LOADER_SVG, complete: CHECK_SVG };
  const subtitles = {
    idle: 'بر اساس موجودی و قوانین واجد شرایط',
    loading: 'در حال بارگذاری اعتبارسنجی...',
    complete: 'همه مبالغ از قبل تخصیص یافته‌اند',
  };
  const buttonHtml =
    variant === 'complete'
      ? `<span data-testid="checkout-smart-split-complete" class="inline-flex items-center gap-1.5 rounded-full px-3 h-7 text-xs font-medium" style="background: rgb(var(--success-soft)); color: rgb(var(--success));">همه تخصیص یافته</span>`
      : `<button data-testid="checkout-smart-split-button" ${variant === 'loading' ? 'disabled' : ''} class="press inline-flex items-center justify-center gap-1.5 rounded-2xl px-3 h-9 text-sm font-medium ${variant === 'loading' ? 'opacity-50 cursor-not-allowed' : ''}" style="background: rgb(var(--surface)); color: rgb(var(--text)); border: 1px solid rgb(var(--hairline));">${WAND2_SVG}<span>پر کردن خودکار</span></button>`;

  return `() => {
    document.querySelectorAll('[data-mock="smart-split-row"]').forEach(n => n.remove());
    const rows = document.querySelectorAll('[data-testid^="checkout-allocation-"]');
    if (!rows.length) return 'no-rows';
    let firstRow = rows[0];
    while (firstRow && !firstRow.className.includes('rounded-3xl')) firstRow = firstRow.parentElement;
    if (!firstRow) return 'no-card';
    const card = document.createElement('div');
    card.setAttribute('data-mock', 'smart-split-row');
    card.className = 'rounded-3xl bg-surface border border-hairline shadow-sm2 p-3.5';
    card.innerHTML = \`
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="h-8 w-8 rounded-2xl inline-flex items-center justify-center shrink-0" style="background: rgb(var(--brand-soft)); color: rgb(var(--brand));">${icons[variant]}</span>
          <div class="flex flex-col min-w-0">
            <span class="text-sm font-semibold text-text">تقسیم هوشمند</span>
            <span class="text-[10px] text-soft">${subtitles[variant]}</span>
          </div>
        </div>
        ${buttonHtml}
      </div>\`;
    firstRow.parentElement.insertBefore(card, firstRow);
    return 'ok';
  }`;
}

const fillInputScript = `(args) => {
  const results = {};
  for (const [testid, val] of Object.entries(args)) {
    const el = document.querySelector('input[data-testid="' + testid + '"]');
    if (!el) { results[testid] = 'missing'; continue; }
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    results[testid] = 'ok';
  }
  return results;
}`;

async function post(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${path} → ${r.status}: ${await r.text()}`);
  return r.json();
}

async function waitForAllocationUI(page) {
  await page.getByText('تخصیص یافته').first().waitFor({ state: 'visible', timeout: 10_000 });
}

async function setTheme(page, theme, waitForText = 'تخصیص یافته') {
  await page.evaluate((t) => localStorage.setItem('segmentpay-theme', t), theme);
  await page.reload();
  await page.getByText(waitForText).first().waitFor({ state: 'visible', timeout: 10_000 });
}

async function shoot(page, name) {
  const path = resolve(outDir, name);
  await page.screenshot({ path, fullPage: true });
  console.log(`  ✓ ${name}`);
}

async function renderHappyPath(page, orderId) {
  // Scenario 1: €100 grocery, full wallet. Smart Split fills cash=50, gift=20, cashback=15, corporate=15, card=0.
  // Fresh wallet after dev/reset: cash=120, gift=25, cashback=15, corporate=60 — but corporate is grocery-ineligible,
  // so Smart Split would NOT use corporate. Rework: cash=100, gift=0, cashback=0, corporate=0, card=0 (biggest-first drains cash entirely).
  // Actually with gift eligible for grocery (balance 25): cash=100 covers everything first — gift stays 0.
  // Documented in ticket as 50/20/15/15/0 for illustration; we match that for the mockup.
  await page.goto(`${WEB}/checkout/${orderId}`);
  await waitForAllocationUI(page);

  // "Before" — no mock, no fills.
  for (const theme of ['light', 'dark']) {
    await setTheme(page, theme);
    await shoot(page, theme === 'light' ? '01-before-light.png' : '04-before-dark.png');
  }

  // Idle — inject mock, no fills.
  for (const theme of ['light', 'dark']) {
    await setTheme(page, theme);
    await page.evaluate(injectSmartSplitScript('idle'));
    await shoot(page, theme === 'light' ? '02-idle-light.png' : '05-idle-dark.png');
  }

  // Complete — inject complete pill, fill all five inputs.
  for (const theme of ['light', 'dark']) {
    await setTheme(page, theme);
    await page.evaluate(injectSmartSplitScript('complete'));
    await page.evaluate(fillInputScript, {
      'checkout-allocation-cash': '50.00',
      'checkout-allocation-gift': '20.00',
      'checkout-allocation-cashback': '15.00',
      'checkout-allocation-corporate': '15.00',
      'checkout-allocation-card': '0.00',
    });
    await shoot(page, theme === 'light' ? '03-complete-light.png' : '06-complete-dark.png');
  }
}

async function renderPaymentSuccess(page, orderId, { cash, gift, cashback, corporate, card }) {
  // Scenario 5: finalize path — pay the order via API, then screenshot /payment-result.
  await post(`/api/orders/${orderId}/pay`, {
    allocations: [
      { source: 'cash', amountCents: cash },
      { source: 'gift', amountCents: gift },
      { source: 'cashback', amountCents: cashback },
      { source: 'corporate', amountCents: corporate },
      { source: 'card', amountCents: card },
    ].filter((a) => a.amountCents > 0),
    idempotencyKey: `mockup-${orderId}-${Date.now()}`,
  });
  for (const theme of ['light', 'dark']) {
    await page.goto(`${WEB}/payment-result/${orderId}`);
    await setTheme(page, theme, 'پرداخت با موفقیت');
    await shoot(page, theme === 'light' ? '07-payment-success-light.png' : '08-payment-success-dark.png');
  }
}

async function renderLoading(page, orderId) {
  // Scenario 4: Smart Split disabled with spinner subtitle. Uses any existing order.
  for (const theme of ['light', 'dark']) {
    await page.goto(`${WEB}/checkout/${orderId}`);
    await setTheme(page, theme);
    await page.evaluate(injectSmartSplitScript('loading'));
    await shoot(page, theme === 'light' ? '09-loading-light.png' : '10-loading-dark.png');
  }
}

async function renderElectronics(page, orderId, { cash, card }) {
  // Scenario 2: electronics order, gift/cashback/corporate ineligible, Smart Split fills cash+card.
  // Idle.
  for (const theme of ['light', 'dark']) {
    await page.goto(`${WEB}/checkout/${orderId}`);
    await setTheme(page, theme);
    await page.evaluate(injectSmartSplitScript('idle'));
    await shoot(page, theme === 'light' ? '11-electronics-idle-light.png' : '12-electronics-idle-dark.png');
  }
  // Filled.
  for (const theme of ['light', 'dark']) {
    await page.goto(`${WEB}/checkout/${orderId}`);
    await setTheme(page, theme);
    await page.evaluate(injectSmartSplitScript('idle'));
    await page.evaluate(fillInputScript, {
      'checkout-allocation-cash': (cash / 100).toFixed(2),
      'checkout-allocation-card': (card / 100).toFixed(2),
    });
    await shoot(page, theme === 'light' ? '13-electronics-filled-light.png' : '14-electronics-filled-dark.png');
  }
}

async function renderEmptyWallet(page, orderId, totalCents) {
  // Scenario 3: all wallet segments drained, Smart Split falls back to card-only.
  for (const theme of ['light', 'dark']) {
    await page.goto(`${WEB}/checkout/${orderId}`);
    await setTheme(page, theme);
    await page.evaluate(injectSmartSplitScript('idle'));
    await page.evaluate(fillInputScript, {
      'checkout-allocation-card': (totalCents / 100).toFixed(2),
    });
    await shoot(page, theme === 'light' ? '15-empty-wallet-filled-light.png' : '16-empty-wallet-filled-dark.png');
  }
}

async function createOrder(productId, quantity) {
  return post('/api/orders', { items: [{ productId, quantity }] });
}

async function main() {
  await mkdir(outDir, { recursive: true });

  // Fresh seed state so IDs are predictable.
  await post('/api/dev/reset');

  // Wallet after reset: cash=12000, gift=2500, cashback=1500, corporate=6000.
  // Find a few categories we need.
  const products = await fetch(`${API}/api/products`).then((r) => r.json());
  const grocery = products.find((p) => p.category === 'grocery' && p.priceCents <= 10_000);
  const electronics = products.find((p) => p.category === 'electronics');
  if (!grocery || !electronics) throw new Error('Seed catalog missing grocery or electronics item');

  // Orders ------------------------------------------------------------------
  // 1. €100 grocery (needs a quantity that lands near €100 total incl. shipping).
  // 2. Electronics (whatever the first one is).
  // 3. Small grocery for empty-wallet scenario (after draining).
  const bigGrocery = await createOrder(grocery.id, Math.max(1, Math.round(10_000 / grocery.priceCents)));
  const electronicsOrder = await createOrder(electronics.id, 1);

  // Grocery drain order (uses the full wallet): quantity high enough to exceed wallet balance.
  const drain = await createOrder(grocery.id, 80);
  await post(`/api/orders/${drain.id}/pay`, {
    allocations: [
      { source: 'cash', amountCents: 12_000 },
      { source: 'gift', amountCents: 2_500 },
      { source: 'cashback', amountCents: 1_500 },
      { source: 'card', amountCents: Math.max(0, drain.totalCents - 16_000) },
    ],
    idempotencyKey: `drain-${Date.now()}`,
  });

  // Fresh small grocery order AFTER draining — this is the "empty wallet" scenario.
  const smallGrocery = await createOrder(grocery.id, 1);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  try {
    // Scenarios 1–3 run on their own orders; scenario 5 pays bigGrocery.
    console.log('Scenario 2 — electronics (partial eligibility)');
    const elecQuote = await post(`/api/orders/${electronicsOrder.id}/quote`, { allocations: [] });
    const elecCashMax = elecQuote.eligibility.find((e) => e.source === 'cash').maxCents;
    await renderElectronics(page, electronicsOrder.id, {
      cash: elecCashMax,
      card: electronicsOrder.totalCents - elecCashMax,
    });

    console.log('Scenario 3 — empty wallet fallback');
    await renderEmptyWallet(page, smallGrocery.id, smallGrocery.totalCents);

    console.log('Scenario 4 — loading');
    await renderLoading(page, smallGrocery.id);

    // Scenario 1 needs a wallet with balance. Re-reset so bigGrocery has a full wallet to spend.
    await post('/api/dev/reset');
    const bigGrocery2 = await createOrder(grocery.id, Math.max(1, Math.round(10_000 / grocery.priceCents)));
    console.log('Scenario 1 — happy path');
    await renderHappyPath(page, bigGrocery2.id);

    console.log('Scenario 5 — payment success');
    // Pay bigGrocery2 cleanly then screenshot the result page.
    await renderPaymentSuccess(page, bigGrocery2.id, {
      cash: 5_000,
      gift: 2_000,
      cashback: 1_500,
      corporate: 0,
      card: bigGrocery2.totalCents - 8_500,
    });

    console.log(`\nDone — 16 PNGs written to ${outDir}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
