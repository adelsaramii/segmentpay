import { describe, it, expect } from 'vitest';
import type { QuoteEligibility, WalletView } from '@segmentpay/shared';
import { smartSplit } from './smart-split.js';

function wallet(balances: Partial<Record<'cash' | 'gift' | 'cashback' | 'corporate', number>>): WalletView {
  const ids: Array<'cash' | 'gift' | 'cashback' | 'corporate'> = ['cash', 'gift', 'cashback', 'corporate'];
  const segments = ids.map((id) => ({
    id,
    name: id,
    nameFa: id,
    descriptionFa: '',
    balanceCents: balances[id] ?? 0,
    initialBalanceCents: balances[id] ?? 0,
    rules: {},
  }));
  return {
    totalBalanceCents: segments.reduce((s, seg) => s + seg.balanceCents, 0),
    segments,
  };
}

describe('smartSplit', () => {
  it('drains eligible wallet sources biggest-balance-first, in order, until the total is covered', () => {
    const totalCents = 10000; // €100
    const w = wallet({ cash: 3000, gift: 2500, cashback: 1500, corporate: 9000 });
    const eligibility: QuoteEligibility[] = [
      { source: 'cash', maxCents: 3000 },
      { source: 'gift', maxCents: 2500 },
      { source: 'cashback', maxCents: 1500 },
      { source: 'corporate', maxCents: 9000 },
      { source: 'card', maxCents: totalCents },
    ];

    const result = smartSplit(totalCents, w, eligibility);

    const sum = Object.values(result).reduce((a, b) => a + b, 0);
    expect(sum).toBe(totalCents);
    // corporate has the biggest max (9000) so it drains first, then cash covers the rest.
    expect(result.corporate).toBe(9000);
    expect(result.cash).toBe(1000);
    expect(result.gift).toBe(0);
    expect(result.cashback).toBe(0);
    expect(result.card).toBe(0);
  });

  it('respects eligibility: locked sources stay at 0, remainder lands on card', () => {
    const totalCents = 30100; // €301 electronics order
    const w = wallet({ cash: 7000, gift: 5000, cashback: 0, corporate: 9000 });
    const eligibility: QuoteEligibility[] = [
      { source: 'cash', maxCents: 7000 },
      { source: 'gift', maxCents: 0, reasonFa: 'اعتبار هدیه فقط برای مواد غذایی و مد' },
      { source: 'cashback', maxCents: 0, reasonFa: 'حداقل سفارش الزامی است' },
      { source: 'corporate', maxCents: 0, reasonFa: 'اعتبار سازمانی فقط برای لوازم اداری' },
      { source: 'card', maxCents: totalCents },
    ];

    const result = smartSplit(totalCents, w, eligibility);

    expect(result.gift).toBe(0);
    expect(result.cashback).toBe(0);
    expect(result.corporate).toBe(0);
    expect(result.cash).toBe(7000);
    expect(result.card).toBe(totalCents - 7000);
    expect(result.cash + result.card).toBe(totalCents);
  });

  it('falls back to an all-card allocation when every wallet segment is empty', () => {
    const totalCents = 399; // €3.99
    const w = wallet({ cash: 0, gift: 0, cashback: 0, corporate: 0 });
    const eligibility: QuoteEligibility[] = [
      { source: 'cash', maxCents: 0 },
      { source: 'gift', maxCents: 0 },
      { source: 'cashback', maxCents: 0 },
      { source: 'corporate', maxCents: 0 },
      { source: 'card', maxCents: totalCents },
    ];

    const result = smartSplit(totalCents, w, eligibility);

    expect(result).toEqual({ cash: 0, gift: 0, cashback: 0, corporate: 0, card: totalCents });
  });

  it('is idempotent — recomputing from the same inputs yields the same split', () => {
    const totalCents = 4990;
    const w = wallet({ cash: 2000, gift: 1500, cashback: 0, corporate: 0 });
    const eligibility: QuoteEligibility[] = [
      { source: 'cash', maxCents: 2000 },
      { source: 'gift', maxCents: 1500 },
      { source: 'cashback', maxCents: 0 },
      { source: 'corporate', maxCents: 0 },
      { source: 'card', maxCents: totalCents },
    ];

    const first = smartSplit(totalCents, w, eligibility);
    const second = smartSplit(totalCents, w, eligibility);

    expect(second).toEqual(first);
  });

  it('is a no-op total when eligibility has not resolved yet (empty array)', () => {
    const totalCents = 10000;
    const result = smartSplit(totalCents, undefined, []);
    expect(result).toEqual({ cash: 0, gift: 0, cashback: 0, corporate: 0, card: totalCents });
  });
});
