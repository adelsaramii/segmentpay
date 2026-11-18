import type {
  LedgerEntry,
  Order,
  PaymentAttempt,
  WalletSegment,
  Product,
  PaymentGatewayMode,
} from '@segmentpay/shared';
import { createSeedSegments, createSeedProducts } from './seed.js';

export interface Refund {
  id: string;
  orderId: string;
  idempotencyKey: string;
  createdAt: string;
  reversedAllocations: Array<{ source: string; amountCents: number }>;
  cardRefundCents: number;
}

export interface IdempotencyRecord {
  attemptId: string;
  payloadHash: string;
}

export interface AppState {
  ledger: LedgerEntry[];
  orders: Map<string, Order>;
  paymentAttempts: Map<string, PaymentAttempt>;
  refunds: Map<string, Refund>;
  idempotencyByKey: Map<string, IdempotencyRecord>;
  refundIdempotency: Map<string, string>; // key -> refundId
  segments: Map<string, WalletSegment>;
  products: Map<string, Product>;
  gatewayMode: PaymentGatewayMode;
  orderCounter: number;
  ledgerCounter: number;
  attemptCounter: number;
  refundCounter: number;
  mutexMap: Map<string, Promise<void>>;
}

let _state: AppState = createFreshState();

function createFreshState(): AppState {
  const segments = new Map<string, WalletSegment>();
  for (const seg of createSeedSegments()) {
    segments.set(seg.id, { ...seg });
  }
  const products = new Map<string, Product>();
  for (const p of createSeedProducts()) {
    products.set(p.id, { ...p });
  }
  return {
    ledger: [],
    orders: new Map(),
    paymentAttempts: new Map(),
    refunds: new Map(),
    idempotencyByKey: new Map(),
    refundIdempotency: new Map(),
    segments,
    products,
    gatewayMode: 'success',
    orderCounter: 10001,
    ledgerCounter: 1,
    attemptCounter: 1,
    refundCounter: 1,
    mutexMap: new Map(),
  };
}

export function resetState(): void {
  _state = createFreshState();
}

export function getState(): AppState {
  return _state;
}
