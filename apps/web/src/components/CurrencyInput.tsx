import { Minus, Plus } from 'lucide-react';
import type { Cents } from '@segmentpay/shared';
import { cn } from '../lib/cn.js';

interface CurrencyInputProps {
  label: string;
  value: Cents;
  min?: Cents;
  max?: Cents;
  step?: Cents;
  disabled?: boolean;
  onChange: (value: Cents) => void;
  testId?: string;
}

export function CurrencyInput({
  label,
  value,
  min = 0,
  max,
  step = 100,
  disabled = false,
  onChange,
  testId,
}: CurrencyInputProps) {
  const euros = value / 100;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseFloat(e.target.value);
    if (isNaN(raw)) {
      onChange(0);
      return;
    }
    let cents = Math.round(raw * 100);
    cents = Math.max(min, cents);
    if (max !== undefined) cents = Math.min(max, cents);
    onChange(cents);
  };

  const decrement = () => {
    const next = Math.max(min, value - step);
    onChange(next);
  };

  const increment = () => {
    const next = max !== undefined ? Math.min(max, value + step) : value + step;
    onChange(next);
  };

  return (
    <div className="flex items-center gap-2" aria-label={label}>
      <button
        type="button"
        onClick={decrement}
        disabled={disabled || value <= min}
        className={cn(
          'h-10 w-10 rounded-full bg-muted text-text press flex items-center justify-center disabled:opacity-30',
        )}
        aria-label={`کاهش ${label}`}
      >
        <Minus size={16} />
      </button>
      <div className="relative flex-1">
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-soft text-sm pointer-events-none">€</span>
        <input
          data-testid={testId}
          type="number"
          value={euros.toFixed(2)}
          onChange={handleChange}
          disabled={disabled}
          min={min / 100}
          max={max !== undefined ? max / 100 : undefined}
          step={(step / 100).toFixed(2)}
          aria-label={label}
          className={cn(
            'w-full h-10 rounded-2xl bg-surface border border-hairline pr-8 pl-3 font-mono text-text text-sm tnum text-left',
            'focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-muted disabled:text-soft disabled:cursor-not-allowed',
          )}
          dir="ltr"
        />
      </div>
      <button
        type="button"
        onClick={increment}
        disabled={disabled || (max !== undefined && value >= max)}
        className="h-10 w-10 rounded-full bg-muted text-text press flex items-center justify-center disabled:opacity-30"
        aria-label={`افزایش ${label}`}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
