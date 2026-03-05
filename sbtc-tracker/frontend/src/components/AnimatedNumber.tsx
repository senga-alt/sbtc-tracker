import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  formatter?: (v: number) => string;
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function AnimatedNumber({ value, duration = 500, formatter = String }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(value);
  const rafId = useRef<number>();

  useEffect(() => {
    const from = prevValue.current;
    const to = value;
    prevValue.current = value;

    if (from === to) return;

    const start = performance.now();
    const diff = to - from;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setDisplay(from + diff * easeOut(progress));

      if (progress < 1) {
        rafId.current = requestAnimationFrame(tick);
      }
    };

    rafId.current = requestAnimationFrame(tick);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [value, duration]);

  return <>{formatter(display)}</>;
}
