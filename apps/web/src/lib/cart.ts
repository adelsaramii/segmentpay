import { useSyncExternalStore, useCallback } from 'react';
import type { Product } from '@segmentpay/shared';
import { sumCents } from '@segmentpay/shared';

export const SHIPPING_CENTS = 200; // €2.00

type CartMap = Record<string, number>; // productId → quantity

const STORAGE_KEY = 'segmentpay.cart';

function readStorage(): CartMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CartMap;
  } catch {
    return {};
  }
}

function writeStorage(map: CartMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: CartMap = readStorage();

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): CartMap {
  return cache;
}

function notify(next: CartMap): void {
  cache = next;
  writeStorage(next);
  listeners.forEach((l) => l());
}

function add(productId: string, qty = 1): void {
  const next = { ...cache };
  next[productId] = (next[productId] ?? 0) + qty;
  notify(next);
}

function remove(productId: string): void {
  const next = { ...cache };
  delete next[productId];
  notify(next);
}

function setQty(productId: string, qty: number): void {
  if (qty <= 0) {
    remove(productId);
    return;
  }
  const next = { ...cache, [productId]: qty };
  notify(next);
}

function clear(): void {
  notify({});
}

export function useCart() {
  const cartMap = useSyncExternalStore(subscribe, getSnapshot);

  const lines = useCallback(
    (products: Product[]) =>
      products
        .filter((p) => (cartMap[p.id] ?? 0) > 0)
        .map((p) => ({ product: p, qty: cartMap[p.id] })),
    [cartMap],
  );

  const subtotal = useCallback(
    (products: Product[]) =>
      sumCents(
        products
          .filter((p) => (cartMap[p.id] ?? 0) > 0)
          .map((p) => p.priceCents * (cartMap[p.id] ?? 0)),
      ),
    [cartMap],
  );

  const total = useCallback(
    (products: Product[]) => subtotal(products) + SHIPPING_CENTS,
    [subtotal],
  );

  const count = Object.values(cartMap).reduce((s, q) => s + q, 0);

  return {
    cartMap,
    add,
    remove,
    setQty,
    clear,
    lines,
    subtotal,
    total,
    count,
  };
}

export { add as cartAdd, remove as cartRemove, setQty as cartSetQty, clear as cartClear };
