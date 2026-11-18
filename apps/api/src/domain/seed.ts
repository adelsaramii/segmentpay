import type { WalletSegment, Product } from '@segmentpay/shared';

export const SHIPPING_CENTS = 200;

export function createSeedSegments(): WalletSegment[] {
  return [
    {
      id: 'cash',
      name: 'Cash',
      nameFa: 'موجودی نقدی',
      descriptionFa: 'قابل استفاده برای هر سفارش',
      balanceCents: 12000,
      initialBalanceCents: 12000,
      rules: {},
    },
    {
      id: 'gift',
      name: 'Gift',
      nameFa: 'اعتبار هدیه',
      descriptionFa: 'فقط برای سفارش‌های مواد غذایی و مد',
      balanceCents: 2500,
      initialBalanceCents: 2500,
      rules: { allowedCategories: ['grocery', 'fashion'] },
    },
    {
      id: 'cashback',
      name: 'Cashback',
      nameFa: 'کش‌بک',
      descriptionFa: 'برای سفارش‌های بالای €۲۰، حداکثر ۲۰٪ مبلغ سفارش',
      balanceCents: 1500,
      initialBalanceCents: 1500,
      rules: { minOrderCents: 2000, maxShareOfOrderBps: 2000 },
    },
    {
      id: 'corporate',
      name: 'Corporate',
      nameFa: 'اعتبار سازمانی',
      descriptionFa: 'فقط برای لوازم اداری',
      balanceCents: 6000,
      initialBalanceCents: 6000,
      rules: { allowedCategories: ['office'] },
    },
  ];
}

export function createSeedProducts(): Product[] {
  return [
    {
      id: 'grocery-banana',
      title: 'Fresh Bananas',
      titleFa: 'موز تازه',
      category: 'grocery',
      priceCents: 199,
      emoji: '🍌',
    },
    {
      id: 'grocery-milk',
      title: 'Low-fat Milk 1L',
      titleFa: 'شیر کم‌چرب ۱ لیتری',
      category: 'grocery',
      priceCents: 149,
      emoji: '🥛',
    },
    {
      id: 'grocery-fruitpack',
      title: 'Fresh Fruit Pack',
      titleFa: 'پک میوه تازه',
      category: 'grocery',
      priceCents: 2450,
      emoji: '🧺',
    },
    {
      id: 'fashion-tshirt',
      title: 'Plain T-Shirt',
      titleFa: 'تی‌شرت ساده',
      category: 'fashion',
      priceCents: 1990,
      emoji: '👕',
    },
    {
      id: 'fashion-dress',
      title: 'Summer Dress',
      titleFa: 'پیراهن تابستانی',
      category: 'fashion',
      priceCents: 3990,
      emoji: '👗',
    },
    {
      id: 'electronics-headphones',
      title: 'Bluetooth Headphones',
      titleFa: 'هدفون بلوتوث',
      category: 'electronics',
      priceCents: 4900,
      emoji: '🎧',
    },
    {
      id: 'electronics-camera',
      title: 'Digital Camera',
      titleFa: 'دوربین دیجیتال',
      category: 'electronics',
      priceCents: 29900,
      emoji: '📷',
    },
    {
      id: 'office-notebook',
      title: 'Notebook A5',
      titleFa: 'دفتر یادداشت A5',
      category: 'office',
      priceCents: 450,
      emoji: '📓',
    },
    {
      id: 'office-pen',
      title: 'Ballpoint Pen',
      titleFa: 'خودکار',
      category: 'office',
      priceCents: 200,
      emoji: '✏️',
    },
  ];
}
