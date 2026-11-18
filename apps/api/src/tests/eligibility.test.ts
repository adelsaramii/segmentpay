import { describe, it, expect, beforeEach } from 'vitest';
import { resetState, getState } from '../domain/state.js';
import { evaluateEligibility } from '../domain/eligibility.js';
import { createOrder } from '../domain/orders.js';
import type { Order } from '@segmentpay/shared';

describe('evaluateEligibility', () => {
  beforeEach(() => {
    resetState();
  });

  it('grocery order allows gift', () => {
    const state = getState();
    const order = createOrder([{ productId: 'grocery-banana', quantity: 10 }]);
    // 10 * 199 + 200 = 2190c
    const eligibility = evaluateEligibility(order, state);
    const gift = eligibility.find((e) => e.source === 'gift');
    expect(gift?.maxCents).toBeGreaterThan(0);
  });

  it('electronics order disables gift and corporate', () => {
    const state = getState();
    const order = createOrder([{ productId: 'electronics-headphones', quantity: 1 }]);
    const eligibility = evaluateEligibility(order, state);

    const gift = eligibility.find((e) => e.source === 'gift');
    const corporate = eligibility.find((e) => e.source === 'corporate');
    expect(gift?.maxCents).toBe(0);
    expect(corporate?.maxCents).toBe(0);
  });

  it('cashback is zero when total < 2000c', () => {
    const state = getState();
    // banana 199c * 1 + 200 = 399c < 2000c
    const order = createOrder([{ productId: 'grocery-banana', quantity: 1 }]);
    expect(order.totalCents).toBeLessThan(2000);
    const eligibility = evaluateEligibility(order, state);
    const cashback = eligibility.find((e) => e.source === 'cashback');
    expect(cashback?.maxCents).toBe(0);
  });

  it('cashback is capped at 20% of total', () => {
    const state = getState();
    // Need total >= 2000. 12 * 199 + 200 = 2588c
    const order = createOrder([{ productId: 'grocery-banana', quantity: 12 }]);
    expect(order.totalCents).toBeGreaterThanOrEqual(2000);
    const eligibility = evaluateEligibility(order, state);
    const cashback = eligibility.find((e) => e.source === 'cashback');
    // 20% of total, floor at integer cents
    const expectedCap = Math.floor((order.totalCents * 2000) / 10000);
    expect(cashback?.maxCents).toBeLessThanOrEqual(expectedCap);
  });
});
