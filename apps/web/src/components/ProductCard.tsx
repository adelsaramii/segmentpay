import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { FA_EURO, CATEGORY_LABEL_FA } from '@segmentpay/shared';
import type { Product } from '@segmentpay/shared';
import { useCart } from '../lib/cart.js';
import { Pill } from './ui/Pill.js';
import { cn } from '../lib/cn.js';

interface ProductCardProps {
  product: Product;
  testId?: string;
}

const CATEGORY_TONE: Record<string, 'brand' | 'cash' | 'gift' | 'cashback' | 'corporate'> = {
  grocery: 'cash',
  fashion: 'gift',
  electronics: 'brand',
  office: 'corporate',
};

export function ProductCard({ product, testId }: ProductCardProps) {
  const { cartMap, add, setQty } = useCart();
  const qty = cartMap[product.id] ?? 0;
  const tone = CATEGORY_TONE[product.category] ?? 'brand';

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      data-testid={testId ?? `catalog-product-${product.id}`}
      className={cn(
        'relative overflow-hidden flex flex-col gap-2 rounded-3xl bg-surface border border-hairline p-3 shadow-sm2',
      )}
    >
      <div className="relative aspect-square rounded-2xl bg-muted flex items-center justify-center overflow-hidden">
        <span className="text-5xl leading-none">{product.emoji}</span>
      </div>

      <div className="flex-1 flex flex-col gap-1">
        <p className="font-semibold text-text text-sm leading-tight line-clamp-2">{product.titleFa}</p>
        <Pill tone={tone} className="self-start">{CATEGORY_LABEL_FA[product.category]}</Pill>
      </div>

      <div className="flex items-center justify-between mt-1">
        <span className="font-mono font-bold text-text text-sm tnum" dir="ltr">
          {FA_EURO(product.priceCents)}
        </span>
        {qty === 0 ? (
          <button
            data-testid={`catalog-product-${product.id}-add`}
            onClick={() => add(product.id)}
            className="inline-flex h-8 items-center rounded-full bg-brand text-white text-xs font-semibold px-3 press shadow-glow"
          >
            افزودن
          </button>
        ) : (
          <div className="inline-flex items-center gap-1 bg-muted rounded-full p-0.5">
            <button
              onClick={() => setQty(product.id, qty - 1)}
              className="h-7 w-7 rounded-full bg-surface text-text press flex items-center justify-center"
              aria-label="کاهش"
            >
              <Minus size={14} />
            </button>
            <span className="text-sm font-semibold w-5 text-center tnum">{qty}</span>
            <button
              onClick={() => add(product.id)}
              className="h-7 w-7 rounded-full bg-brand text-white press flex items-center justify-center"
              aria-label="افزایش"
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
