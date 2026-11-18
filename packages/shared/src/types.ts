import type { Cents } from './money.js';

export type ProductCategory = 'grocery' | 'fashion' | 'electronics' | 'office';

export interface Product {
  id: string;
  title: string;
  titleFa: string;
  category: ProductCategory;
  priceCents: Cents;
  emoji: string;
}

export interface CartItemInput {
  productId: string;
  quantity: number;
}

export type WalletSegmentId = 'cash' | 'gift' | 'cashback' | 'corporate';

export interface SegmentRule {
  allowedCategories?: ProductCategory[];
  minOrderCents?: Cents;
  maxShareOfOrderBps?: number; // basis points, 10000 == 100%
}

export interface WalletSegment {
  id: WalletSegmentId;
  name: string;
  nameFa: string;
  descriptionFa: string;
  balanceCents: Cents;
  initialBalanceCents: Cents;
  rules: SegmentRule;
}

export interface WalletView {
  totalBalanceCents: Cents;
  segments: WalletSegment[];
}

export type OrderStatus =
  | 'draft'
  | 'pending_payment'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'refunded';

export type PaymentSourceId = WalletSegmentId | 'card';

export interface OrderItem {
  productId: string;
  title: string;
  titleFa: string;
  category: ProductCategory;
  unitPriceCents: Cents;
  quantity: number;
  lineTotalCents: Cents;
}

export interface Order {
  id: string;
  createdAt: string;
  items: OrderItem[];
  itemsTotalCents: Cents;
  shippingCents: Cents;
  totalCents: Cents;
  status: OrderStatus;
  categoriesPresent: ProductCategory[];
}

export interface AllocationInput {
  source: PaymentSourceId;
  amountCents: Cents;
}

export interface QuoteEligibility {
  source: PaymentSourceId;
  maxCents: Cents;
  reasonFa?: string;
  reason?: string;
}

export interface QuoteResponse {
  orderId: string;
  totalCents: Cents;
  eligibility: QuoteEligibility[];
}

export type PaymentGatewayMode =
  | 'success'
  | 'card_declined'
  | 'network_error';

export interface PayRequest {
  allocations: AllocationInput[];
  gatewayMode?: PaymentGatewayMode;
  idempotencyKey: string;
}

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'refunded';

export interface PaymentAttempt {
  id: string;
  orderId: string;
  idempotencyKey: string;
  createdAt: string;
  status: PaymentStatus;
  allocations: AllocationInput[];
  gatewayMode: PaymentGatewayMode;
  failureCode?: string;
  failureMessage?: string;
  failureMessageFa?: string;
}

export interface PayResponse {
  payment: PaymentAttempt;
  order: Order;
}

export interface RefundRequest {
  idempotencyKey: string;
}

export interface RefundResponse {
  refundId: string;
  orderId: string;
  reversedAllocations: AllocationInput[];
  cardRefundCents: Cents;
  createdAt: string;
  order: Order;
}

export type LedgerEntryType =
  | 'debit'
  | 'credit'
  | 'reservation'
  | 'commit'
  | 'reversal';

export interface LedgerEntry {
  id: string;
  createdAt: string;
  orderId: string;
  paymentAttemptId?: string;
  refundId?: string;
  source: PaymentSourceId;
  type: LedgerEntryType;
  amountCents: Cents;
  state: 'reserved' | 'committed' | 'reversed';
  note?: string;
  noteFa?: string;
  reasonCode?: string;
}

export interface ApiError {
  code: string;
  message: string;
  messageFa: string;
  details?: Record<string, unknown>;
}

export interface JiraTicket {
  key: string;
  summary: string;
  summaryFa: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  route: string;
  userStory: string;
  userStoryFa: string;
  description: string;
  descriptionFa: string;
  preconditions: string[];
  acceptanceCriteria: Array<{
    given: string;
    when: string;
    then: string;
  }>;
  scenarios: {
    happyPath: string;
    negative: string;
  };
  expectedResults: string[];
  testIds: string[];
}

export const CATEGORY_LABEL_FA: Record<ProductCategory, string> = {
  grocery: 'مواد غذایی',
  fashion: 'مد و پوشاک',
  electronics: 'الکترونیک',
  office: 'لوازم اداری',
};

export const SEGMENT_LABEL_FA: Record<WalletSegmentId, string> = {
  cash: 'موجودی نقدی',
  gift: 'اعتبار هدیه',
  cashback: 'کش‌بک',
  corporate: 'اعتبار سازمانی',
};

export const SOURCE_LABEL_FA: Record<PaymentSourceId, string> = {
  cash: 'موجودی نقدی',
  gift: 'اعتبار هدیه',
  cashback: 'کش‌بک',
  corporate: 'اعتبار سازمانی',
  card: 'کارت بانکی',
};
