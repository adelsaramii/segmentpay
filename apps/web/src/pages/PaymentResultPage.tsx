import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FA_EURO, SOURCE_LABEL_FA } from '@segmentpay/shared';
import type { PaymentSourceId } from '@segmentpay/shared';
import { useOrder } from '../lib/queries.js';
import { Button } from '../components/ui/Button.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { SegmentIcon } from '../components/ui/SegmentIcon.js';

const ALL_SOURCES: PaymentSourceId[] = ['cash', 'gift', 'cashback', 'corporate', 'card'];

function SuccessMark() {
  return (
    <div className="relative h-24 w-24">
      <motion.span
        className="absolute inset-0 rounded-full bg-success-soft"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      />
      <svg viewBox="0 0 96 96" className="absolute inset-0">
        <motion.circle
          cx="48"
          cy="48"
          r="40"
          fill="none"
          stroke="rgb(var(--success))"
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        <motion.path
          d="M30 50 L44 64 L68 36"
          fill="none"
          stroke="rgb(var(--success))"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.45, delay: 0.35, ease: 'easeOut' }}
        />
      </svg>
    </div>
  );
}

function FailureMark() {
  return (
    <motion.div
      className="relative h-24 w-24"
      initial={{ x: 0 }}
      animate={{ x: [0, -8, 8, -6, 6, 0] }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <motion.span
        className="absolute inset-0 rounded-full bg-danger-soft"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
      <svg viewBox="0 0 96 96" className="absolute inset-0">
        <motion.circle
          cx="48"
          cy="48"
          r="40"
          fill="none"
          stroke="rgb(var(--danger))"
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4 }}
        />
        <motion.path
          d="M34 34 L62 62"
          stroke="rgb(var(--danger))"
          strokeWidth="5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        />
        <motion.path
          d="M62 34 L34 62"
          stroke="rgb(var(--danger))"
          strokeWidth="5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.45 }}
        />
      </svg>
    </motion.div>
  );
}

export function PaymentResultPage() {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useOrder(orderId);

  if (isLoading || !order) {
    return (
      <div className="p-4 flex flex-col gap-3">
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-28 rounded-3xl" />
      </div>
    );
  }

  const isSuccess = order.status === 'paid';
  const isFailed = order.status === 'failed';

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center px-4 py-6 gap-5">
        <div data-testid="payment-result-success" className="flex flex-col items-center gap-3">
          <SuccessMark />
          <motion.h1
            className="text-xl font-extrabold text-success"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.3 }}
          >
            پرداخت با موفقیت انجام شد
          </motion.h1>
          <p className="text-xs text-subtle font-mono">{order.id}</p>
        </div>

        <motion.div
          className="w-full rounded-3xl bg-elevated border border-hairline shadow-sm2 p-4 flex items-center justify-between"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.3 }}
        >
          <span className="text-sm text-subtle">مبلغ پرداخت شده</span>
          <span
            data-testid="payment-result-total-paid"
            dir="ltr"
            className="font-mono font-extrabold text-success tnum text-xl"
          >
            {FA_EURO(order.totalCents)}
          </span>
        </motion.div>

        <motion.div
          className="w-full rounded-3xl bg-surface border border-hairline shadow-sm2 p-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.3 }}
        >
          <h2 className="text-xs font-semibold text-subtle mb-3">تفکیک پرداخت</h2>
          <div className="flex flex-col gap-2.5">
            {ALL_SOURCES.map((source) => (
              <div
                key={source}
                data-testid={`payment-result-breakdown-${source}`}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <SegmentIcon source={source} size={14} className="h-7 w-7" />
                  <span className="text-sm text-text">{SOURCE_LABEL_FA[source]}</span>
                </div>
                <span dir="ltr" className="text-xs text-soft font-mono tnum">—</span>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="w-full flex flex-col gap-2">
          <Link to={`/orders/${order.id}`}>
            <Button full size="lg">مشاهده سفارش</Button>
          </Link>
          <Link to="/shop">
            <Button full size="lg" intent="secondary">بازگشت به فروشگاه</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className="flex flex-col items-center px-4 py-6 gap-5">
        <div data-testid="payment-result-failure" className="flex flex-col items-center gap-3">
          <FailureMark />
          <motion.h1
            className="text-xl font-extrabold text-danger"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.3 }}
          >
            پرداخت ناموفق بود
          </motion.h1>
          <p className="text-xs text-subtle font-mono">{order.id}</p>
        </div>

        <motion.div
          className="w-full rounded-3xl bg-danger-soft/50 border border-danger/20 p-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.3 }}
        >
          <p data-testid="payment-result-error-code" className="text-sm text-danger font-semibold">
            کد خطا: PAYMENT_FAILED
          </p>
          <p className="text-xs text-danger/80 mt-1">
            پرداخت شما انجام نشد. موجودی کیف پول شما بازگردانده شده است.
          </p>
        </motion.div>

        <div className="w-full flex flex-col gap-2">
          <Button full size="lg" onClick={() => navigate(`/checkout/${order.id}`)}>
            تلاش مجدد برای پرداخت
          </Button>
          <Link to="/shop">
            <Button full size="lg" intent="secondary">بازگشت به فروشگاه</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-4 py-8 gap-4">
      <p className="text-subtle text-sm">وضعیت سفارش: {order.status}</p>
      <Link to="/orders" className="text-brand underline text-sm">مشاهده سفارش‌ها</Link>
    </div>
  );
}
