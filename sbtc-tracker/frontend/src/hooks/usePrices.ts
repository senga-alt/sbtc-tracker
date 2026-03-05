import { useState, useEffect, useCallback, useRef } from 'react';
import type { PriceData } from '@/types';
import { fetchPrices, fetchMarketChart } from '@/lib/coingecko';
import { toast } from 'sonner';
import { useDemoMode } from './useDemoMode';

const POLL_INTERVAL = 30_000;
const SBTC_SPREAD = 0.9995; // sBTC trades ~0.05% below BTC

export function usePrices() {
  const [isLoading, setIsLoading] = useState(true);
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [isLive, setIsLive] = useState(false);
  const { demoMode } = useDemoMode();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [hasError, setHasError] = useState(false);
  const hasErrored = useRef(false);
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;

  const load = useCallback(async () => {
    const attemptFetch = async (attempt: number): Promise<void> => {
      try {
        const [coinPrices, sparklineData] = await Promise.all([
          fetchPrices(),
          fetchMarketChart('bitcoin', 7),
        ]);

        const btcPrice = coinPrices.bitcoin.usd;
        const btcChange = coinPrices.bitcoin.usd_24h_change ?? 0;
        const stxPrice = coinPrices.blockstack.usd;
        const stxChange = coinPrices.blockstack.usd_24h_change ?? 0;

        const btcSparkline = sparklineData.slice(-24).map(p => p.price);
        const sbtcPrice = btcPrice * SBTC_SPREAD;

        const newPrices: PriceData[] = [
          {
            symbol: 'BTC',
            name: 'Bitcoin',
            price: btcPrice,
            change24h: btcPrice * (btcChange / 100),
            changePercent24h: btcChange,
            sparkline: btcSparkline,
          },
          {
            symbol: 'STX',
            name: 'Stacks',
            price: stxPrice,
            change24h: stxPrice * (stxChange / 100),
            changePercent24h: stxChange,
            sparkline: btcSparkline.map(v => v * (stxPrice / btcPrice)),
          },
          {
            symbol: 'sBTC',
            name: 'sBTC',
            price: sbtcPrice,
            change24h: sbtcPrice * (btcChange / 100),
            changePercent24h: btcChange,
            sparkline: btcSparkline.map(v => v * SBTC_SPREAD),
          },
        ];

        setPrices(newPrices);
        setIsLive(true);
        setLastUpdated(new Date());
        setIsStale(false);
        hasErrored.current = false;
        setHasError(false);
        retryCount.current = 0;
      } catch (err) {
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptFetch(attempt + 1);
        }
        if (!hasErrored.current) {
          toast.error('Failed to fetch live prices. Using cached data.');
          hasErrored.current = true;
        }
        setHasError(true);
        setIsLive(false);
      } finally {
        setIsLoading(false);
      }
    };

    return attemptFetch(0);
  }, []);

  // Check staleness every 30s
  useEffect(() => {
    const staleCheck = window.setInterval(() => {
      if (lastUpdated && Date.now() - lastUpdated.getTime() > 5 * 60 * 1000) {
        setIsStale(true);
      }
    }, 30_000);
    return () => clearInterval(staleCheck);
  }, [lastUpdated]);

  useEffect(() => {
    load();
    const id = window.setInterval(load, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [load]);

  // Demo mode: jitter prices every 3s
  useEffect(() => {
    if (!demoMode || prices.length === 0) return;
    const id = window.setInterval(() => {
      setPrices(prev =>
        prev.map(p => {
          const jitter = 1 + (Math.random() - 0.5) * 0.01;
          return {
            ...p,
            price: p.price * jitter,
            sparkline: p.sparkline?.map(v => v * jitter),
          };
        })
      );
    }, 3000);
    return () => clearInterval(id);
  }, [demoMode, prices.length]);

  const getPrice = (symbol: string) => prices.find(p => p.symbol === symbol);

  return { prices, isLoading, getPrice, isLive, lastUpdated, isStale, hasError, retry: load };
}
