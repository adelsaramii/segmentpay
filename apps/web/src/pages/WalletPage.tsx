import { Link } from 'react-router-dom';
import { FA_EURO } from '@segmentpay/shared';
import { useWallet } from '../lib/queries.js';
import { SegmentCard } from '../components/SegmentCard.js';
import { QaControls, loadLastPayPayload, saveLastPayPayload } from '../components/QaControls.js';
import { usePay } from '../lib/queries.js';
import type { PayRequest } from '@segmentpay/shared';

export function WalletPage() {
  const { data: wallet, isLoading, isError } = useWallet();
  const pay = usePay();

  const handleReplay = async () => {
    const last = loadLastPayPayload();
    if (!last) {
      alert('هیچ پرداختی برای تکرار وجود ندارد');
      return;
    }
    try {
      const result = await pay.mutateAsync({
        orderId: (last as { orderId: string }).orderId,
        payload: (last as { payload: PayRequest }).payload,
      });
      saveLastPayPayload({ orderId: result.order.id, payload: (last as { payload: PayRequest }).payload });
      alert(`پرداخت با شناسه ${result.order.id} تکرار شد`);
    } catch (err: unknown) {
      const apiErr = err as { messageFa?: string; message?: string };
      alert(apiErr?.messageFa ?? apiErr?.message ?? 'خطا');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">در حال بارگذاری...</div>
      </div>
    );
  }

  if (isError || !wallet) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">خطا در دریافت اطلاعات کیف پول</div>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Hero card */}
      <div
        className="rounded-2xl p-6 text-white"
        style={{ background: 'linear-gradient(135deg, #6D28D9, #8B5CF6)' }}
      >
        <p className="text-sm text-purple-200 mb-1">مجموع موجودی قابل استفاده</p>
        <p
          data-testid="wallet-total"
          className="text-4xl font-bold ltr"
          dir="ltr"
        >
          {FA_EURO(wallet.totalBalanceCents)}
        </p>
        <p className="text-xs text-purple-300 mt-2">از {wallet.segments.length} بخش کیف پول</p>
      </div>

      {/* Segment list */}
      <div className="flex flex-col gap-3">
        {wallet.segments.map((seg) => (
          <SegmentCard
            key={seg.id}
            segment={seg}
            testId={`wallet-segment-${seg.id}`}
          />
        ))}
      </div>

      {/* CTA */}
      <Link
        to="/shop"
        className="block text-center bg-purple-700 text-white font-semibold rounded-xl py-3 hover:bg-purple-800 transition-colors mt-2"
      >
        خرید و پرداخت
      </Link>

      {/* QA Controls */}
      <QaControls onReplay={handleReplay} />
    </div>
  );
}
