import { useState } from 'react';
import type { PaymentGatewayMode } from '@segmentpay/shared';
import { useReset, useSetGateway } from '../lib/queries.js';

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

  const handleReset = () => {
    reset.mutate();
  };

  const handleReplay = () => {
    if (onReplay) {
      onReplay();
    }
  };

  return (
    <div className="border border-dashed border-purple-300 rounded-xl bg-purple-50 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-right px-4 py-3 text-sm font-semibold text-purple-700 flex items-center justify-between"
        aria-expanded={open}
      >
        <span>🧪 کنترل‌های QA</span>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-600 font-medium">حالت درگاه پرداخت</label>
            <select
              data-testid="qa-gateway-select"
              value={gateway}
              onChange={(e) => handleGatewayChange(e.target.value as PaymentGatewayMode)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="success">موفق (success)</option>
              <option value="card_declined">رد کارت (card_declined)</option>
              <option value="network_error">خطای شبکه (network_error)</option>
            </select>
          </div>

          <button
            data-testid="qa-reset-button"
            onClick={handleReset}
            disabled={reset.isPending}
            className="bg-red-100 text-red-700 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-red-200 transition-colors disabled:opacity-50"
          >
            {reset.isPending ? 'در حال ریست...' : '🔄 ریست داده‌ها'}
          </button>

          <button
            data-testid="qa-replay-last-payment"
            onClick={handleReplay}
            className="bg-blue-100 text-blue-700 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-200 transition-colors"
          >
            ▶️ تکرار آخرین پرداخت
          </button>
        </div>
      )}
    </div>
  );
}
