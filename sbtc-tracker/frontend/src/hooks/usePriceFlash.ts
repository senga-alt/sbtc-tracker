import { useRef, useState, useEffect, useCallback } from 'react';
import type { PriceData } from '@/types';

type FlashMap = Record<string, { className: string; key: number }>;

export function usePriceFlash(prices: PriceData[]) {
  const prevPrices = useRef<Record<string, number>>({});
  const [flashes, setFlashes] = useState<FlashMap>({});
  const keyRef = useRef(0);

  const getFlashClass = useCallback((symbol: string): string => {
    return flashes[symbol]?.className ?? '';
  }, [flashes]);

  const getFlashKey = useCallback((symbol: string): number => {
    return flashes[symbol]?.key ?? 0;
  }, [flashes]);

  useEffect(() => {
    if (!prices.length) return;

    const newFlashes: FlashMap = {};
    let hasChange = false;

    for (const p of prices) {
      const prev = prevPrices.current[p.symbol];
      if (prev !== undefined && prev !== p.price) {
        hasChange = true;
        keyRef.current += 1;
        newFlashes[p.symbol] = {
          className: p.price > prev ? 'flash-green' : 'flash-red',
          key: keyRef.current,
        };
      }
      prevPrices.current[p.symbol] = p.price;
    }

    if (hasChange) {
      setFlashes(prev => ({ ...prev, ...newFlashes }));

      const timeout = setTimeout(() => {
        setFlashes(prev => {
          const next = { ...prev };
          for (const symbol of Object.keys(newFlashes)) {
            if (next[symbol]?.key === newFlashes[symbol].key) {
              delete next[symbol];
            }
          }
          return next;
        });
      }, 600);

      return () => clearTimeout(timeout);
    }
  }, [prices]);

  return { getFlashClass, getFlashKey };
}
