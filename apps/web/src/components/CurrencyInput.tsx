import type { Cents } from '@segmentpay/shared';

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
        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 disabled:opacity-30 hover:bg-gray-100"
        aria-label={`کاهش ${label}`}
      >
        −
      </button>
      <div className="relative flex-1">
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">€</span>
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
          className="w-full border border-gray-300 rounded-lg pr-7 pl-3 py-2 text-sm text-left ltr focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          dir="ltr"
        />
      </div>
      <button
        type="button"
        onClick={increment}
        disabled={disabled || (max !== undefined && value >= max)}
        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 disabled:opacity-30 hover:bg-gray-100"
        aria-label={`افزایش ${label}`}
      >
        +
      </button>
    </div>
  );
}
