import { describe, it, expect, beforeEach } from 'vitest';
import { resetState, getState } from '../domain/state.js';
import { payOrder } from '../domain/payments.js';
import { createOrder } from '../domain/orders.js';
import type { PayRequest } from '@segmentpay/shared';

describe('Concurrency', () => {
  beforeEach(() => {
    resetState();
  });

  it('two concurrent payOrder calls on the same order: exactly one succeeds, the other gets ORDER_ALREADY_PAID', async () => {
    const order = createOrder([
      { productId: 'fashion-dress', quantity: 2 },
      { productId: 'fashion-tshirt', quantity: 1 },
    ]);

    const total = order.totalCents;
    const cash = 4000;
    const gift = 2000;
    const cashback = 1000;
    const card = total - cash - gift - cashback;

    const allocations = [
      { source: 'cash' as const, amountCents: cash },
      { source: 'gift' as const, amountCents: gift },
      { source: 'cashback' as const, amountCents: cashback },
      { source: 'card' as const, amountCents: card },
    ];

    const bodyA: PayRequest = {
      allocations,
      gatewayMode: 'success',
      idempotencyKey: 'concurrent-key-A',
    };
    const bodyB: PayRequest = {
      allocations,
      gatewayMode: 'success',
      idempotencyKey: 'concurrent-key-B',
    };

    // Fire both concurrently
    const [resultA, resultB] = await Promise.allSettled([
      payOrder(order.id, bodyA),
      payOrder(order.id, bodyB),
    ]);

    const successes = [resultA, resultB].filter((r) => r.status === 'fulfilled');
    const failures = [resultA, resultB].filter((r) => r.status === 'rejected');

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    const failedReason = (failures[0] as PromiseRejectedResult).reason;
    expect(failedReason.code).toBe('ORDER_ALREADY_PAID');

    const state = getState();
    const finalOrder = state.orders.get(order.id);
    expect(finalOrder?.status).toBe('paid');
  });
});
