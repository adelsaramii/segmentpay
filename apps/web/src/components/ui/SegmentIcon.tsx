import { Banknote, Gift, Coins, Briefcase, CreditCard } from 'lucide-react';
import type { PaymentSourceId } from '@segmentpay/shared';
import { cn } from '../../lib/cn.js';

const CONFIG: Record<PaymentSourceId, { Icon: typeof Banknote; bg: string; fg: string }> = {
  cash: { Icon: Banknote, bg: 'bg-cash-soft', fg: 'text-cash' },
  gift: { Icon: Gift, bg: 'bg-gift-soft', fg: 'text-gift' },
  cashback: { Icon: Coins, bg: 'bg-cashback-soft', fg: 'text-cashback' },
  corporate: { Icon: Briefcase, bg: 'bg-corporate-soft', fg: 'text-corporate' },
  card: { Icon: CreditCard, bg: 'bg-card-src-soft', fg: 'text-brand' },
};

interface SegmentIconProps {
  source: PaymentSourceId;
  size?: number;
  className?: string;
}

export function SegmentIcon({ source, size = 20, className }: SegmentIconProps) {
  const cfg = CONFIG[source];
  const { Icon } = cfg;
  return (
    <span className={cn('inline-flex items-center justify-center rounded-2xl', cfg.bg, cfg.fg, className)}>
      <Icon size={size} strokeWidth={2.25} />
    </span>
  );
}

export function sourceColor(source: PaymentSourceId): string {
  const map: Record<PaymentSourceId, string> = {
    cash: 'rgb(var(--cash))',
    gift: 'rgb(var(--gift))',
    cashback: 'rgb(var(--cashback))',
    corporate: 'rgb(var(--corporate))',
    card: 'rgb(var(--brand))',
  };
  return map[source];
}
