import type {
  PayRequest,
  PayResponse,
  PaymentAttempt,
  PaymentGatewayMode,
  RefundRequest,
  RefundResponse,
  AllocationInput,
  LedgerEntryType,
} from '@segmentpay/shared';
import { getState } from './state.js';
import { makeLedgerEntry, appendLedger, computeSegmentBalance } from './ledger.js';
import { validateAllocation } from './eligibility.js';
import { getOrder } from './orders.js';
import { createHash } from 'crypto';

function hashPayload(body: PayRequest): string {
  const normalized = JSON.stringify({
    allocations: [...body.allocations].sort((a, b) =>
      a.source.localeCompare(b.source)
    ),
    gatewayMode: body.gatewayMode ?? null,
  });
  return createHash('sha256').update(normalized).digest('hex');
}

export function simulateGateway(mode: PaymentGatewayMode): { ok: boolean; code?: string } {
  if (mode === 'success') return { ok: true };
  if (mode === 'card_declined') return { ok: false, code: 'CARD_DECLINED' };
  if (mode === 'network_error') return { ok: false, code: 'NETWORK_ERROR' };
  return { ok: true };
}

function withOrderMutex<T>(orderId: string, fn: () => Promise<T>): Promise<T> {
  const state = getState();
  const existing = state.mutexMap.get(orderId) ?? Promise.resolve();
  let resolveOuter!: () => void;
  const gate = new Promise<void>((res) => {
    resolveOuter = res;
  });
  const next = existing.then(() => fn()).finally(() => {
    resolveOuter();
  });
  state.mutexMap.set(orderId, gate.then(() => { /* intentional */ }));
  // Chain: when fn resolves/rejects, gate resolves so the next waiter can proceed
  next.then(() => resolveOuter(), () => resolveOuter());
  return next;
}

export async function payOrder(orderId: string, body: PayRequest): Promise<PayResponse> {
  return withOrderMutex(orderId, async () => {
    const state = getState();
    const order = state.orders.get(orderId);

    if (!order) {
      throw { code: 'NOT_FOUND', message: 'Order not found', messageFa: 'سفارش یافت نشد', status: 404 };
    }

    const payloadHash = hashPayload(body);
    const existing = state.idempotencyByKey.get(body.idempotencyKey);

    if (existing) {
      if (existing.payloadHash !== payloadHash) {
        throw {
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'Idempotency key reused with a different payload',
          messageFa: 'کلید بی‌قراردادی با داده متفاوت تکرار شده',
          status: 409,
        };
      }
      // Same key + same payload → return cached
      const attempt = state.paymentAttempts.get(existing.attemptId);
      if (attempt) {
        return { payment: attempt, order };
      }
    }

    if (order.status === 'paid') {
      throw {
        code: 'ORDER_ALREADY_PAID',
        message: 'Order has already been paid',
        messageFa: 'این سفارش قبلاً پرداخت شده',
        status: 409,
      };
    }

    // Validate allocations
    const validation = validateAllocation(order, body.allocations, state);
    if (!validation.ok) {
      throw { ...validation, status: 400 };
    }

    const mode = body.gatewayMode ?? state.gatewayMode;
    const attemptId = `pay_${state.attemptCounter++}`;
    const now = new Date().toISOString();

    const attempt: PaymentAttempt = {
      id: attemptId,
      orderId,
      idempotencyKey: body.idempotencyKey,
      createdAt: now,
      status: 'processing',
      allocations: body.allocations,
      gatewayMode: mode,
    };
    state.paymentAttempts.set(attemptId, attempt);

    // Append reservation entries for wallet sources
    const walletAllocs = body.allocations.filter((a) => a.source !== 'card');
    const cardAlloc = body.allocations.find((a) => a.source === 'card');

    for (const alloc of walletAllocs) {
      appendLedger(
        makeLedgerEntry({
          orderId,
          paymentAttemptId: attemptId,
          source: alloc.source,
          type: 'reservation',
          amountCents: alloc.amountCents,
          state: 'reserved',
          note: `Reserve ${alloc.source} for order ${orderId}`,
        })
      );
    }

    // Also append card reservation for ledger visualization
    if (cardAlloc && cardAlloc.amountCents > 0) {
      appendLedger(
        makeLedgerEntry({
          orderId,
          paymentAttemptId: attemptId,
          source: 'card',
          type: 'reservation',
          amountCents: cardAlloc.amountCents,
          state: 'reserved',
          note: `Reserve card for order ${orderId}`,
        })
      );
    }

    // Call gateway
    const gatewayResult = simulateGateway(mode);

    if (gatewayResult.ok) {
      // Commit wallet reservations
      for (const alloc of walletAllocs) {
        appendLedger(
          makeLedgerEntry({
            orderId,
            paymentAttemptId: attemptId,
            source: alloc.source,
            type: 'commit',
            amountCents: alloc.amountCents,
            state: 'committed',
            note: `Commit ${alloc.source} for order ${orderId}`,
          })
        );
      }
      // Commit card
      if (cardAlloc && cardAlloc.amountCents > 0) {
        appendLedger(
          makeLedgerEntry({
            orderId,
            paymentAttemptId: attemptId,
            source: 'card',
            type: 'commit',
            amountCents: cardAlloc.amountCents,
            state: 'committed',
            note: `Commit card charge for order ${orderId}`,
          })
        );
      }

      order.status = 'paid';
      attempt.status = 'paid';
    } else {
      // Reverse wallet reservations
      for (const alloc of walletAllocs) {
        appendLedger(
          makeLedgerEntry({
            orderId,
            paymentAttemptId: attemptId,
            source: alloc.source,
            type: 'reversal',
            amountCents: alloc.amountCents,
            state: 'reversed',
            note: `Reverse ${alloc.source} due to ${gatewayResult.code}`,
            reasonCode: gatewayResult.code,
          })
        );
      }
      // Reverse card reservation
      if (cardAlloc && cardAlloc.amountCents > 0) {
        appendLedger(
          makeLedgerEntry({
            orderId,
            paymentAttemptId: attemptId,
            source: 'card',
            type: 'reversal',
            amountCents: cardAlloc.amountCents,
            state: 'reversed',
            note: `Reverse card due to ${gatewayResult.code}`,
            reasonCode: gatewayResult.code,
          })
        );
      }

      order.status = 'failed';
      attempt.status = 'failed';
      attempt.failureCode = gatewayResult.code;
      attempt.failureMessage = `Payment failed: ${gatewayResult.code}`;
      attempt.failureMessageFa = `پرداخت ناموفق: ${gatewayResult.code}`;
    }

    // Store idempotency record
    state.idempotencyByKey.set(body.idempotencyKey, {
      attemptId,
      payloadHash,
    });

    return { payment: attempt, order };
  });
}

