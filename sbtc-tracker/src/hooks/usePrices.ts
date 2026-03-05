/**
 * usePrices Hook
 * 
 * React Query hook for cryptocurrency price data.
 */

import { useQuery } from '@tanstack/react-query';
import { priceService } from '@/services/api';
import type { TokenPrice, PriceHistory } from '@/types/sbtc';
import { CACHE_TTL } from '@/config/constants';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const priceKeys = {
  all: ['prices'] as const,
  current: () => [...priceKeys.all, 'current'] as const,
  token: (symbol: string) => [...priceKeys.all, 'token', symbol] as const,
  history: (symbol: string, days: number) => 
    [...priceKeys.all, 'history', symbol, days] as const,
  btc: () => [...priceKeys.all, 'btc'] as const,
  stx: () => [...priceKeys.all, 'stx'] as const,
};

// =============================================================================
// TYPES
// =============================================================================

interface UsePricesOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number | false;
}

export interface CurrentPrices {
  btc: TokenPrice;
  stx: TokenPrice;
  sbtc: TokenPrice; // 1:1 with BTC, but include for convenience
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Fetch current BTC and STX prices
 */
export function usePrices(options: UsePricesOptions = {}) {
  return useQuery({
    queryKey: priceKeys.current(),
    queryFn: async (): Promise<CurrentPrices> => {
      const [btcResult, stxResult] = await Promise.all([
        priceService.getPrice('BTC'),
        priceService.getPrice('STX'),
      ]);

      if (!btcResult.success) {
        throw new Error(btcResult.error.message);
      }
      
      if (!stxResult.success) {
        throw new Error(stxResult.error.message);
      }

      // sBTC is 1:1 with BTC
      const sbtcPrice: TokenPrice = {
        ...btcResult.data,
        token: 'SBTC',
      };

      return {
        btc: btcResult.data,
        stx: stxResult.data,
        sbtc: sbtcPrice,
      };
    },
    enabled: options.enabled !== false,
    staleTime: options.staleTime ?? CACHE_TTL.PRICES,
    refetchInterval: options.refetchInterval ?? CACHE_TTL.PRICES,
    retry: 3,
  });
}

/**
 * Fetch BTC price only
 */
export function useBtcPrice(options: UsePricesOptions = {}) {
  return useQuery({
    queryKey: priceKeys.btc(),
    queryFn: async (): Promise<TokenPrice> => {
      const result = await priceService.getPrice('BTC');
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: options.enabled !== false,
    staleTime: options.staleTime ?? CACHE_TTL.PRICES,
    refetchInterval: options.refetchInterval ?? CACHE_TTL.PRICES,
    retry: 3,
  });
}

/**
 * Fetch STX price only
 */
export function useStxPrice(options: UsePricesOptions = {}) {
  return useQuery({
    queryKey: priceKeys.stx(),
    queryFn: async (): Promise<TokenPrice> => {
      const result = await priceService.getPrice('STX');
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: options.enabled !== false,
    staleTime: options.staleTime ?? CACHE_TTL.PRICES,
    refetchInterval: options.refetchInterval ?? CACHE_TTL.PRICES,
    retry: 3,
  });
}

/**
 * Fetch price history for charts
 */
export function usePriceHistory(
  symbol: 'btc' | 'stx' = 'btc',
  days: number = 30,
  options: UsePricesOptions = {}
) {
  return useQuery({
    queryKey: priceKeys.history(symbol, days),
    queryFn: async (): Promise<PriceHistory> => {
      const coinId = symbol === 'btc' ? 'bitcoin' : 'blockstack';
      const result = await priceService.getPriceHistory(coinId, days);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: options.enabled !== false,
    staleTime: options.staleTime ?? CACHE_TTL.PRICES * 2, // Price history less volatile
    refetchInterval: options.refetchInterval ?? false,
    retry: 3,
  });
}

/**
 * Derived hook: Calculate value from amount and price
 */
export function useTokenValue(
  amount: number,
  symbol: 'btc' | 'stx' | 'sbtc' = 'sbtc'
) {
  const { data: prices, isLoading, error } = usePrices();

  const value = prices
    ? {
        usd: amount * prices[symbol].priceUsd,
        btc: symbol === 'btc' || symbol === 'sbtc' 
          ? amount 
          : amount * prices.stx.priceUsd / prices.btc.priceUsd,
      }
    : null;

  return {
    value,
    isLoading,
    error,
    price: prices?.[symbol],
  };
}

/**
 * Hook for price change indicators
 */
export function usePriceChange(symbol: 'btc' | 'stx' | 'sbtc' = 'sbtc') {
  const { data: prices, isLoading } = usePrices();
  
  const price = prices?.[symbol === 'sbtc' ? 'btc' : symbol];
  
  return {
    isLoading,
    priceChange24h: price?.priceChange24h ?? 0,
    isPositive: (price?.priceChange24h ?? 0) >= 0,
  };
}
