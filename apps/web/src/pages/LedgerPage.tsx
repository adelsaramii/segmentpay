import { useState } from 'react';
import { FA_EURO, SOURCE_LABEL_FA } from '@segmentpay/shared';
import type { LedgerEntryType, PaymentSourceId } from '@segmentpay/shared';
import { useLedger } from '../lib/queries.js';

type LedgerFilter = 'all' | 'payments' | 'refunds';

const SOURCE_ICONS: Record<PaymentSourceId, string> = {
  cash: '💵',
  gift: '🎁',
  cashback: '♻️',
  corporate: '🏢',
  card: '💳',
};

const TYPE_LABELS: Record<LedgerEntryType, string> = {
  debit: 'برداشت',
  credit: 'واریز',
  reservation: 'رزرو',
  commit: 'تأیید',
  reversal: 'برگشت',
};

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
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-100">
        <h1 className="font-bold text-gray-800 text-lg">دفتر کل</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 py-2 border-b border-gray-100">
        {(['all', 'payments', 'refunds'] as LedgerFilter[]).map((f) => {
          const labels = { all: 'همه', payments: 'پرداخت‌ها', refunds: 'بازگشت‌ها' };
          return (
            <button
              key={f}
              data-testid={`ledger-filter-${f}`}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-purple-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-400">در حال بارگذاری...</div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
            <span className="text-4xl">📋</span>
            <p>هیچ تراکنشی یافت نشد</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {visible.map((entry) => {
              const isCredit = entry.type === 'credit' || entry.type === 'reversal';
              const amountSign = isCredit ? '+' : '−';
              const amountColor = isCredit ? 'text-green-600' : 'text-red-600';

              return (
                <div
                  key={entry.id}
                  data-testid="ledger-row"
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center gap-3"
                >
                  <div className="text-xl flex-shrink-0">
                    {SOURCE_ICONS[entry.source as PaymentSourceId] ?? '💳'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-700">
                        {SOURCE_LABEL_FA[entry.source as PaymentSourceId] ?? entry.source}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{TYPE_LABELS[entry.type] ?? entry.type}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400 truncate">{entry.orderId}</span>
                      <span className="text-xs text-gray-300">•</span>
                      <span className="text-xs text-gray-400">{formatDate(entry.createdAt)}</span>
                    </div>
                    {entry.reasonCode && (
                      <span className="text-xs text-orange-500">{entry.reasonCode}</span>
                    )}
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className={`font-bold text-sm ltr ${amountColor}`} dir="ltr">
                      {amountSign}{FA_EURO(entry.amountCents)}
                    </span>
                    <span className={`text-xs rounded-full px-1.5 py-0.5 mt-0.5 ${
                      entry.state === 'committed' ? 'bg-green-100 text-green-700' :
                      entry.state === 'reversed' ? 'bg-gray-100 text-gray-500' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {entry.state === 'committed' ? 'تأیید' : entry.state === 'reversed' ? 'برگشت' : 'رزرو'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
