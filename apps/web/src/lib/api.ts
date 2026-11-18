import type {
  WalletView,
  Product,
  Order,
  QuoteResponse,
  PayRequest,
  PayResponse,
  RefundRequest,
  RefundResponse,
  LedgerEntry,
  JiraTicket,
  CartItemInput,
  AllocationInput,
  PaymentGatewayMode,
} from '@segmentpay/shared';

export class ApiError extends Error {
  code: string;
  messageFa: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, messageFa: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.messageFa = messageFa;
    this.details = details;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    let body: { error?: { code: string; message: string; messageFa: string; details?: Record<string, unknown> } };
    try {
      body = await res.json();
    } catch {
      throw new ApiError('NETWORK_ERROR', res.statusText, 'خطای شبکه');
    }
    const e = body?.error;
    throw new ApiError(
      e?.code ?? 'UNKNOWN',
      e?.message ?? res.statusText,
      e?.messageFa ?? 'خطای ناشناخته',
      e?.details,
    );
  }

  return res.json() as Promise<T>;
}

// Wallet
export function getWallet(): Promise<WalletView> {
  return request<WalletView>('/api/wallet');
}

// Products
export function getProducts(): Promise<Product[]> {
  return request<Product[]>('/api/products');
}

// Orders
export function getOrder(orderId: string): Promise<Order> {
  return request<Order>(`/api/orders/${orderId}`);
}

export function getOrders(): Promise<Order[]> {
  return request<Order[]>('/api/orders');
}

export function createOrder(items: CartItemInput[]): Promise<Order> {
  return request<Order>('/api/orders', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

// Quote
export function quoteOrder(orderId: string, allocations: AllocationInput[]): Promise<QuoteResponse> {
  return request<QuoteResponse>(`/api/orders/${orderId}/quote`, {
    method: 'POST',
    body: JSON.stringify({ allocations }),
  });
}

// Pay
export function payOrder(orderId: string, payload: PayRequest): Promise<PayResponse> {
  return request<PayResponse>(`/api/orders/${orderId}/pay`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Refund
export function refundOrder(orderId: string, payload: RefundRequest): Promise<RefundResponse> {
  return request<RefundResponse>(`/api/orders/${orderId}/refund`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Ledger
export function getLedger(): Promise<LedgerEntry[]> {
  return request<LedgerEntry[]>('/api/ledger');
}

// Jira
export function getJiraTickets(): Promise<JiraTicket[]> {
  return request<JiraTicket[]>('/api/jira/tickets');
}

// Dev endpoints
export function devReset(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/api/dev/reset', { method: 'POST' });
}

export function devSetGateway(mode: PaymentGatewayMode): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/api/dev/gateway', {
    method: 'POST',
    body: JSON.stringify({ mode }),
  });
}
