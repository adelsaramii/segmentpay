import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight } from 'lucide-react';
import { FA_EURO } from '@segmentpay/shared';
import { useProducts, useCreateOrder } from '../lib/queries.js';
import { useCart, SHIPPING_CENTS } from '../lib/cart.js';
import { Button } from '../components/ui/Button.js';

export function CartPage() {
  const navigate = useNavigate();
  const { data: products = [] } = useProducts();
  const { lines, subtotal, total, setQty, remove } = useCart();
  const createOrder = useCreateOrder();

  const cartLines = lines(products);
  const sub = subtotal(products);
  const tot = total(products);

  const handleCheckout = async () => {
    if (cartLines.length === 0) return;
    const items = cartLines.map((l) => ({ productId: l.product.id, quantity: l.qty }));
    const order = await createOrder.mutateAsync(items);
    navigate(`/checkout/${order.id}`);
  };

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-2 pb-3">
        <h1 className="font-extrabold text-text text-2xl tracking-tight">سبد خرید</h1>
      </div>

      <div className="px-4 pb-4">
        {cartLines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-subtle">
              <ShoppingCart size={28} />
            </span>
            <p className="text-subtle text-sm">سبد خرید شما خالی است</p>
          </div>
        ) : (
          <motion.div layout className="flex flex-col gap-2.5">
            <AnimatePresence initial={false}>
              {cartLines.map(({ product, qty }) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  data-testid={`cart-line-${product.id}`}
                  className="rounded-3xl bg-surface border border-hairline shadow-sm2 p-3 flex items-center gap-3"
                >
                  <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-muted text-2xl">
                    {product.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text truncate">{product.titleFa}</p>
                    <p className="text-[11px] text-subtle tnum mt-0.5" dir="ltr">
                      {FA_EURO(product.priceCents)} × {qty} = {FA_EURO(product.priceCents * qty)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
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
                        onClick={() => setQty(product.id, qty + 1)}
                        className="h-7 w-7 rounded-full bg-brand text-white press flex items-center justify-center"
                        aria-label="افزایش"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      onClick={() => remove(product.id)}
                      className="h-8 w-8 rounded-full bg-danger-soft text-danger press flex items-center justify-center mr-1"
                      aria-label="حذف"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Summary */}
      <div className="sticky bottom-0 px-4 pb-24 pt-4 bg-gradient-to-t from-bg via-bg to-bg/0">
        <div className="rounded-3xl bg-elevated border border-hairline shadow-md2 p-4 flex flex-col gap-2">
          <div className="flex justify-between text-sm text-subtle">
            <span>جمع محصولات</span>
            <span data-testid="cart-subtotal" dir="ltr" className="tnum font-mono text-text">{FA_EURO(sub)}</span>
          </div>
          <div className="flex justify-between text-sm text-subtle">
            <span>هزینه ارسال</span>
            <span data-testid="cart-shipping" dir="ltr" className="tnum font-mono text-text">{FA_EURO(SHIPPING_CENTS)}</span>
          </div>
          <div className="flex justify-between items-baseline border-t border-hairline pt-2 mt-1">
            <span className="text-sm text-subtle">مجموع</span>
            <span data-testid="cart-total" dir="ltr" className="tnum font-mono font-extrabold text-text text-xl">{FA_EURO(tot)}</span>
          </div>

          <Button
            data-testid="cart-checkout-button"
            onClick={handleCheckout}
            disabled={cartLines.length === 0 || createOrder.isPending}
            size="lg"
            full
            className="mt-2"
          >
            <span>{createOrder.isPending ? 'در حال ثبت...' : 'ادامه و پرداخت'}</span>
            {!createOrder.isPending && <ArrowRight size={18} />}
          </Button>

          {createOrder.isError && (
            <p className="text-danger text-xs text-center mt-1">
              {(createOrder.error as { messageFa?: string })?.messageFa ?? 'خطا در ثبت سفارش'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
