import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn.js';

const pillVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
  {
    variants: {
      tone: {
        neutral: 'bg-muted text-subtle',
        brand: 'bg-brand-soft text-brand',
        success: 'bg-success-soft text-success',
        danger: 'bg-danger-soft text-danger',
        warning: 'bg-warning-soft text-warning',
        cash: 'bg-cash-soft text-cash',
        gift: 'bg-gift-soft text-gift',
        cashback: 'bg-cashback-soft text-cashback',
        corporate: 'bg-corporate-soft text-corporate',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface PillProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof pillVariants> {}

export const Pill = forwardRef<HTMLSpanElement, PillProps>(
  ({ className, tone, ...props }, ref) => (
    <span ref={ref} className={cn(pillVariants({ tone }), className)} {...props} />
  ),
);
Pill.displayName = 'Pill';
