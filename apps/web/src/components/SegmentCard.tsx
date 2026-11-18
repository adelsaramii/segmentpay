import { FA_EURO } from '@segmentpay/shared';
import type { WalletSegment } from '@segmentpay/shared';

const SEGMENT_ICONS: Record<string, string> = {
  cash: '💵',
  gift: '🎁',
  cashback: '♻️',
  corporate: '🏢',
};

interface SegmentCardProps {
  segment: WalletSegment;
  testId?: string;
}

export function SegmentCard({ segment, testId }: SegmentCardProps) {
  const icon = SEGMENT_ICONS[segment.id] ?? '💳';
  const percentUsed =
    segment.initialBalanceCents > 0
      ? Math.round(((segment.initialBalanceCents - segment.balanceCents) / segment.initialBalanceCents) * 100)
      : 0;

  return (
    <div
      data-testid={testId ?? `wallet-segment-${segment.id}`}
      className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm p-4 gap-3"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="text-2xl w-10 h-10 flex items-center justify-center bg-purple-50 rounded-full flex-shrink-0">
          {icon}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-gray-800 text-sm">{segment.nameFa}</span>
          <span className="text-xs text-gray-500 truncate">{segment.descriptionFa}</span>
        </div>
      </div>
      <div className="flex flex-col items-end flex-shrink-0">
        <span className="font-bold text-purple-700 text-base ltr" dir="ltr">
          {FA_EURO(segment.balanceCents)}
        </span>
        {percentUsed > 0 && (
          <span className="text-xs text-gray-400">{percentUsed}٪ مصرف شده</span>
        )}
      </div>
    </div>
  );
}
