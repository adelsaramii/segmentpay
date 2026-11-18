import type {
  Order,
  QuoteEligibility,
  AllocationInput,
  ProductCategory,
} from '@segmentpay/shared';
import { getState } from './state.js';
import { computeSegmentBalance } from './ledger.js';

export function evaluateEligibility(
  order: Order,
  state: ReturnType<typeof getState>
): QuoteEligibility[] {
  const total = order.totalCents;
  const categories = order.categoriesPresent as ProductCategory[];

  const allGroceryOrFashion = categories.every(
    (c) => c === 'grocery' || c === 'fashion'
  );
  const allOffice = categories.every((c) => c === 'office');

  // Cash: always usable, capped at min(balance, total)
  const cashBalance = computeSegmentBalance(state, 'cash');
  const cashMax = Math.min(cashBalance, total);

  // Gift: only if all items are grocery or fashion
  const giftBalance = computeSegmentBalance(state, 'gift');
  let giftMax: number;
  let giftReasonFa: string | undefined;
  if (allGroceryOrFashion) {
    giftMax = Math.min(giftBalance, total);
  } else {
    giftMax = 0;
    giftReasonFa = 'اعتبار هدیه فقط برای مواد غذایی و مد';
  }

  // Cashback: only if total >= 2000c, max = min(balance, floor(total * 2000 / 10000))
  const cashbackBalance = computeSegmentBalance(state, 'cashback');
  let cashbackMax: number;
  let cashbackReasonFa: string | undefined;
  if (total >= 2000) {
    const cap = Math.floor((total * 2000) / 10000);
    cashbackMax = Math.min(cashbackBalance, cap);
  } else {
    cashbackMax = 0;
    cashbackReasonFa = 'حداقل سفارش €20.00 الزامی است';
  }

  // Corporate: only if all items are office
  const corporateBalance = computeSegmentBalance(state, 'corporate');
  let corporateMax: number;
  let corporateReasonFa: string | undefined;
  if (allOffice) {
    corporateMax = Math.min(corporateBalance, total);
  } else {
    corporateMax = 0;
    corporateReasonFa = 'اعتبار سازمانی فقط برای لوازم اداری';
  }

  // Card: always total, no reasonFa
  const cardMax = total;

  const result: QuoteEligibility[] = [
    { source: 'cash', maxCents: cashMax },
    {
      source: 'gift',
      maxCents: giftMax,
      ...(giftReasonFa ? { reasonFa: giftReasonFa } : {}),
    },
    {
      source: 'cashback',
      maxCents: cashbackMax,
      ...(cashbackReasonFa ? { reasonFa: cashbackReasonFa } : {}),
    },
    {
      source: 'corporate',
      maxCents: corporateMax,
      ...(corporateReasonFa ? { reasonFa: corporateReasonFa } : {}),
    },
    { source: 'card', maxCents: cardMax },
  ];

  return result;
}

export function validateAllocation(
  order: Order,
  allocations: AllocationInput[],
  state: ReturnType<typeof getState>
): { ok: true } | { ok: false; code: string; message: string; messageFa: string; details?: Record<string, unknown> } {
  // Check all amounts are non-negative integers
  for (const alloc of allocations) {
    if (!Number.isInteger(alloc.amountCents) || alloc.amountCents < 0) {
      return {
        ok: false,
        code: 'INVALID_AMOUNT',
        message: `Amount for ${alloc.source} must be a non-negative integer`,
        messageFa: `مبلغ برای ${alloc.source} باید عدد صحیح غیر منفی باشد`,
      };
    }
  }

  // Check sum equals order total
  const sum = allocations.reduce((acc, a) => acc + a.amountCents, 0);
  if (sum !== order.totalCents) {
    return {
      ok: false,
      code: 'ALLOCATION_MISMATCH',
      message: `Allocation sum ${sum} does not equal order total ${order.totalCents}`,
      messageFa: `جمع تخصیص‌ها (${sum}) با مبلغ کل سفارش (${order.totalCents}) برابر نیست`,
      details: { allocatedCents: sum, totalCents: order.totalCents },
    };
  }

  // Get eligibility
  const eligibility = evaluateEligibility(order, state);
  const eligMap = new Map(eligibility.map((e) => [e.source, e]));

  for (const alloc of allocations) {
    if (alloc.amountCents === 0) continue;

    const elig = eligMap.get(alloc.source);
    if (!elig) {
      return {
        ok: false,
        code: 'UNKNOWN_SOURCE',
        message: `Unknown payment source: ${alloc.source}`,
        messageFa: `منبع پرداخت نامعتبر: ${alloc.source}`,
      };
    }

    if (alloc.amountCents > elig.maxCents) {
      return {
        ok: false,
        code: 'INELIGIBLE_SEGMENT',
        message: `${alloc.source} max is ${elig.maxCents} but requested ${alloc.amountCents}`,
        messageFa: elig.reasonFa ?? `حداکثر مجاز برای ${alloc.source} برابر ${elig.maxCents} است`,
        details: { source: alloc.source, maxCents: elig.maxCents, requestedCents: alloc.amountCents },
      };
    }

    // Also check wallet balance directly for wallet sources
    if (alloc.source !== 'card') {
      const balance = computeSegmentBalance(state, alloc.source);
      if (alloc.amountCents > balance) {
        return {
          ok: false,
          code: 'INSUFFICIENT_SEGMENT_BALANCE',
          message: `Insufficient balance in ${alloc.source}: have ${balance}, need ${alloc.amountCents}`,
          messageFa: `موجودی کافی در ${alloc.source} وجود ندارد`,
          details: { source: alloc.source, balanceCents: balance, requestedCents: alloc.amountCents },
        };
      }
    }
  }

  return { ok: true };
}
