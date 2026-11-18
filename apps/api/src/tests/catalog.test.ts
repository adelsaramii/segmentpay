import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../server.js';
import { resetState } from '../domain/state.js';

describe('GET /api/products', () => {
  beforeEach(() => {
    resetState();
  });

  it('returns at least 8 products covering all four categories', async () => {
    const app = createApp();
    const res = await supertest(app).get('/api/products');

    expect(res.status).toBe(200);
    const products = res.body as Array<{ id: string; category: string }>;
    expect(products.length).toBeGreaterThanOrEqual(8);

    const categories = new Set(products.map((p) => p.category));
    expect(categories.has('grocery')).toBe(true);
    expect(categories.has('fashion')).toBe(true);
    expect(categories.has('electronics')).toBe(true);
    expect(categories.has('office')).toBe(true);

    // At least 2 per category
    const countByCategory = products.reduce<Record<string, number>>((acc, p) => {
      acc[p.category] = (acc[p.category] ?? 0) + 1;
      return acc;
    }, {});
    for (const cat of ['grocery', 'fashion', 'electronics', 'office']) {
      expect(countByCategory[cat]).toBeGreaterThanOrEqual(2);
    }
  });
});
