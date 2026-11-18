import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, ChevronLeft } from 'lucide-react';
import { FA_EURO } from '@segmentpay/shared';
import type { OrderStatus } from '@segmentpay/shared';
import { useOrders } from '../lib/queries.js';
import { Pill, type PillProps } from '../components/ui/Pill.js';
import { Skeleton } from '../components/ui/Skeleton.js';

const STATUS_LABEL: Record<OrderStatus, string> = {
  draft: 'پیش‌نویس',
  pending_payment: 'در انتظار پرداخت',
  processing: 'در حال پردازش',
  paid: 'پرداخت شده',
  failed: 'ناموفق',
  refunded: 'بازگشت داده شده',
};

const STATUS_TONE: Record<OrderStatus, PillProps['tone']> = {
  draft: 'neutral',
  pending_payment: 'warning',
  processing: 'brand',
  paid: 'success',
  failed: 'danger',
  refunded: 'cashback',
};

export function OrderHistoryPage() {
  const { data: orders = [], isLoading } = useOrders();

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-2 pb-3">
        <h1 className="font-extrabold text-text text-2xl tracking-tight">سفارش‌ها</h1>
        <p className="text-xs text-subtle mt-0.5">تاریخچه خرید شما</p>
      </div>

      <div className="px-4 pb-4">
        {isLoading ? (
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-3xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-subtle">
              <Package size={28} />
            </span>
            <p className="text-subtle text-sm">هیچ سفارشی ثبت نشده است</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {[...orders].reverse().map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: Math.min(i * 0.03, 0.2) }}
              >
                <Link
                  to={`/orders/${order.id}`}
                  className="rounded-3xl bg-surface border border-hairline shadow-sm2 p-3.5 flex items-center gap-3 press hover:border-brand/40 transition-colors"
                >
                  <div className="h-10 w-10 rounded-2xl bg-muted flex items-center justify-center text-subtle flex-shrink-0">
                    <Package size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text font-mono truncate">{order.id}</p>
                    <p className="text-[11px] text-subtle mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString('fa-IR')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Pill tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status]}</Pill>
                    <span dir="ltr" className="font-mono tnum text-sm font-bold text-text">
                      {FA_EURO(order.totalCents)}
                    </span>
                  </div>
                  <ChevronLeft size={16} className="text-soft flex-shrink-0" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
