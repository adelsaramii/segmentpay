import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, FlaskConical, RefreshCw, Repeat } from 'lucide-react';
import type { PaymentGatewayMode } from '@segmentpay/shared';
import { useReset, useSetGateway } from '../lib/queries.js';
import { cn } from '../lib/cn.js';

const LAST_PAY_KEY = 'segmentpay.lastPayPayload';

export function saveLastPayPayload(payload: unknown): void {
  try {
    sessionStorage.setItem(LAST_PAY_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function loadLastPayPayload(): { orderId: string; payload: unknown } | null {
  try {
    const raw = sessionStorage.getItem(LAST_PAY_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { orderId: string; payload: unknown };
  } catch {
    return null;
  }
}

interface QaControlsProps {
  onReplay?: () => void;
}

export function QaControls({ onReplay }: QaControlsProps) {
  const [open, setOpen] = useState(false);
  const [gateway, setGatewayState] = useState<PaymentGatewayMode>('success');
  const reset = useReset();
  const setGateway = useSetGateway();

  const handleGatewayChange = (mode: PaymentGatewayMode) => {
    setGatewayState(mode);
    setGateway.mutate(mode);
  };

  return (
    <div className="rounded-3xl border border-dashed border-brand/40 bg-brand-soft/40 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-right px-4 py-3 text-sm font-semibold text-brand flex items-center justify-between press"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <FlaskConical size={16} />
          کنترل‌های QA
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={16} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="qa-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-subtle font-medium">حالت درگاه پرداخت</label>
                <select
                  data-testid="qa-gateway-select"
                  value={gateway}
                  onChange={(e) => handleGatewayChange(e.target.value as PaymentGatewayMode)}
                  className="rounded-2xl bg-surface border border-hairline text-text px-3 h-11 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="success">موفق (success)</option>
                  <option value="card_declined">رد کارت (card_declined)</option>
                  <option value="network_error">خطای شبکه (network_error)</option>
                </select>
              </div>

              <button
                data-testid="qa-reset-button"
                onClick={() => reset.mutate()}
                disabled={reset.isPending}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-2xl bg-danger-soft text-danger px-4 h-11 text-sm font-semibold press disabled:opacity-50',
                )}
              >
                <RefreshCw size={16} />
                {reset.isPending ? 'در حال ریست...' : 'ریست داده‌ها'}
              </button>

              <button
                data-testid="qa-replay-last-payment"
                onClick={() => onReplay?.()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-corporate-soft text-corporate px-4 h-11 text-sm font-semibold press"
              >
                <Repeat size={16} />
                تکرار آخرین پرداخت
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
