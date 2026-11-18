import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../server.js';
import { resetState } from '../domain/state.js';

describe('Refund', () => {
  beforeEach(() => {
    resetState();
  });

  it('refund after paying restores wallet to seeded values and sets status=refunded', async () => {
    const app = createApp();

    // Create and pay an order
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
        idempotencyKey: 'refund-test-pay-001',
      });

    // Refund
    const refundRes = await supertest(app)
      .post(`/api/orders/${orderId}/refund`)
      .send({ idempotencyKey: 'refund-test-ref-001' });

    expect(refundRes.status).toBe(200);
    expect(refundRes.body.order.status).toBe('refunded');

    // Wallet should be restored
    const walletRes = await supertest(app).get('/api/wallet');
    const segments = walletRes.body.segments as Array<{ id: string; balanceCents: number }>;
    const byId = Object.fromEntries(segments.map((s) => [s.id, s.balanceCents]));
    expect(byId['cash']).toBe(12000);
    expect(byId['gift']).toBe(2500);
    expect(byId['cashback']).toBe(1500);
    expect(byId['corporate']).toBe(6000);
  });

  it('second refund returns NOT_REFUNDABLE', async () => {
    const app = createApp();

    const orderRes = await supertest(app)
      .post('/api/orders')
      .send({
        items: [
          { productId: 'fashion-dress', quantity: 2 },
          { productId: 'fashion-tshirt', quantity: 1 },
        ],
      });
    const orderId = orderRes.body.id;
    const total = orderRes.body.totalCents;
    const card = total - 4000 - 2000 - 1000;

    await supertest(app)
      .post(`/api/orders/${orderId}/pay`)
      .send({
        allocations: [
          { source: 'cash', amountCents: 4000 },
          { source: 'gift', amountCents: 2000 },
          { source: 'cashback', amountCents: 1000 },
          { source: 'card', amountCents: card },
        ],
        gatewayMode: 'success',
        idempotencyKey: 'refund-double-pay',
      });

    await supertest(app)
      .post(`/api/orders/${orderId}/refund`)
      .send({ idempotencyKey: 'refund-double-ref-1' });

    // Second refund with a NEW key
    const second = await supertest(app)
      .post(`/api/orders/${orderId}/refund`)
      .send({ idempotencyKey: 'refund-double-ref-2' });

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('NOT_REFUNDABLE');
  });
});
