import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../server.js';
import { resetState } from '../domain/state.js';

describe('POST /api/orders', () => {
  beforeEach(() => {
    resetState();
  });

  it('rejects empty cart with EMPTY_CART', async () => {
    const app = createApp();
    const res = await supertest(app)
      .post('/api/orders')
      .send({ items: [] });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('EMPTY_CART');
  });

  it('valid cart returns ORD-prefixed id and total = items + 200', async () => {
    const app = createApp();
    const res = await supertest(app)
      .post('/api/orders')
      .send({ items: [{ productId: 'grocery-banana', quantity: 2 }] });

    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^ORD-/);
    expect(res.body.status).toBe('pending_payment');

    // banana is 199c each, 2 = 398c, + 200 shipping = 598c
    expect(res.body.itemsTotalCents).toBe(398);
    expect(res.body.shippingCents).toBe(200);
    expect(res.body.totalCents).toBe(598);
  });
});
