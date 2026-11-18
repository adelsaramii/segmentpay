import { motion } from 'framer-motion';
import { cn } from '../../lib/cn.js';

interface ProgressRingProps {
  /** 0..1 */
  progress: number;
  size?: number;
  stroke?: number;
  className?: string;
  trackClassName?: string;
  trackColor?: string;
  color?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  progress,
  size = 56,
  stroke = 5,
  className,
  trackClassName,
  trackColor,
  color,
  children,
}: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const dash = circumference * (1 - clamped);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor ?? 'currentColor'}
          strokeOpacity={trackColor ? 1 : 0.1}
          strokeWidth={stroke}
          className={trackClassName}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color ?? 'currentColor'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dash }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}