export async function refundOrder(orderId: string, body: RefundRequest): Promise<RefundResponse> {
  return withOrderMutex(orderId, async () => {
    const state = getState();
    const order = state.orders.get(orderId);

    if (!order) {
      throw { code: 'NOT_FOUND', message: 'Order not found', messageFa: 'سفارش یافت نشد', status: 404 };
    }

    if (order.status !== 'paid') {
      throw {
        code: 'NOT_REFUNDABLE',
        message: 'Order is not in a refundable state',
        messageFa: 'سفارش قابل بازگشت نیست',
        status: 409,
      };
    }

    // Check idempotency
    const existingRefundId = state.refundIdempotency.get(body.idempotencyKey);
    if (existingRefundId) {
      const existingRefund = state.refunds.get(existingRefundId);
      if (existingRefund) {
        return {
          refundId: existingRefund.id,
          orderId,
          reversedAllocations: existingRefund.reversedAllocations as AllocationInput[],
          cardRefundCents: existingRefund.cardRefundCents,
          createdAt: existingRefund.createdAt,
          order,
        };
      }
    }

    // Find the committed payment attempt
    let committedAttempt: PaymentAttempt | undefined;
    for (const attempt of state.paymentAttempts.values()) {
      if (attempt.orderId === orderId && attempt.status === 'paid') {
        committedAttempt = attempt;
        break;
      }
    }

    if (!committedAttempt) {
      throw {
        code: 'NOT_REFUNDABLE',
        message: 'No committed payment attempt found',
        messageFa: 'تراکنش پرداخت‌شده‌ای یافت نشد',
        status: 409,
      };
    }

    const refundId = `ref_${state.refundCounter++}`;
    const now = new Date().toISOString();

    const walletAllocs = committedAttempt.allocations.filter((a) => a.source !== 'card');
    const cardAlloc = committedAttempt.allocations.find((a) => a.source === 'card');
    const cardRefundCents = cardAlloc?.amountCents ?? 0;

    // Append credit entries for wallet sources
    for (const alloc of walletAllocs) {
      appendLedger(
        makeLedgerEntry({
          orderId,
          refundId,
          source: alloc.source,
          type: 'credit',
          amountCents: alloc.amountCents,
          state: 'committed',
          note: `Refund ${alloc.source} for order ${orderId}`,
        })
      );
    }

    // Append card credit entry
    if (cardRefundCents > 0) {
      appendLedger(
        makeLedgerEntry({
          orderId,
          refundId,
          source: 'card',
          type: 'credit',
          amountCents: cardRefundCents,
          state: 'committed',
          note: `Card refund for order ${orderId}`,
        })
      );
    }

    order.status = 'refunded';

    const refund = {
      id: refundId,
      orderId,
      idempotencyKey: body.idempotencyKey,
      createdAt: now,
      reversedAllocations: walletAllocs,
      cardRefundCents,
    };
    state.refunds.set(refundId, refund);
    state.refundIdempotency.set(body.idempotencyKey, refundId);

    return {
      refundId,
      orderId,
      reversedAllocations: walletAllocs,
      cardRefundCents,
      createdAt: now,
      order,
    };
  });
}
