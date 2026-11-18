import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { FA_EURO, SOURCE_LABEL_FA } from '@segmentpay/shared';
import type { OrderStatus, PaymentSourceId } from '@segmentpay/shared';
import { useOrder, useRefund } from '../lib/queries.js';
import { Pill, type PillProps } from '../components/ui/Pill.js';
import { Button } from '../components/ui/Button.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { SegmentIcon } from '../components/ui/SegmentIcon.js';

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

const ALL_SOURCES: PaymentSourceId[] = ['cash', 'gift', 'cashback', 'corporate', 'card'];

export function OrderDetailPage() {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const { data: order, isLoading } = useOrder(orderId);
  const refund = useRefund();

  if (isLoading || !order) {
    return (
      <div className="p-4 flex flex-col gap-3">
        <Skeleton className="h-16 rounded-3xl" />
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-28 rounded-3xl" />
      </div>
    );
  }

  const canRefund = order.status === 'paid';

  const handleRefund = () => {
    refund.mutate({ orderId: order.id });
  };

  return (
    <div className="flex flex-col pb-4">
      <div className="px-4 pt-2 pb-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-extrabold text-text text-2xl tracking-tight">جزئیات سفارش</h1>
          <p className="text-xs text-subtle font-mono mt-0.5">{order.id}</p>
        </div>
        <Pill tone={STATUS_TONE[order.status]} data-testid="order-detail-status">
          {STATUS_LABEL[order.status]}
        </Pill>
      </div>

      <div className="px-4 flex flex-col gap-3">
        {/* Items */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="rounded-3xl bg-surface border border-hairline shadow-sm2 p-4"
        >
          <h2 className="text-xs font-semibold text-subtle mb-3">اقلام سفارش</h2>
          <div className="flex flex-col gap-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-text">{item.titleFa} × {item.quantity}</span>
                <span dir="ltr" className="font-mono tnum text-subtle">
                  {FA_EURO(item.lineTotalCents)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-hairline mt-3 pt-3 flex flex-col gap-1.5">
            <div className="flex justify-between text-sm text-subtle">
              <span>جمع اقلام</span>
              <span dir="ltr" className="font-mono tnum">{FA_EURO(order.itemsTotalCents)}</span>
            </div>
            <div className="flex justify-between text-sm text-subtle">
              <span>هزینه ارسال</span>
              <span dir="ltr" className="font-mono tnum">{FA_EURO(order.shippingCents)}</span>
            </div>
            <div className="flex justify-between items-baseline border-t border-hairline mt-1 pt-2">
              <span className="text-sm text-subtle">مجموع</span>
              <span dir="ltr" className="font-mono tnum font-extrabold text-text text-lg">
                {FA_EURO(order.totalCents)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Payment breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.05 }}
          className="rounded-3xl bg-surface border border-hairline shadow-sm2 p-4"
        >
          <h2 className="text-xs font-semibold text-subtle mb-3">تفکیک پرداخت</h2>
          <div className="flex flex-col gap-2.5">
            {ALL_SOURCES.map((source) => (
              <div key={source} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <SegmentIcon source={source} size={14} className="h-7 w-7" />
                  <span className="text-sm text-text">{SOURCE_LABEL_FA[source]}</span>
                </div>
                <span className="text-xs text-soft font-mono tnum">—</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Refund history */}
        <motion.div
          data-testid="order-detail-refund-history"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.1 }}
          className="rounded-3xl bg-surface border border-hairline shadow-sm2 p-4"
        >
          <h2 className="text-xs font-semibold text-subtle mb-2">تاریخچه بازگشت وجه</h2>
          {order.status === 'refunded' ? (
            <div className="flex items-center gap-2 text-xs text-success bg-success-soft/60 rounded-xl px-3 py-2">
              <CheckCircle2 size={14} />
              وجه این سفارش به کیف پول بازگشت داده شد
            </div>
          ) : (
            <p className="text-xs text-soft">بازگشت وجهی ثبت نشده است</p>
          )}
        </motion.div>
      </div>

      {/* Refund button */}
      <div className="sticky bottom-0 px-4 pb-24 pt-4 bg-gradient-to-t from-bg via-bg to-bg/0">
        <div className="rounded-3xl bg-elevated border border-hairline shadow-md2 p-3 flex flex-col gap-2">
          {refund.isError && (
            <p className="text-xs text-danger inline-flex items-center gap-1.5">
              <AlertTriangle size={14} />
              {(refund.error as { messageFa?: string })?.messageFa ?? 'خطا در بازگشت وجه'}
            </p>
          )}
          <Button
            data-testid="order-detail-refund-button"
            onClick={handleRefund}
            disabled={!canRefund || refund.isPending}
            intent="danger"
            size="lg"
            full
          >
            <RefreshCw size={16} />
            {refund.isPending ? 'در حال بازگشت...' : 'بازگشت وجه'}
          </Button>
        </div>
      </div>
    </div>
  );
}
