import { FA_EURO, CATEGORY_LABEL_FA } from '@segmentpay/shared';
import type { Product } from '@segmentpay/shared';
import { useCart } from '../lib/cart.js';

interface ProductCardProps {
  product: Product;
  testId?: string;
}

export function ProductCard({ product, testId }: ProductCardProps) {
  const { cartMap, add, setQty } = useCart();
  const qty = cartMap[product.id] ?? 0;

  return (
    <div
      data-testid={testId ?? `catalog-product-${product.id}`}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col gap-2"
    >
      <div className="text-4xl text-center py-2">{product.emoji}</div>
      <div className="flex-1">
        <p className="font-semibold text-gray-800 text-sm leading-tight">{product.titleFa}</p>
        <span className="inline-block mt-1 text-xs bg-purple-100 text-purple-700 rounded-full px-2 py-0.5">
          {CATEGORY_LABEL_FA[product.category]}
        </span>
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="font-bold text-purple-700 text-sm ltr" dir="ltr">
          {FA_EURO(product.priceCents)}
        </span>
        {qty === 0 ? (
          <button
            data-testid={`catalog-product-${product.id}-add`}
            onClick={() => add(product.id)}
            className="bg-purple-700 text-white text-xs rounded-lg px-3 py-1.5 hover:bg-purple-800 transition-colors"
          >
            افزودن
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setQty(product.id, qty - 1)}
              className="w-6 h-6 bg-gray-100 rounded-full text-gray-700 text-sm font-bold hover:bg-gray-200 flex items-center justify-center"
              aria-label="کاهش"
            >
              −
            </button>
            <span className="text-sm font-semibold w-5 text-center">{qty}</span>
            <button
              onClick={() => add(product.id)}
              className="w-6 h-6 bg-purple-700 rounded-full text-white text-sm font-bold hover:bg-purple-800 flex items-center justify-center"
              aria-label="افزایش"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
