import { useNavigate } from 'react-router-dom';
import { FA_EURO } from '@segmentpay/shared';
import { useProducts } from '../lib/queries.js';
import { useCreateOrder } from '../lib/queries.js';
import { useCart, SHIPPING_CENTS } from '../lib/cart.js';

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
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-100">
        <h1 className="font-bold text-gray-800 text-lg">سبد خرید</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {cartLines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
            <span className="text-4xl">🛒</span>
            <p>سبد خرید شما خالی است</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {cartLines.map(({ product, qty }) => (
              <div
                key={product.id}
                data-testid={`cart-line-${product.id}`}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center gap-3"
              >
                <span className="text-2xl">{product.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{product.titleFa}</p>
                  <p className="text-xs text-gray-500 ltr" dir="ltr">
                    {FA_EURO(product.priceCents)} × {qty} = {FA_EURO(product.priceCents * qty)}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setQty(product.id, qty - 1)}
                    className="w-7 h-7 bg-gray-100 rounded-full text-gray-600 text-sm flex items-center justify-center hover:bg-gray-200"
                    aria-label="کاهش"
                  >
                    −
                  </button>
                  <span className="text-sm font-semibold w-5 text-center">{qty}</span>
                  <button
                    onClick={() => setQty(product.id, qty + 1)}
                    className="w-7 h-7 bg-purple-700 rounded-full text-white text-sm flex items-center justify-center hover:bg-purple-800"
                    aria-label="افزایش"
                  >
                    +
                  </button>
                  <button
                    onClick={() => remove(product.id)}
                    className="w-7 h-7 bg-red-50 rounded-full text-red-500 text-sm flex items-center justify-center hover:bg-red-100 mr-1"
                    aria-label="حذف"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order summary */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex flex-col gap-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>جمع محصولات</span>
          <span data-testid="cart-subtotal" dir="ltr" className="ltr">{FA_EURO(sub)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>هزینه ارسال</span>
          <span data-testid="cart-shipping" dir="ltr" className="ltr">{FA_EURO(SHIPPING_CENTS)}</span>
        </div>
        <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2 mt-1">
          <span>مجموع</span>
          <span data-testid="cart-total" dir="ltr" className="ltr">{FA_EURO(tot)}</span>
        </div>

        <button
          data-testid="cart-checkout-button"
          onClick={handleCheckout}
          disabled={cartLines.length === 0 || createOrder.isPending}
          className="mt-2 w-full bg-purple-700 text-white font-semibold rounded-xl py-3 hover:bg-purple-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createOrder.isPending ? 'در حال ثبت...' : 'ادامه و پرداخت'}
        </button>

        {createOrder.isError && (
          <p className="text-red-500 text-xs text-center mt-1">
            {(createOrder.error as { messageFa?: string })?.messageFa ?? 'خطا در ثبت سفارش'}
          </p>
        )}
      </div>
    </div>
  );
}
