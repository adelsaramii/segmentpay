import { Link } from 'react-router-dom';
import { FA_EURO } from '@segmentpay/shared';
import type { OrderStatus } from '@segmentpay/shared';
import { useOrders } from '../lib/queries.js';

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

export function OrderHistoryPage() {
  const { data: orders = [], isLoading } = useOrders();

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-100">
        <h1 className="font-bold text-gray-800 text-lg">سفارش‌ها</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-400">در حال بارگذاری...</div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
            <span className="text-4xl">📦</span>
            <p>هیچ سفارشی وجود ندارد</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {[...orders].reverse().map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-gray-800">{order.id}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString('fa-IR')}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`text-xs font-medium rounded-full px-2 py-0.5 ${STATUS_STYLE[order.status]}`}
                  >
                    {STATUS_LABEL[order.status]}
                  </span>
                  <span className="text-sm font-bold text-gray-700 ltr" dir="ltr">
                    {FA_EURO(order.totalCents)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
