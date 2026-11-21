import { motion } from 'framer-motion';
import { Sparkles, Wand2, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/Button.js';
import { cn } from '../lib/cn.js';

interface SmartSplitRowProps {
  complete: boolean;
  loading: boolean;
  disabled: boolean;
  onSmartSplit: () => void;
}

export function SmartSplitRow({ complete, loading, disabled, onSmartSplit }: SmartSplitRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="mx-4 mb-2.5 rounded-3xl bg-surface border border-hairline shadow-sm2 p-3.5 flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2.5">
        <span
          className={
            complete
              ? 'inline-flex items-center justify-center h-8 w-8 rounded-2xl bg-success-soft text-success'
              : 'inline-flex items-center justify-center h-8 w-8 rounded-2xl bg-brand-soft text-brand'
          }
        >
          {complete ? <CheckCircle2 size={16} /> : <Sparkles size={16} />}
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-text">تقسیم هوشمند</span>
          <span className="text-[10px] text-soft">
            {loading
              ? 'در حال بارگذاری اعتبارسنجی...'
              : complete
                ? 'تخصیص کامل شد'
                : 'بر اساس موجودی و قوانین واجد شرایط'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {complete && (
          <span
            data-testid="checkout-smart-split-complete"
            className="inline-flex items-center whitespace-nowrap text-[11px] font-medium text-success bg-success-soft/60 rounded-full px-2.5 py-1"
          >
            همه تخصیص یافته
          </span>
        )}
        <Button
          data-testid="checkout-smart-split-button"
          intent="secondary"
          size="sm"
          disabled={disabled || complete}
          onClick={onSmartSplit}
          aria-hidden={complete}
          className={cn(
            'whitespace-nowrap transition-all',
            complete && 'w-0 px-0 overflow-hidden opacity-0 pointer-events-none',
          )}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
          پر کردن خودکار
        </Button>
      </div>
    </motion.div>
  );
}
