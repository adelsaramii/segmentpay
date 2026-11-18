import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn.js';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
  {
    variants: {
      intent: {
        primary: 'bg-brand text-white hover:bg-brand-strong shadow-glow',
        secondary: 'bg-muted text-text hover:bg-muted/70',
        ghost: 'bg-transparent text-text hover:bg-muted',
        danger: 'bg-danger text-white hover:bg-danger/90',
        success: 'bg-success text-white hover:bg-success/90',
        outline: 'bg-surface text-text border border-hairline hover:bg-muted',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-sm',
        lg: 'h-14 px-5 text-base',
        icon: 'h-10 w-10',
      },
      full: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      intent: 'primary',
      size: 'md',
      full: false,
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, intent, size, full, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ intent, size, full }), className)}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
