import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { CATEGORY_LABEL_FA } from '@segmentpay/shared';
import type { ProductCategory } from '@segmentpay/shared';
import { useProducts } from '../lib/queries.js';
import { useCart } from '../lib/cart.js';
import { ProductCard } from '../components/ProductCard.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { cn } from '../lib/cn.js';

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
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-2 pb-3">
        <div>
          <h1 className="font-extrabold text-text text-2xl tracking-tight">فروشگاه</h1>
          <p className="text-xs text-subtle mt-0.5">هر خرید را با چند منبع پرداخت کنید</p>
        </div>
        <Link
          to="/cart"
          className="relative inline-flex h-11 items-center gap-1.5 rounded-full bg-text text-bg px-3.5 text-sm font-semibold press"
        >
          <ShoppingCart size={16} />
          سبد
          {count > 0 && (
            <span className="absolute -top-1 -left-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand text-white text-[10px] font-bold px-1 tnum border-2 border-bg">
              {count}
            </span>
          )}
        </Link>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto px-4 py-2 no-scrollbar">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              data-testid={`catalog-filter-${f.value}`}
              onClick={() => setFilter(f.value)}
              className={cn(
                'relative flex-shrink-0 rounded-full h-9 px-4 text-xs font-semibold press transition-colors',
                active ? 'text-white' : 'bg-muted text-subtle hover:text-text',
              )}
            >
              {active && (
                <motion.span
                  layoutId="catalogFilterPill"
                  className="absolute inset-0 rounded-full bg-text"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10">{f.label}</span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="px-4 pb-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-3xl" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-subtle">محصولی یافت نشد</div>
        ) : (
          <motion.div
            key={filter}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 gap-3"
          >
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} testId={`catalog-product-${p.id}`} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
