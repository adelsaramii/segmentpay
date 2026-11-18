import { useEffect, useRef, useState } from 'react';
import { FA_EURO } from '@segmentpay/shared';

interface AnimatedNumberProps {
  cents: number;
  duration?: number;
  className?: string;
  testId?: string;
}

/** Count-up animation from the previous value to the new one. */
export function AnimatedNumber({ cents, duration = 700, className, testId }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(cents);
  const fromRef = useRef(cents);
  const startedRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (display === cents) return;
    fromRef.current = display;
    startedRef.current = null;

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      if (startedRef.current === null) startedRef.current = now;
      const elapsed = now - startedRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOut(t);
      const current = Math.round(fromRef.current + (cents - fromRef.current) * eased);
      setDisplay(current);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cents, duration]);

  return (
    <span data-testid={testId} dir="ltr" className={className} data-tnum>
      {FA_EURO(display)}
    </span>
  );
}
