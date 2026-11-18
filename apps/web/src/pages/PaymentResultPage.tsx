import { useParams, Link, useNavigate } from 'react-router-dom';
import { FA_EURO, SOURCE_LABEL_FA } from '@segmentpay/shared';
import type { PaymentSourceId } from '@segmentpay/shared';
import { useOrder } from '../lib/queries.js';

const SOURCE_ICONS: Record<PaymentSourceId, string> = {
  cash: '💵',
  gift: '🎁',
  cashback: '♻️',
  corporate: '🏢',
  card: '💳',
};

export function PaymentResultPage() {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useOrder(orderId);

  if (isLoading || !order) {
    return <div className="flex items-center justify-center h-64 text-gray-400">در حال بارگذاری...</div>;
  }

  const isSuccess = order.status === 'paid';
  const isFailed = order.status === 'failed';

  if (isSuccess) {
    // We need the payment attempt breakdown — it's on the order via API
    // The order doesn't directly carry allocations, so we show it from the order data
    return (
      <div className="flex flex-col items-center px-4 py-8 gap-6">
        {/* Success state */}
        <div
          data-testid="payment-result-success"
          className="flex flex-col items-center gap-3"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl">
            ✅
          </div>
          <h1 className="text-xl font-bold text-green-700">پرداخت با موفقیت انجام شد!</h1>
          <p className="text-sm text-gray-500">شناسه سفارش: {order.id}</p>
        </div>

        <div className="w-full bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2">
          <div className="flex justify-between font-bold text-gray-900">
            <span>مبلغ پرداخت شده</span>
            <span
              data-testid="payment-result-total-paid"
              dir="ltr"
              className="ltr text-green-700"
            >
              {FA_EURO(order.totalCents)}
            </span>
          </div>
        </div>

        {/* Per-source breakdown */}
        <div className="w-full bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">تفکیک پرداخت</h2>
          <div className="flex flex-col gap-2">
            {(['cash', 'gift', 'cashback', 'corporate', 'card'] as PaymentSourceId[]).map((source) => (
              <div
                key={source}
                data-testid={`payment-result-breakdown-${source}`}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2 text-gray-700">
                  <span>{SOURCE_ICONS[source]}</span>
                  <span>{SOURCE_LABEL_FA[source]}</span>
                </div>
                <span dir="ltr" className="ltr text-gray-500 text-xs">—</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full flex flex-col gap-2">
          <Link
            to={`/orders/${order.id}`}
            className="block text-center bg-purple-700 text-white font-semibold rounded-xl py-3 hover:bg-purple-800 transition-colors"
          >
            مشاهده سفارش
          </Link>
          <Link
            to="/shop"
            className="block text-center bg-gray-100 text-gray-700 font-semibold rounded-xl py-3 hover:bg-gray-200 transition-colors"
          >
            بازگشت به فروشگاه
          </Link>
        </div>
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className="flex flex-col items-center px-4 py-8 gap-6">
        <div
          data-testid="payment-result-failure"
          className="flex flex-col items-center gap-3"
        >
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-4xl">
            ❌
          </div>
          <h1 className="text-xl font-bold text-red-700">پرداخت ناموفق بود</h1>
          <p className="text-sm text-gray-500">شناسه سفارش: {order.id}</p>
        </div>

        <div className="w-full bg-red-50 rounded-xl border border-red-100 p-4">
          <p
            data-testid="payment-result-error-code"
            className="text-sm text-red-700 font-semibold"
          >
            کد خطا: PAYMENT_FAILED
          </p>
          <p className="text-xs text-red-600 mt-1">
            پرداخت شما انجام نشد. موجودی کیف پول شما بازگردانده شده است.
          </p>
        </div>

        <div className="w-full flex flex-col gap-2">
          <button
            onClick={() => navigate(`/checkout/${order.id}`)}
            className="w-full bg-purple-700 text-white font-semibold rounded-xl py-3 hover:bg-purple-800 transition-colors"
          >
            تلاش مجدد برای پرداخت
          </button>
          <Link
            to="/shop"
            className="block text-center bg-gray-100 text-gray-700 font-semibold rounded-xl py-3 hover:bg-gray-200 transition-colors"
          >
            بازگشت به فروشگاه
          </Link>
        </div>
      </div>
    );
  }

  // Other statuses
  return (
    <div className="flex flex-col items-center px-4 py-8 gap-4">
      <p className="text-gray-600">وضعیت سفارش: {order.status}</p>
      <Link to="/orders" className="text-purple-700 underline text-sm">مشاهده سفارش‌ها</Link>
    </div>
  );
}
