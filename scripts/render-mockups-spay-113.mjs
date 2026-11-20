#!/usr/bin/env node
// Renders all SPAY-113 Smart Split design mockups by driving the real web app
// through scripts/web-driver.mjs. The Smart Split component is not built yet;
// `inject()` paints its proposed card into the real DOM for the screenshot.
//
// Prereq: dev servers running (`npm run dev` in another terminal).
// Usage:  npm run mockups:spay-113   (or: node scripts/render-mockups-spay-113.mjs)

import {
  open, api, reset, theme, fill, inject, screenshot, wait_for_text, close,
} from './web-driver.mjs';

const OUT = 'jira/tickets/designs/SPAY-113';

// --- Smart Split card markup (what the shipped component will render) -------
// Variants: 'idle' | 'loading' | 'complete'.
// Lucide SVG paths are inlined so the renderer has no asset deps.

const ICONS = {
  idle: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>',
  loading: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>',
  complete: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg>',
};
const WAND = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h.01"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/></svg>';
const SUBTITLES = {
  idle: 'بر اساس موجودی و قوانین واجد شرایط',
  loading: 'در حال بارگذاری اعتبارسنجی...',
  complete: 'همه مبالغ از قبل تخصیص یافته‌اند',
};

/** Paint the Smart Split row above the first allocation card. */
async function injectSmartSplit(variant) {
  await inject(
    ({ variant, icon, wand, subtitle }) => {
      document.querySelectorAll('[data-mock="smart-split-row"]').forEach((n) => n.remove());
      const rows = document.querySelectorAll('[data-testid^="checkout-allocation-"]');
      if (!rows.length) throw new Error('inject: no allocation rows');
      let firstRow = rows[0];
      while (firstRow && !firstRow.className.includes('rounded-3xl')) firstRow = firstRow.parentElement;
      if (!firstRow) throw new Error('inject: no card container');
      const trailing =
        variant === 'complete'
          ? `<span data-testid="checkout-smart-split-complete" class="inline-flex items-center gap-1.5 rounded-full px-3 h-7 text-xs font-medium" style="background: rgb(var(--success-soft)); color: rgb(var(--success));">همه تخصیص یافته</span>`
          : `<button data-testid="checkout-smart-split-button" ${variant === 'loading' ? 'disabled' : ''} class="press inline-flex items-center justify-center gap-1.5 rounded-2xl px-3 h-9 text-sm font-medium ${variant === 'loading' ? 'opacity-50 cursor-not-allowed' : ''}" style="background: rgb(var(--surface)); color: rgb(var(--text)); border: 1px solid rgb(var(--hairline));">${wand}<span>پر کردن خودکار</span></button>`;
      const card = document.createElement('div');
      card.setAttribute('data-mock', 'smart-split-row');
      card.className = 'rounded-3xl bg-surface border border-hairline shadow-sm2 p-3.5';
      card.innerHTML = `
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="h-8 w-8 rounded-2xl inline-flex items-center justify-center shrink-0" style="background: rgb(var(--brand-soft)); color: rgb(var(--brand));">${icon}</span>
            <div class="flex flex-col min-w-0">
              <span class="text-sm font-semibold text-text">تقسیم هوشمند</span>
              <span class="text-[10px] text-soft">${subtitle}</span>
            </div>
          </div>
          ${trailing}
        </div>`;
      firstRow.parentElement.insertBefore(card, firstRow);
    },
    { variant, icon: ICONS[variant], wand: WAND, subtitle: SUBTITLES[variant] },
  );
}

const CHECKOUT_READY = 'تخصیص یافته';
const SUCCESS_READY = 'پرداخت با موفقیت';

async function shoot(name) {
  const path = await screenshot(`${OUT}/${name}`);
  console.log(`  ✓ ${name}`);
  return path;
}

async function openCheckoutFresh(orderId, mode) {
  await open(`/checkout/${orderId}`);
  await wait_for_text(CHECKOUT_READY);
  await theme(mode, { waitFor: CHECKOUT_READY });
}

async function renderHappyPath(orderId) {
  // Scenario 1 — Before / Idle / Complete in both themes.
  for (const mode of ['light', 'dark']) {
    await openCheckoutFresh(orderId, mode);
    await shoot(mode === 'light' ? '01-before-light.png' : '04-before-dark.png');
    await injectSmartSplit('idle');
    await shoot(mode === 'light' ? '02-idle-light.png' : '05-idle-dark.png');
    await injectSmartSplit('complete');
    await Promise.all([
      fill('checkout-allocation-cash', '50.00'),
      fill('checkout-allocation-gift', '20.00'),
      fill('checkout-allocation-cashback', '15.00'),
      fill('checkout-allocation-corporate', '15.00'),
      fill('checkout-allocation-card', '0.00'),
    ]);
    await shoot(mode === 'light' ? '03-complete-light.png' : '06-complete-dark.png');
  }
}

