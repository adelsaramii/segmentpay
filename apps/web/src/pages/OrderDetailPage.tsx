import { useParams } from 'react-router-dom';
import { FA_EURO, SOURCE_LABEL_FA } from '@segmentpay/shared';
import type { OrderStatus, PaymentSourceId } from '@segmentpay/shared';
import { useOrder, useRefund } from '../lib/queries.js';

const STATUS_LABEL: Record<OrderStatus, string> = {
  draft: 'پیش‌نویس',
  pending_payment: 'در انتظار پرداخت',
  processing: 'در حال پردازش',
  paid: 'پرداخت شده',
  failed: 'ناموفق',
  refunded: 'بازگشت داده شده',
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending_payment: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-purple-100 text-purple-700',
};

const SOURCE_ICONS: Record<PaymentSourceId, string> = {
  cash: '💵',
  gift: '🎁',
  cashback: '♻️',
  corporate: '🏢',
  card: '💳',
};

export function OrderDetailPage() {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const { data: order, isLoading } = useOrder(orderId);
  const refund = useRefund();

  if (isLoading || !order) {
    return <div className="flex items-center justify-center h-64 text-gray-400">در حال بارگذاری...</div>;
  }

  const canRefund = order.status === 'paid';

  const handleRefund = () => {
    refund.mutate({ orderId: order.id });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-gray-800 text-lg">جزئیات سفارش</h1>
          <p className="text-xs text-gray-500 mt-0.5">{order.id}</p>
        </div>
        <span
          data-testid="order-detail-status"
          className={`text-xs font-semibold rounded-full px-3 py-1 ${STATUS_STYLE[order.status]}`}
        >
          {STATUS_LABEL[order.status]}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
        {/* Items */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">اقلام سفارش</h2>
          <div className="flex flex-col gap-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.titleFa} × {item.quantity}</span>
                <span dir="ltr" className="ltr text-gray-500">{FA_EURO(item.lineTotalCents)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 flex flex-col gap-1.5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>جمع اقلام</span>
              <span dir="ltr" className="ltr">{FA_EURO(order.itemsTotalCents)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>هزینه ارسال</span>
              <span dir="ltr" className="ltr">{FA_EURO(order.shippingCents)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 mt-1">
              <span>مجموع</span>
              <span dir="ltr" className="ltr">{FA_EURO(order.totalCents)}</span>
            </div>
          </div>
        </div>

        {/* Refund history */}
        <div
          data-testid="order-detail-refund-history"
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
        >
          <h2 className="text-sm font-semibold text-gray-700 mb-2">تاریخچه بازگشت وجه</h2>
          {order.status === 'refunded' ? (
            <div className="flex flex-col gap-2">
              <div className="text-xs text-green-600 bg-green-50 rounded-lg p-2">
                وجه این سفارش به کیف پول بازگشت داده شد
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">بازگشت وجهی ثبت نشده است</p>
          )}
        </div>

        {/* Payment breakdown placeholder */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">تفکیک پرداخت</h2>
          <div className="flex flex-col gap-2">
            {(['cash', 'gift', 'cashback', 'corporate', 'card'] as PaymentSourceId[]).map((source) => (
              <div key={source} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <span>{SOURCE_ICONS[source]}</span>
                  <span>{SOURCE_LABEL_FA[source]}</span>
                </div>
                <span className="text-gray-400 text-xs">—</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Refund button */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white">
        {refund.isError && (
          <p className="text-xs text-red-500 mb-2 text-center">
            {(refund.error as { messageFa?: string })?.messageFa ?? 'خطا در بازگشت وجه'}
          </p>
        )}
        <button
          data-testid="order-detail-refund-button"
          onClick={handleRefund}
          disabled={!canRefund || refund.isPending}
          className="w-full bg-red-600 text-white font-semibold rounded-xl py-3 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {refund.isPending ? 'در حال بازگشت...' : 'بازگشت وجه'}
        </button>
      </div>
    </div>
  );
}
