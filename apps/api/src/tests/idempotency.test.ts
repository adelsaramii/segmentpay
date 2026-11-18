import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../server.js';
import { resetState } from '../domain/state.js';

async function createGroceryOrder(app: ReturnType<typeof createApp>) {
  const res = await supertest(app)
    .post('/api/orders')
    .send({
      items: [
        { productId: 'fashion-dress', quantity: 2 },
        { productId: 'fashion-tshirt', quantity: 1 },
      ],
    });
  return res.body as { id: string; totalCents: number };
}

function buildAllocations(total: number) {
  const cash = 4000;
  const gift = 2000;
  const cashback = 1000;
  const card = total - cash - gift - cashback;
  return [
    { source: 'cash', amountCents: cash },
    { source: 'gift', amountCents: gift },
    { source: 'cashback', amountCents: cashback },
    { source: 'card', amountCents: card },
  ];
}

describe('Idempotency', () => {
  beforeEach(() => {
    resetState();
  });

  it('replay with same key and same payload returns original attempt without changing balance', async () => {
    const app = createApp();
    const order = await createGroceryOrder(app);
    const allocations = buildAllocations(order.totalCents);

    const body = {
      allocations,
      gatewayMode: 'success',
      idempotencyKey: 'idem-test-k1',
    };

    const first = await supertest(app).post(`/api/orders/${order.id}/pay`).send(body);
    expect(first.status).toBe(200);
    expect(first.body.order.status).toBe('paid');
    const firstAttemptId = first.body.payment.id;

    const walletBefore = await supertest(app).get('/api/wallet');
    const totalBefore = walletBefore.body.totalBalanceCents;

    // Replay
    const second = await supertest(app).post(`/api/orders/${order.id}/pay`).send(body);
    expect(second.status).toBe(200);
    expect(second.body.payment.id).toBe(firstAttemptId);

    const walletAfter = await supertest(app).get('/api/wallet');
    expect(walletAfter.body.totalBalanceCents).toBe(totalBefore);
  });

  it('replay with same key but different payload returns 409 IDEMPOTENCY_CONFLICT', async () => {
    const app = createApp();
    const order = await createGroceryOrder(app);
    const allocations = buildAllocations(order.totalCents);

    // First pay
    const first = await supertest(app)
      .post(`/api/orders/${order.id}/pay`)
      .send({ allocations, gatewayMode: 'success', idempotencyKey: 'idem-test-k2' });
    expect(first.status).toBe(200);

    // Different payload (different gatewayMode)
    const conflict = await supertest(app)
      .post(`/api/orders/${order.id}/pay`)
      .send({ allocations, gatewayMode: 'card_declined', idempotencyKey: 'idem-test-k2' });
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('after success, new key on same order returns ORDER_ALREADY_PAID', async () => {
    const app = createApp();
    const order = await createGroceryOrder(app);
    const allocations = buildAllocations(order.totalCents);

    const first = await supertest(app)
      .post(`/api/orders/${order.id}/pay`)
      .send({ allocations, gatewayMode: 'success', idempotencyKey: 'idem-test-k3' });
    expect(first.status).toBe(200);

    const second = await supertest(app)
      .post(`/api/orders/${order.id}/pay`)
      .send({ allocations, gatewayMode: 'success', idempotencyKey: 'idem-test-k3-new' });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('ORDER_ALREADY_PAID');
  });
});
