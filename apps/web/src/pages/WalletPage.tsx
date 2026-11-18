import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useWallet, usePay } from '../lib/queries.js';
import type { PayRequest } from '@segmentpay/shared';
import { SegmentCard } from '../components/SegmentCard.js';
import { QaControls, loadLastPayPayload, saveLastPayPayload } from '../components/QaControls.js';
import { AnimatedNumber } from '../components/ui/AnimatedNumber.js';
import { Skeleton } from '../components/ui/Skeleton.js';

export function WalletPage() {
  const { data: wallet, isLoading, isError } = useWallet();
  const pay = usePay();

  const handleReplay = async () => {
    const last = loadLastPayPayload();
    if (!last) return;
    try {
      const result = await pay.mutateAsync({
        orderId: (last as { orderId: string }).orderId,
        payload: (last as { payload: PayRequest }).payload,
      });
      saveLastPayPayload({ orderId: result.order.id, payload: (last as { payload: PayRequest }).payload });
    } catch {
      /* ignore */
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 flex flex-col gap-4">
        <Skeleton className="h-44 rounded-3xl" />
        <Skeleton className="h-20 rounded-3xl" />
        <Skeleton className="h-20 rounded-3xl" />
        <Skeleton className="h-20 rounded-3xl" />
        <Skeleton className="h-20 rounded-3xl" />
      </div>
    );
  }

  if (isError || !wallet) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-danger">خطا در دریافت اطلاعات کیف پول</div>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-4xl gradient-brand gradient-mesh p-6 text-white shadow-glow"
      >
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-xs text-white/70">موجودی کل قابل استفاده</p>
            <AnimatedNumber
              cents={wallet.totalBalanceCents}
              testId="wallet-total"
              className="block font-mono font-extrabold text-[2.75rem] leading-none mt-2 tnum"
            />
            <div className="mt-3 inline-flex items-center gap-1.5 bg-white/15 backdrop-blur rounded-full px-2.5 py-1 text-[11px] font-semibold">
              <Sparkles size={12} />
              <span>{wallet.segments.length} بخش فعال</span>
            </div>
          </div>
          <div className="hidden xs:block w-20 h-20 rounded-full bg-white/10 blur-2xl" />
        </div>

        {/* Soft decorative orbs */}
        <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-3xl" />
      </motion.div>

      {/* Segments */}
      <div className="flex flex-col gap-2.5">
        {wallet.segments.map((seg, i) => (
          <SegmentCard key={seg.id} segment={seg} testId={`wallet-segment-${seg.id}`} index={i} />
        ))}
      </div>

      {/* CTA */}
      <Link
        to="/shop"
        className="group mt-1 inline-flex h-14 items-center justify-between rounded-2xl bg-text text-bg px-5 font-semibold press"
      >
        <span>شروع خرید و پرداخت</span>
        <ArrowRight size={18} className="transition-transform group-hover:-translate-x-0.5" />
      </Link>

      <QaControls onReplay={handleReplay} />
    </div>
  );
}
