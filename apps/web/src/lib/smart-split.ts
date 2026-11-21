import type { Cents, PaymentSourceId, QuoteEligibility, WalletView } from '@segmentpay/shared';

const WALLET_SOURCES: readonly Exclude<PaymentSourceId, 'card'>[] = [
  'cash',
  'gift',
  'cashback',
  'corporate',
];

export function getMaxForSource(
  source: PaymentSourceId,
  totalCents: Cents,
  wallet: WalletView | undefined,
  eligibility: QuoteEligibility[],
): Cents {
  if (source === 'card') return totalCents;
  const elig = eligibility.find((e) => e.source === source);
  if (!elig || elig.maxCents === 0) return 0;
  const segBal = wallet?.segments.find((s) => s.id === source)?.balanceCents ?? 0;
  return Math.min(elig.maxCents, segBal, totalCents);
}

// Biggest-balance-first, eligibility-aware — deterministic given the same inputs (SPAY-113).
export function smartSplit(
  totalCents: Cents,
  wallet: WalletView | undefined,
  eligibility: QuoteEligibility[],
): Record<PaymentSourceId, Cents> {
  const allocations: Record<PaymentSourceId, Cents> = {
    cash: 0,
    gift: 0,
    cashback: 0,
    corporate: 0,
    card: 0,
  };

  const candidates = WALLET_SOURCES
    .map((source) => ({ source, maxCents: getMaxForSource(source, totalCents, wallet, eligibility) }))
    .filter((c) => c.maxCents > 0)
    .sort((a, b) => b.maxCents - a.maxCents);

  let remaining = totalCents;
  let usedAnySource = false;
  for (const { source, maxCents } of candidates) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, maxCents);
    allocations[source] = take;
    remaining -= take;
    usedAnySource = true;
  }

  if (remaining > 0) {
    allocations.card = remaining;
  } else if (!usedAnySource) {
    allocations.card = totalCents;
  }

  return allocations;
}
