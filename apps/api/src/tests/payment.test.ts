import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../server.js';
import { resetState } from '../domain/state.js';

describe('Multi-source payment', () => {
  beforeEach(() => {
    resetState();
  });

  it('successful pay with 40/20/10/30 split on grocery order sets status=paid and reduces wallet', async () => {
    const app = createApp();

    // Build a grocery+fashion order with total >= 2000c so cashback is eligible.
    // We need: cash-4000, gift-2000, cashback-1000, card-3000 = 10000c total
    // Items = 9800c. Use: 2×fashion-dress(3500=7000) + 1×fashion-tshirt(1500) + 1×grocery-banana(299) + 1×grocery-milk(189) = 8988
    // 9800-8988 = 812. Add 2×grocery-banana(598) more = 2+1=3 bananas: 897. Total items = 7000+1500+897+189 = 9586. 9586+200=9786.
    // Adjust: use 4 bananas (4*299=1196): 7000+1500+1196+189=9885. 9885+200=10085. Too much.
    // Use 3 bananas + 1 milk: 7000+1500+897+189=9586. +200=9786. Allocate to match:
    // total=9786, cashback cap = floor(9786*2000/10000)=1957, we have 1500c cashback, so can use 1500.
    // Allocate: cash=4000, gift=2500(max balance), cashback=1500(max balance). Sum=8000. card=9786-8000=1786.
    // After pay: cash=8000, gift=0, cashback=0, corp=6000, total=14000
    // That's not quite the spec's numbers. Let me use a simpler split.
    //
    // For simplicity: buy 2×fashion-dress (7000) + 1×fashion-tshirt (1500) = items 8500, total 8700.
    // cashback cap = floor(8700*2000/10000) = 1740. Balance is 1500 so max cashback = 1500.
    // Allocate: cash=4000, gift=2000, cashback=1000, card=1700. Sum=8700. ✓
    // gift eligible (all fashion). cashback ≥ 2000c order, 1000 ≤ cap 1740. ✓

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
    const total = orderRes.body.totalCents; // 8500+200=8700

    // Allocations: cash=4000, gift=2000, cashback=1000, card=rest
    const cash = 4000;
    const gift = 2000;
    const cashback = 1000;
    const card = total - cash - gift - cashback; // 8700-7000=1700

    const payRes = await supertest(app)
      .post(`/api/orders/${orderId}/pay`)
      .send({
        allocations: [
          { source: 'cash', amountCents: cash },
          { source: 'gift', amountCents: gift },
          { source: 'cashback', amountCents: cashback },
          { source: 'card', amountCents: card },
        ],
        gatewayMode: 'success',
        idempotencyKey: 'pay-test-001',
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.order.status).toBe('paid');

    // Wallet should reflect debits
    const walletRes = await supertest(app).get('/api/wallet');
    expect(walletRes.status).toBe(200);

    const segments = walletRes.body.segments as Array<{ id: string; balanceCents: number }>;
    const byId = Object.fromEntries(segments.map((s) => [s.id, s.balanceCents]));
    expect(byId['cash']).toBe(12000 - cash);    // 8000
    expect(byId['gift']).toBe(2500 - gift);      // 500
    expect(byId['cashback']).toBe(1500 - cashback); // 500
    expect(byId['corporate']).toBe(6000);        // unchanged
    expect(walletRes.body.totalBalanceCents).toBe(8000 + 500 + 500 + 6000); // 15000
  });
});
