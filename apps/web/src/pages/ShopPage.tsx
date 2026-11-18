import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORY_LABEL_FA } from '@segmentpay/shared';
import type { ProductCategory } from '@segmentpay/shared';
import { useProducts } from '../lib/queries.js';
import { useCart } from '../lib/cart.js';
import { ProductCard } from '../components/ProductCard.js';

type Filter = ProductCategory | 'all';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'همه' },
  { value: 'grocery', label: CATEGORY_LABEL_FA.grocery },
  { value: 'fashion', label: CATEGORY_LABEL_FA.fashion },
  { value: 'electronics', label: CATEGORY_LABEL_FA.electronics },
  { value: 'office', label: CATEGORY_LABEL_FA.office },
];

export function ShopPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const { data: products = [], isLoading } = useProducts();
  const { count } = useCart();

  const visible = filter === 'all' ? products : products.filter((p) => p.category === filter);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h1 className="font-bold text-gray-800 text-lg">فروشگاه</h1>
        <Link
          to="/cart"
          className="relative bg-purple-100 text-purple-700 rounded-full px-3 py-1.5 text-sm font-semibold hover:bg-purple-200 transition-colors"
        >
          سبد خرید
          {count > 0 && (
            <span className="absolute -top-1 -left-1 bg-purple-700 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {count}
            </span>
          )}
        </Link>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            data-testid={`catalog-filter-${f.value}`}
            onClick={() => setFilter(f.value)}
            className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-purple-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-400">در حال بارگذاری...</div>
        ) : visible.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400">محصولی یافت نشد</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {visible.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                testId={`catalog-product-${p.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
