import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../server.js';
import { resetState } from '../domain/state.js';
import type { LedgerEntry } from '@segmentpay/shared';

describe('Compensation on card_declined', () => {
  beforeEach(() => {
    resetState();
  });

  it('marks order failed and restores wallet balances after card_declined', async () => {
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
    const total = orderRes.body.totalCents; // 8700

    const cash = 4000;
    const gift = 2000;
    const cashback = 1000;
    const card = total - cash - gift - cashback;

    const payRes = await supertest(app)
      .post(`/api/orders/${orderId}/pay`)
      .send({
        allocations: [
          { source: 'cash', amountCents: cash },
          { source: 'gift', amountCents: gift },
          { source: 'cashback', amountCents: cashback },
          { source: 'card', amountCents: card },
        ],
        gatewayMode: 'card_declined',
        idempotencyKey: 'comp-test-001',
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.order.status).toBe('failed');

    // Wallet should be restored to pre-attempt balances
    const walletRes = await supertest(app).get('/api/wallet');
    const segments = walletRes.body.segments as Array<{ id: string; balanceCents: number }>;
    const byId = Object.fromEntries(segments.map((s) => [s.id, s.balanceCents]));
    expect(byId['cash']).toBe(12000);
    expect(byId['gift']).toBe(2500);
    expect(byId['cashback']).toBe(1500);
    expect(byId['corporate']).toBe(6000);

    // Ledger should have one reservation and one reversal per wallet source
    const ledgerRes = await supertest(app).get('/api/ledger');
    const ledger = ledgerRes.body as LedgerEntry[];

    for (const source of ['cash', 'gift', 'cashback'] as const) {
      const reservations = ledger.filter(
        (e) => e.source === source && e.type === 'reservation'
      );
      const reversals = ledger.filter(
        (e) => e.source === source && e.type === 'reversal'
      );
      expect(reservations).toHaveLength(1);
      expect(reversals).toHaveLength(1);
      expect(reservations[0].amountCents).toBe(reversals[0].amountCents);
    }
  });
});
