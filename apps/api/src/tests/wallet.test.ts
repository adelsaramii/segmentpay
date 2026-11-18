import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../server.js';
import { resetState } from '../domain/state.js';

describe('GET /api/wallet', () => {
  beforeEach(() => {
    resetState();
  });

  it('returns total 22000c and four segments matching seed', async () => {
    const app = createApp();
    const res = await supertest(app).get('/api/wallet');

    expect(res.status).toBe(200);
    expect(res.body.totalBalanceCents).toBe(22000);

    const segments = res.body.segments as Array<{ id: string; balanceCents: number }>;
    expect(segments).toHaveLength(4);

    const byId = Object.fromEntries(segments.map((s) => [s.id, s.balanceCents]));
    expect(byId['cash']).toBe(12000);
    expect(byId['gift']).toBe(2500);
    expect(byId['cashback']).toBe(1500);
    expect(byId['corporate']).toBe(6000);
  });
});
