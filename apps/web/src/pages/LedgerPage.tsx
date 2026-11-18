import { useState } from 'react';
import { motion } from 'framer-motion';
import { ReceiptText, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { FA_EURO, SOURCE_LABEL_FA } from '@segmentpay/shared';
import type { LedgerEntryType, PaymentSourceId } from '@segmentpay/shared';
import { useLedger } from '../lib/queries.js';
import { Pill, type PillProps } from '../components/ui/Pill.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { SegmentIcon } from '../components/ui/SegmentIcon.js';
import { cn } from '../lib/cn.js';

type LedgerFilter = 'all' | 'payments' | 'refunds';

const TYPE_LABELS: Record<LedgerEntryType, string> = {
  debit: 'برداشت',
  credit: 'واریز',
  reservation: 'رزرو',
  commit: 'تأیید',
  reversal: 'برگشت',
};

const STATE_LABEL: Record<string, string> = {
  committed: 'تأیید',
  reversed: 'برگشت',
  reserved: 'رزرو',
};

const STATE_TONE: Record<string, PillProps['tone']> = {
  committed: 'success',
  reversed: 'neutral',
  reserved: 'warning',
};

const FILTERS: { value: LedgerFilter; label: string }[] = [
  { value: 'all', label: 'همه' },
  { value: 'payments', label: 'پرداخت‌ها' },
  { value: 'refunds', label: 'بازگشت‌ها' },
];

function isPaymentEntry(type: LedgerEntryType): boolean {
  return type === 'debit' || type === 'reservation' || type === 'commit';
}

function isRefundEntry(type: LedgerEntryType): boolean {
  return type === 'credit' || type === 'reversal';
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fa-IR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function LedgerPage() {
  const [filter, setFilter] = useState<LedgerFilter>('all');
  const { data: entries = [], isLoading } = useLedger();

  const visible = entries.filter((e) => {
    if (filter === 'payments') return isPaymentEntry(e.type);
    if (filter === 'refunds') return isRefundEntry(e.type);
    return true;
  });

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-2 pb-3">
        <h1 className="font-extrabold text-text text-2xl tracking-tight">دفتر کل</h1>
        <p className="text-xs text-subtle mt-0.5">همه تراکنش‌های کیف پول</p>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto px-4 py-2 no-scrollbar">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              data-testid={`ledger-filter-${f.value}`}
              onClick={() => setFilter(f.value)}
              className={cn(
                'relative flex-shrink-0 rounded-full h-9 px-4 text-xs font-semibold press transition-colors',
                active ? 'text-white' : 'bg-muted text-subtle hover:text-text',
              )}
            >
              {active && (
                <motion.span
                  layoutId="ledgerFilterPill"
                  className="absolute inset-0 rounded-full bg-text"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10">{f.label}</span>
            </button>
          );
        })}
      </div>

      <div className="px-4 pb-4">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-3xl" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-subtle">
              <ReceiptText size={28} />
            </span>
            <p className="text-subtle text-sm">تراکنشی یافت نشد</p>
          </div>
        ) : (
          <motion.div key={filter} className="flex flex-col gap-2">
            {visible.map((entry, i) => {
              const isCredit = entry.type === 'credit' || entry.type === 'reversal';
              const source = entry.source as PaymentSourceId;

              return (
                <motion.div
                  key={entry.id}
                  data-testid="ledger-row"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.2) }}
                  className="rounded-3xl bg-surface border border-hairline shadow-sm2 p-3 flex items-center gap-3"
                >
                  <SegmentIcon source={source} size={16} className="h-10 w-10 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-text">
                        {SOURCE_LABEL_FA[source] ?? entry.source}
                      </span>
                      <span className="text-soft text-xs">·</span>
                      <span className="text-xs text-subtle">{TYPE_LABELS[entry.type] ?? entry.type}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-soft truncate font-mono">{entry.orderId}</span>
                      <span className="text-soft text-[10px]">·</span>
                      <span className="text-[11px] text-soft">{formatDate(entry.createdAt)}</span>
                    </div>
                    {entry.reasonCode && (
                      <span className="text-[11px] text-warning mt-0.5 block">{entry.reasonCode}</span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span
                      dir="ltr"
                      className={cn(
                        'font-mono font-bold text-sm tnum inline-flex items-center gap-1',
                        isCredit ? 'text-success' : 'text-danger',
                      )}
                    >
                      {isCredit ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                      {isCredit ? '+' : '−'}{FA_EURO(entry.amountCents)}
                    </span>
                    <Pill tone={STATE_TONE[entry.state] ?? 'neutral'}>
                      {STATE_LABEL[entry.state] ?? entry.state}
                    </Pill>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
