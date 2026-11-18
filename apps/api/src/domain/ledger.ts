import type { LedgerEntry, PaymentSourceId, WalletSegment, WalletView } from '@segmentpay/shared';
import { getState } from './state.js';

export function makeLedgerEntry(
  partial: Omit<LedgerEntry, 'id' | 'createdAt'>
): LedgerEntry {
  const state = getState();
  const id = `ldg_${state.ledgerCounter++}`;
  return {
    id,
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

export function appendLedger(entry: LedgerEntry): void {
  getState().ledger.push(entry);
}

export function computeSegmentBalance(
  state: ReturnType<typeof getState>,
  segmentId: PaymentSourceId
): number {
  const seg = state.segments.get(segmentId as string);
  if (!seg) return 0;

  // Build a set of paymentAttemptIds that have been committed or reversed per source,
  // so we don't double-count reservation+commit entries.
  const resolvedAttemptIds = new Set<string>();
  for (const entry of state.ledger) {
    if (entry.source !== segmentId) continue;
    if (!entry.paymentAttemptId) continue;
    if (entry.type === 'commit' || entry.type === 'reversal') {
      resolvedAttemptIds.add(entry.paymentAttemptId);
    }
  }

  let balance = seg.initialBalanceCents;

  for (const entry of state.ledger) {
    if (entry.source !== segmentId) continue;
    if (entry.state === 'reversed') continue;

    if (entry.type === 'reservation') {
      // Only count the reservation if it has not been resolved (committed/reversed)
      if (entry.paymentAttemptId && resolvedAttemptIds.has(entry.paymentAttemptId)) {
        continue;
      }
      balance -= entry.amountCents;
    } else if (entry.type === 'debit' || entry.type === 'commit') {
      balance -= entry.amountCents;
    } else if (entry.type === 'credit') {
      balance += entry.amountCents;
    }
  }

  return balance;
}

export function computeWalletView(state: ReturnType<typeof getState>): WalletView {
  const segments: WalletSegment[] = [];
  let total = 0;

  for (const seg of state.segments.values()) {
    const balanceCents = computeSegmentBalance(state, seg.id);
    total += balanceCents;
    segments.push({ ...seg, balanceCents });
  }

  return {
    totalBalanceCents: total,
    segments,
  };
}
