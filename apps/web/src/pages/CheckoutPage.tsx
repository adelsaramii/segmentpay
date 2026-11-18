import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FA_EURO, SOURCE_LABEL_FA } from '@segmentpay/shared';
import type { AllocationInput, PaymentSourceId, QuoteEligibility } from '@segmentpay/shared';
import { useOrder, useQuote, usePay } from '../lib/queries.js';
import { useWallet } from '../lib/queries.js';
import { CurrencyInput } from '../components/CurrencyInput.js';
import { QaControls, saveLastPayPayload, loadLastPayPayload } from '../components/QaControls.js';
import { newIdempotencyKey } from '../lib/idempotency.js';
import { useSyncExternalStore } from 'react';

function getOnline() {
  return navigator.onLine;
}
function subOnline(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

const SOURCE_ICONS: Record<PaymentSourceId, string> = {
  cash: '💵',
  gift: '🎁',
  cashback: '♻️',
  corporate: '🏢',
  card: '💳',
};

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
    cash: 0,
    gift: 0,
    cashback: 0,
    corporate: 0,
    card: 0,
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

  // Initial quote load
  useEffect(() => {
    if (orderId) {
      void quote.mutateAsync({ orderId, allocations: [] })
        .then((q) => setEligibility(q.eligibility))
        .catch(() => {/* ignore */});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (orderLoading || !order) {
    return <div className="flex items-center justify-center h-64 text-gray-400">در حال بارگذاری سفارش...</div>;
  }

  const totalCents = order.totalCents;
  const allocatedTotal = ALL_SOURCES.reduce((s, src) => s + (allocations[src] ?? 0), 0);
  const remaining = totalCents - allocatedTotal;
  const canFinalize = allocatedTotal === totalCents && isOnline;

  function getEligibility(source: PaymentSourceId): QuoteEligibility | undefined {
    return eligibility.find((e) => e.source === source);
  }

  function getMaxForSource(source: PaymentSourceId): number {
    if (source === 'card') return totalCents; // card has no upper cap beyond total
    const elig = getEligibility(source);
    if (!elig || elig.maxCents === 0) return 0;
    const segBal = wallet?.segments.find((s) => s.id === source)?.balanceCents ?? 0;
    return Math.min(elig.maxCents, segBal, totalCents);
  }

  const handleAllocChange = (source: PaymentSourceId, cents: number) => {
    setAllocations((prev) => {
      const next = { ...prev, [source]: cents };
      return next;
    });
  };

  const handleFinalize = async () => {
    const allocs: AllocationInput[] = ALL_SOURCES
      .map((s) => ({ source: s, amountCents: allocations[s] ?? 0 }))
      .filter((a) => a.amountCents > 0);

    const ikey = newIdempotencyKey();
    const payload = {
      allocations: allocs,
      idempotencyKey: ikey,
    };

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
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-100">
        <h1 className="font-bold text-gray-800 text-lg">پرداخت سفارش</h1>
        <p data-testid="checkout-order-id" className="text-xs text-gray-500 mt-0.5">
          شناسه سفارش: {order.id}
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center px-4 py-2 gap-2 text-xs text-gray-500 border-b border-gray-100">
        <span className="text-purple-500">سبد</span>
        <span>›</span>
        <span className="font-semibold text-purple-700">پرداخت</span>
        <span>›</span>
        <span>تأیید</span>
      </div>

      {/* Order total */}
      <div className="mx-4 my-3 bg-purple-50 rounded-xl p-3 flex justify-between items-center">
        <span className="text-sm text-gray-600">مبلغ سفارش</span>
        <span
          data-testid="checkout-total-due"
          className="font-bold text-purple-700 ltr"
          dir="ltr"
        >
          {FA_EURO(totalCents)}
        </span>
      </div>

      {quoteError && (
        <div className="mx-4 mb-2 text-xs text-red-500">{quoteError}</div>
      )}

      {/* Allocation rows */}
      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-3 pb-4">
        {ALL_SOURCES.map((source) => {
          const elig = getEligibility(source);
          const maxCents = getMaxForSource(source);
          const isDisabled = source !== 'card' && maxCents === 0;

          return (
            <div key={source} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{SOURCE_ICONS[source]}</span>
                  <span className="text-sm font-semibold text-gray-800">{SOURCE_LABEL_FA[source]}</span>
                </div>
                {source !== 'card' && (
                  <span className="text-xs text-gray-500 ltr" dir="ltr">
                    حداکثر: {FA_EURO(maxCents)}
                  </span>
                )}
              </div>

              {elig?.reasonFa && maxCents === 0 && (
                <p
                  data-testid={`checkout-eligibility-reason-${source}`}
                  className="text-xs text-orange-600 mb-2"
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
            </div>
          );
        })}

        <QaControls onReplay={handleReplay} />
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white flex flex-col gap-2">
        <div
          data-testid="checkout-allocated-total"
          className={`flex justify-between items-center text-sm font-semibold ${
            allocatedTotal === totalCents ? 'text-green-600' : 'text-gray-700'
          }`}
        >
          <span>تخصیص یافته</span>
          <span dir="ltr" className="ltr">
            {FA_EURO(allocatedTotal)}{' '}
            {remaining > 0 && (
              <span className="text-gray-400 font-normal">(باقی‌مانده: {FA_EURO(remaining)})</span>
            )}
          </span>
        </div>

        <button
          data-testid="checkout-finalize-button"
          onClick={handleFinalize}
          disabled={!canFinalize || pay.isPending}
          title={!isOnline ? 'آفلاین هستید — پرداخت در دسترس نیست' : undefined}
          className="w-full bg-purple-700 text-white font-semibold rounded-xl py-3 hover:bg-purple-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pay.isPending ? 'در حال پرداخت...' : 'نهایی کردن پرداخت'}
        </button>

        <button
          onClick={refreshQuote}
          className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
        >
          بروزرسانی اعتبارسنجی
        </button>
      </div>
    </div>
  );
}
