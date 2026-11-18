import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../server.js';
import { resetState } from '../domain/state.js';
import type { LedgerEntry } from '@segmentpay/shared';

describe('Ledger', () => {
  beforeEach(() => {
    resetState();
  });

  it('after pay then refund, ledger contains reservation→commit→credit sequence per wallet source', async () => {
    const app = createApp();

    const orderRes = await supertest(app)
      .post('/api/orders')
      .send({
        items: [
          { productId: 'fashion-dress', quantity: 2 },
          { productId: 'fashion-tshirt', quantity: 1 },
        ],
      });
    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.id;
    const total = orderRes.body.totalCents;

    const cash = 4000;
    const gift = 2000;
    const cashback = 1000;
    const card = total - cash - gift - cashback;

    await supertest(app)
      .post(`/api/orders/${orderId}/pay`)
      .send({
        allocations: [
          { source: 'cash', amountCents: cash },
          { source: 'gift', amountCents: gift },
          { source: 'cashback', amountCents: cashback },
          { source: 'card', amountCents: card },
        ],
        gatewayMode: 'success',
        idempotencyKey: 'ledger-test-pay',
      });

    await supertest(app)
      .post(`/api/orders/${orderId}/refund`)
      .send({ idempotencyKey: 'ledger-test-refund' });

    const ledgerRes = await supertest(app).get('/api/ledger');
    expect(ledgerRes.status).toBe(200);
    const ledger = ledgerRes.body as LedgerEntry[];

    // For each wallet source, check: reservation, commit, credit
    for (const { source, amount } of [
      { source: 'cash', amount: cash },
      { source: 'gift', amount: gift },
      { source: 'cashback', amount: cashback },
    ]) {
      const sourceEntries = ledger.filter((e) => e.source === source && e.orderId === orderId);

      const reservation = sourceEntries.find((e) => e.type === 'reservation');
      expect(reservation).toBeDefined();
      expect(reservation?.amountCents).toBe(amount);
      expect(reservation?.state).toBe('reserved');

      const commit = sourceEntries.find((e) => e.type === 'commit');
      expect(commit).toBeDefined();
      expect(commit?.amountCents).toBe(amount);
      expect(commit?.state).toBe('committed');

      const credit = sourceEntries.find((e) => e.type === 'credit');
      expect(credit).toBeDefined();
      expect(credit?.amountCents).toBe(amount);
    }

    // Card should also have reservation, commit, and credit
    const cardEntries = ledger.filter((e) => e.source === 'card' && e.orderId === orderId);
    const cardReservation = cardEntries.find((e) => e.type === 'reservation');
    const cardCommit = cardEntries.find((e) => e.type === 'commit');
    const cardCredit = cardEntries.find((e) => e.type === 'credit');
    expect(cardReservation).toBeDefined();
    expect(cardCommit).toBeDefined();
    expect(cardCredit).toBeDefined();
  });
});
