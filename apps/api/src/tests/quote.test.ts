import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../server.js';
import { resetState } from '../domain/state.js';

describe('POST /api/orders/:id/quote', () => {
  beforeEach(() => {
    resetState();
  });

  it('returns eligibility reflecting rules and card equals total', async () => {
    const app = createApp();

    // Create a grocery order big enough for cashback (>= 2000c)
    // banana 199c each. 12 bananas = 12*199+200 = 2588c (>= 2000)
    const orderRes = await supertest(app)
      .post('/api/orders')
      .send({ items: [{ productId: 'grocery-banana', quantity: 12 }] });

    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.id;

    const quoteRes = await supertest(app).post(`/api/orders/${orderId}/quote`);
    expect(quoteRes.status).toBe(200);

    const { eligibility, totalCents } = quoteRes.body;
    const card = eligibility.find((e: { source: string }) => e.source === 'card');
    expect(card?.maxCents).toBe(totalCents);

    const gift = eligibility.find((e: { source: string }) => e.source === 'gift');
    expect(gift?.maxCents).toBeGreaterThan(0);

    const corporate = eligibility.find((e: { source: string }) => e.source === 'corporate');
    expect(corporate?.maxCents).toBe(0);
    expect(corporate?.reasonFa).toBeTruthy();
  });

  it('returns 404 for unknown order', async () => {
    const app = createApp();
    const res = await supertest(app).post('/api/orders/UNKNOWN/quote');
    expect(res.status).toBe(404);
  });
});
