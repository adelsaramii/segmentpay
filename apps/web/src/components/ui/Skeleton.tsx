import { cn } from '../../lib/cn.js';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'animate-pulse rounded-xl bg-muted',
        className,
      )}
    />
  );
}