async function renderElectronics(orderId, { cashCents, cardCents }) {
  // Scenario 2 — partial eligibility.
  for (const mode of ['light', 'dark']) {
    await openCheckoutFresh(orderId, mode);
    await injectSmartSplit('idle');
    await shoot(mode === 'light' ? '11-electronics-idle-light.png' : '12-electronics-idle-dark.png');
    await fill('checkout-allocation-cash', (cashCents / 100).toFixed(2));
    await fill('checkout-allocation-card', (cardCents / 100).toFixed(2));
    await shoot(mode === 'light' ? '13-electronics-filled-light.png' : '14-electronics-filled-dark.png');
  }
}

async function renderEmptyWallet(orderId, totalCents) {
  // Scenario 3 — card-only fallback.
  for (const mode of ['light', 'dark']) {
    await openCheckoutFresh(orderId, mode);
    await injectSmartSplit('idle');
    await fill('checkout-allocation-card', (totalCents / 100).toFixed(2));
    await shoot(mode === 'light' ? '15-empty-wallet-filled-light.png' : '16-empty-wallet-filled-dark.png');
  }
}

async function renderLoading(orderId) {
  // Scenario 4 — quote still resolving.
  for (const mode of ['light', 'dark']) {
    await openCheckoutFresh(orderId, mode);
    await injectSmartSplit('loading');
    await shoot(mode === 'light' ? '09-loading-light.png' : '10-loading-dark.png');
  }
}

async function renderPaymentSuccess(orderId, allocations) {
  // Scenario 5 — close the loop.
  await api('POST', `/api/orders/${orderId}/pay`, {
    allocations: Object.entries(allocations)
      .filter(([, v]) => v > 0)
      .map(([source, amountCents]) => ({ source, amountCents })),
    idempotencyKey: `mockup-${orderId}-${Date.now()}`,
  });
  for (const mode of ['light', 'dark']) {
    await open(`/payment-result/${orderId}`);
    await wait_for_text(SUCCESS_READY);
    await theme(mode, { waitFor: SUCCESS_READY });
    await shoot(mode === 'light' ? '07-payment-success-light.png' : '08-payment-success-dark.png');
  }
}

async function createOrder(productId, quantity) {
  return api('POST', '/api/orders', { items: [{ productId, quantity }] });
}

async function main() {
  // Fresh seed state so order IDs are predictable.
  await reset();

  // Wallet after reset: cash=12000, gift=2500, cashback=1500, corporate=6000.
  const products = await api('GET', '/api/products');
  const grocery = products.find((p) => p.category === 'grocery' && p.priceCents <= 10_000);
  const electronics = products.find((p) => p.category === 'electronics');
  if (!grocery || !electronics) throw new Error('Seed catalog missing grocery or electronics');

  // Pre-create orders used across scenarios.
  const electronicsOrder = await createOrder(electronics.id, 1);

  // Drain the wallet with one giant grocery order so scenario 3 sees an empty wallet.
  const drain = await createOrder(grocery.id, 80);
  await api('POST', `/api/orders/${drain.id}/pay`, {
    allocations: [
      { source: 'cash', amountCents: 12_000 },
      { source: 'gift', amountCents: 2_500 },
      { source: 'cashback', amountCents: 1_500 },
      { source: 'card', amountCents: Math.max(0, drain.totalCents - 16_000) },
    ],
    idempotencyKey: `drain-${Date.now()}`,
  });
  const smallGrocery = await createOrder(grocery.id, 1);

  try {
    console.log('Scenario 2 — electronics (partial eligibility)');
    const elecQuote = await api('POST', `/api/orders/${electronicsOrder.id}/quote`, { allocations: [] });
    const elecCashMax = elecQuote.eligibility.find((e) => e.source === 'cash').maxCents;
    await renderElectronics(electronicsOrder.id, {
      cashCents: elecCashMax,
      cardCents: electronicsOrder.totalCents - elecCashMax,
    });

    console.log('Scenario 3 — empty wallet fallback');
    await renderEmptyWallet(smallGrocery.id, smallGrocery.totalCents);

    console.log('Scenario 4 — loading');
    await renderLoading(smallGrocery.id);

    // Scenario 1 and 5 need a full wallet again.
    await reset();
    const bigGrocery = await createOrder(grocery.id, Math.max(1, Math.round(10_000 / grocery.priceCents)));

    console.log('Scenario 1 — happy path');
    await renderHappyPath(bigGrocery.id);

    console.log('Scenario 5 — payment success');
    await renderPaymentSuccess(bigGrocery.id, {
      cash: 5_000,
      gift: 2_000,
      cashback: 1_500,
      card: bigGrocery.totalCents - 8_500,
    });

    console.log(`\nDone — 16 PNGs written to ${OUT}`);
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
