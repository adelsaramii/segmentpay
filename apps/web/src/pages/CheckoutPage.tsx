import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { FA_EURO, SOURCE_LABEL_FA } from '@segmentpay/shared';
import type { AllocationInput, PaymentSourceId, QuoteEligibility } from '@segmentpay/shared';
import { useOrder, useQuote, usePay, useWallet } from '../lib/queries.js';
import { CurrencyInput } from '../components/CurrencyInput.js';
import { QaControls, saveLastPayPayload, loadLastPayPayload } from '../components/QaControls.js';
import { newIdempotencyKey } from '../lib/idempotency.js';
import { SegmentIcon } from '../components/ui/SegmentIcon.js';
import { AllocationBar } from '../components/AllocationBar.js';
import { Button } from '../components/ui/Button.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { cn } from '../lib/cn.js';

function getOnline() { return navigator.onLine; }
function subOnline(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

const ALL_SOURCES: PaymentSourceId[] = ['cash', 'gift', 'cashback', 'corporate', 'card'];

export function CheckoutPage() {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const isOnline = useSyncExternalStore(subOnline, getOnline, () => true);

  const { data: order, isLoading: orderLoading } = useOrder(orderId);
  const { data: wallet } = useWallet();
  const quote = useQuote();
  const pay = usePay();

  const [allocations, setAllocations] = useState<Record<PaymentSourceId, number>>({
    cash: 0, gift: 0, cashback: 0, corporate: 0, card: 0,
  });
  const [eligibility, setEligibility] = useState<QuoteEligibility[]>([]);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const refreshQuote = useCallback(async () => {
    if (!orderId) return;
    const allocs: AllocationInput[] = ALL_SOURCES
      .map((s) => ({ source: s, amountCents: allocations[s] ?? 0 }))
      .filter((a) => a.amountCents > 0);
    try {
      const q = await quote.mutateAsync({ orderId, allocations: allocs });
      setEligibility(q.eligibility);
      setQuoteError(null);
    } catch (err: unknown) {
      const apiErr = err as { messageFa?: string };
      setQuoteError(apiErr?.messageFa ?? 'خطا در دریافت اعتبارسنجی');
    }
  }, [orderId, allocations, quote]);

  useEffect(() => {
    if (orderId) {
      void quote.mutateAsync({ orderId, allocations: [] })
        .then((q) => setEligibility(q.eligibility))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (orderLoading || !order) {
    return (
      <div className="p-4 flex flex-col gap-3">
        <Skeleton className="h-20 rounded-3xl" />
        <Skeleton className="h-20 rounded-3xl" />
        <Skeleton className="h-20 rounded-3xl" />
        <Skeleton className="h-20 rounded-3xl" />
      </div>
    );
  }

  const totalCents = order.totalCents;
  const allocatedTotal = ALL_SOURCES.reduce((s, src) => s + (allocations[src] ?? 0), 0);
  const remaining = totalCents - allocatedTotal;
  const canFinalize = allocatedTotal === totalCents && isOnline;

  function getEligibility(source: PaymentSourceId): QuoteEligibility | undefined {
    return eligibility.find((e) => e.source === source);
  }
  function getMaxForSource(source: PaymentSourceId): number {
    if (source === 'card') return totalCents;
    const elig = getEligibility(source);
    if (!elig || elig.maxCents === 0) return 0;
    const segBal = wallet?.segments.find((s) => s.id === source)?.balanceCents ?? 0;
    return Math.min(elig.maxCents, segBal, totalCents);
  }

  const handleAllocChange = (source: PaymentSourceId, cents: number) => {
    setAllocations((prev) => ({ ...prev, [source]: cents }));
  };

  const handleFinalize = async () => {
    const allocs: AllocationInput[] = ALL_SOURCES
      .map((s) => ({ source: s, amountCents: allocations[s] ?? 0 }))
      .filter((a) => a.amountCents > 0);
    const payload = { allocations: allocs, idempotencyKey: newIdempotencyKey() };
    saveLastPayPayload({ orderId, payload });
    try {
      await pay.mutateAsync({ orderId, payload });
      navigate(`/payment-result/${orderId}`);
    } catch {
      navigate(`/payment-result/${orderId}`);
    }
  };

  const handleReplay = async () => {
    const last = loadLastPayPayload();
    if (!last) return;
    try {
      await pay.mutateAsync({
        orderId: (last as { orderId: string }).orderId,
        payload: (last as { payload: Parameters<typeof pay.mutateAsync>[0]['payload'] }).payload,
      });
      navigate(`/payment-result/${(last as { orderId: string }).orderId}`);
    } catch {
      navigate(`/payment-result/${(last as { orderId: string }).orderId}`);
    }
  };

  return (
    <div className="flex flex-col pb-4">
      {/* Header */}
      <div className="px-4 pt-2 pb-2">
        <h1 className="font-extrabold text-text text-2xl tracking-tight">پرداخت</h1>
        <p data-testid="checkout-order-id" className="text-xs text-subtle mt-0.5">
          شناسه سفارش: <span className="font-mono tnum">{order.id}</span>
        </p>
      </div>

      {/* Hero: amount + allocation bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mx-4 rounded-3xl bg-elevated border border-hairline shadow-sm2 p-4 flex flex-col gap-3"
      >
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-subtle">مبلغ سفارش</span>
          <span data-testid="checkout-total-due" className="font-mono font-extrabold text-text text-2xl tnum" dir="ltr">
            {FA_EURO(totalCents)}
          </span>
        </div>
        <AllocationBar totalCents={totalCents} allocations={allocations} />
        <div
          data-testid="checkout-allocated-total"
          className={cn(
            'flex justify-between text-xs',
            allocatedTotal === totalCents ? 'text-success' : 'text-subtle',
          )}
        >
          <span className="inline-flex items-center gap-1">
            {allocatedTotal === totalCents ? <CheckCircle2 size={14} /> : null}
            تخصیص یافته
          </span>
          <span dir="ltr" className="font-mono tnum">
            {FA_EURO(allocatedTotal)}
            {remaining > 0 && <span className="text-soft mx-1"> · باقی {FA_EURO(remaining)}</span>}
          </span>
        </div>
      </motion.div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 text-[11px] text-subtle">
        <span>سبد</span>
        <span className="text-soft">›</span>
        <span className="font-semibold text-brand">پرداخت</span>
        <span className="text-soft">›</span>
        <span>تأیید</span>
      </div>

      {quoteError && (
        <div className="mx-4 mb-2 text-xs text-danger inline-flex items-center gap-1.5">
          <AlertTriangle size={14} />
          {quoteError}
        </div>
      )}

      {/* Allocation rows */}
      <div className="px-4 flex flex-col gap-2.5">
        {ALL_SOURCES.map((source) => {
          const elig = getEligibility(source);
          const maxCents = getMaxForSource(source);
          const isDisabled = source !== 'card' && maxCents === 0;

          return (
            <motion.div
              key={source}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
              className={cn(
                'rounded-3xl bg-surface border border-hairline shadow-sm2 p-3.5',
                isDisabled && 'opacity-60',
              )}
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2.5">
                  <SegmentIcon source={source} size={16} className="h-8 w-8" />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-text">{SOURCE_LABEL_FA[source]}</span>
                    {source !== 'card' && (
                      <span className="text-[10px] text-soft tnum" dir="ltr">
                        حداکثر {FA_EURO(maxCents)}
                      </span>
                    )}
                  </div>
                </div>
                {isDisabled && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-soft">
                    <Lock size={12} />
                    غیرمجاز
                  </span>
                )}
              </div>

              {elig?.reasonFa && maxCents === 0 && (
                <p
                  data-testid={`checkout-eligibility-reason-${source}`}
                  className="text-[11px] text-warning bg-warning-soft/60 rounded-xl px-2.5 py-1.5 mb-2.5"
                >
                  {elig.reasonFa}
                </p>
              )}

              <CurrencyInput
                label={SOURCE_LABEL_FA[source]}
                value={allocations[source] ?? 0}
                min={0}
                max={source === 'card' ? undefined : maxCents}
                disabled={isDisabled}
                onChange={(v) => handleAllocChange(source, v)}
                testId={`checkout-allocation-${source}`}
              />
            </motion.div>
          );
        })}

        <QaControls onReplay={handleReplay} />
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 px-4 pb-24 pt-4 bg-gradient-to-t from-bg via-bg to-bg/0">
        <div className="rounded-3xl bg-elevated border border-hairline shadow-md2 p-3 flex flex-col gap-2">
          <Button
            data-testid="checkout-finalize-button"
            onClick={handleFinalize}
            disabled={!canFinalize || pay.isPending}
            size="lg"
            full
            title={!isOnline ? 'آفلاین هستید — پرداخت در دسترس نیست' : undefined}
          >
            {pay.isPending ? 'در حال پرداخت...' : 'نهایی کردن پرداخت'}
          </Button>
          <button
            onClick={refreshQuote}
            className="w-full text-xs text-subtle hover:text-text py-1"
          >
            بروزرسانی اعتبارسنجی
          </button>
        </div>
      </div>
    </div>
  );
}
