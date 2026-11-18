import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  WalletView,
  Product,
  Order,
  QuoteResponse,
  PayResponse,
  RefundResponse,
  LedgerEntry,
  JiraTicket,
  CartItemInput,
  AllocationInput,
  PaymentGatewayMode,
  PayRequest,
} from '@segmentpay/shared';
import {
  getWallet,
  getProducts,
  getOrder,
  getOrders,
  createOrder,
  quoteOrder,
  payOrder,
  refundOrder,
  getLedger,
  getJiraTickets,
  devReset,
  devSetGateway,
} from './api.js';
import { newIdempotencyKey } from './idempotency.js';

export const KEYS = {
  wallet: ['wallet'] as const,
  products: ['products'] as const,
  orders: ['orders'] as const,
  order: (id: string) => ['orders', id] as const,
  ledger: ['ledger'] as const,
  jira: ['jira'] as const,
};

export function useWallet(): UseQueryResult<WalletView> {
  return useQuery({ queryKey: KEYS.wallet, queryFn: getWallet });
}

export function useProducts(): UseQueryResult<Product[]> {
  return useQuery({ queryKey: KEYS.products, queryFn: getProducts });
}

export function useOrders(): UseQueryResult<Order[]> {
  return useQuery({ queryKey: KEYS.orders, queryFn: getOrders });
}

export function useOrder(orderId: string): UseQueryResult<Order> {
  return useQuery({
    queryKey: KEYS.order(orderId),
    queryFn: () => getOrder(orderId),
    enabled: !!orderId,
  });
}

export function useLedger(): UseQueryResult<LedgerEntry[]> {
  return useQuery({ queryKey: KEYS.ledger, queryFn: getLedger });
}

export function useJiraTickets(): UseQueryResult<JiraTicket[]> {
  return useQuery({ queryKey: KEYS.jira, queryFn: getJiraTickets });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: CartItemInput[]) => createOrder(items),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.orders });
    },
  });
}

export function useQuote() {
  return useMutation({
    mutationFn: ({ orderId, allocations }: { orderId: string; allocations: AllocationInput[] }) =>
      quoteOrder(orderId, allocations),
  });
}

export function usePay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: PayRequest }) =>
      payOrder(orderId, payload),
    onSuccess: (data: PayResponse) => {
      void qc.invalidateQueries({ queryKey: KEYS.wallet });
      void qc.invalidateQueries({ queryKey: KEYS.orders });
      void qc.invalidateQueries({ queryKey: KEYS.order(data.order.id) });
      void qc.invalidateQueries({ queryKey: KEYS.ledger });
    },
  });
}

export function useRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId }: { orderId: string }) =>
      refundOrder(orderId, { idempotencyKey: newIdempotencyKey() }),
    onSuccess: (data: RefundResponse) => {
      void qc.invalidateQueries({ queryKey: KEYS.wallet });
      void qc.invalidateQueries({ queryKey: KEYS.orders });
      void qc.invalidateQueries({ queryKey: KEYS.order(data.orderId) });
      void qc.invalidateQueries({ queryKey: KEYS.ledger });
    },
  });
}

export function useReset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => devReset(),
    onSuccess: () => {
      void qc.invalidateQueries();
    },
  });
}

export function useSetGateway() {
  return useMutation({
    mutationFn: (mode: PaymentGatewayMode) => devSetGateway(mode),
  });
}
