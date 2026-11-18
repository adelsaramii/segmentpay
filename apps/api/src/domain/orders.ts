import type { Order, CartItemInput, OrderItem, ProductCategory } from '@segmentpay/shared';
import { getState } from './state.js';
import { SHIPPING_CENTS } from './seed.js';

export function createOrder(items: CartItemInput[]): Order {
  const state = getState();

  if (!items || items.length === 0) {
    throw { code: 'EMPTY_CART', message: 'Cart is empty', messageFa: 'سبد خرید خالی است', status: 400 };
  }

  const orderItems: OrderItem[] = [];
  const categoriesSet = new Set<ProductCategory>();

  for (const item of items) {
    const product = state.products.get(item.productId);
    if (!product) {
      throw {
        code: 'PRODUCT_NOT_FOUND',
        message: `Product not found: ${item.productId}`,
        messageFa: `محصول یافت نشد: ${item.productId}`,
        status: 404,
      };
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw {
        code: 'INVALID_QUANTITY',
        message: `Invalid quantity for ${item.productId}`,
        messageFa: `مقدار نامعتبر برای ${item.productId}`,
        status: 400,
      };
    }
    const lineTotal = product.priceCents * item.quantity;
    orderItems.push({
      productId: product.id,
      title: product.title,
      titleFa: product.titleFa,
      category: product.category,
      unitPriceCents: product.priceCents,
      quantity: item.quantity,
      lineTotalCents: lineTotal,
    });
    categoriesSet.add(product.category);
  }

  const itemsTotal = orderItems.reduce((acc, i) => acc + i.lineTotalCents, 0);
  const id = `ORD-${state.orderCounter++}`;

  const order: Order = {
    id,
    createdAt: new Date().toISOString(),
    items: orderItems,
    itemsTotalCents: itemsTotal,
    shippingCents: SHIPPING_CENTS,
    totalCents: itemsTotal + SHIPPING_CENTS,
    status: 'pending_payment',
    categoriesPresent: Array.from(categoriesSet),
  };

  state.orders.set(id, order);
  return order;
}

export function getOrder(id: string): Order | undefined {
  return getState().orders.get(id);
}

export function listOrders(): Order[] {
  return Array.from(getState().orders.values());
}
