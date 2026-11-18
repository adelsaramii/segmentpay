import { motion } from 'framer-motion';
import type { PaymentSourceId } from '@segmentpay/shared';
import { sourceColor } from './ui/SegmentIcon.js';

interface AllocationBarProps {
  totalCents: number;
  allocations: Record<PaymentSourceId, number>;
}

const ORDER: PaymentSourceId[] = ['cash', 'gift', 'cashback', 'corporate', 'card'];

export function AllocationBar({ totalCents, allocations }: AllocationBarProps) {
  const safeTotal = Math.max(totalCents, 1);
  const segments = ORDER.filter((s) => (allocations[s] ?? 0) > 0);
  const allocatedCents = ORDER.reduce((sum, s) => sum + (allocations[s] ?? 0), 0);
  const remainingCents = Math.max(0, totalCents - allocatedCents);

  return (
    <div className="flex h-3 w-full gap-0.5 rounded-full bg-muted p-0.5 overflow-hidden">
      {segments.map((s) => {
        const pct = (allocations[s] / safeTotal) * 100;
        return (
          <motion.div
            key={s}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{ backgroundColor: sourceColor(s) }}
            className="h-full rounded-full"
            aria-label={`${s} ${Math.round(pct)}%`}
          />
        );
      })}
      {remainingCents > 0 && segments.length > 0 && (
        <div className="flex-1" />
      )}
    </div>
  );
}
