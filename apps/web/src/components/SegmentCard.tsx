import { FA_EURO } from '@segmentpay/shared';
import type { WalletSegment, PaymentSourceId } from '@segmentpay/shared';
import { motion } from 'framer-motion';
import { SegmentIcon, sourceColor } from './ui/SegmentIcon.js';
import { ProgressRing } from './ui/ProgressRing.js';

interface SegmentCardProps {
  segment: WalletSegment;
  testId?: string;
  index?: number;
}

export function SegmentCard({ segment, testId, index = 0 }: SegmentCardProps) {
  const total = segment.initialBalanceCents;
  const used = total - segment.balanceCents;
  const remainingRatio = total > 0 ? segment.balanceCents / total : 0;
  const percentUsed = total > 0 ? Math.round((used / total) * 100) : 0;

  return (
    <motion.div
      data-testid={testId ?? `wallet-segment-${segment.id}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * index + 0.1, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl bg-surface border border-hairline shadow-sm2 p-4 flex items-center gap-4"
    >
      <ProgressRing
        progress={remainingRatio}
        size={54}
        stroke={4}
        color={sourceColor(segment.id as PaymentSourceId)}
      >
        <SegmentIcon source={segment.id as PaymentSourceId} size={20} className="h-9 w-9" />
      </ProgressRing>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-text text-sm truncate">{segment.nameFa}</span>
          {percentUsed > 0 && (
            <span className="text-[10px] text-soft">
              {percentUsed}٪ مصرف
            </span>
          )}
        </div>
        <p className="text-[11px] text-subtle truncate mt-0.5">{segment.descriptionFa}</p>
      </div>

      <div className="flex flex-col items-end flex-shrink-0">
        <span className="font-mono font-bold text-text text-base tnum" dir="ltr">
          {FA_EURO(segment.balanceCents)}
        </span>
      </div>
    </motion.div>
  );
}
