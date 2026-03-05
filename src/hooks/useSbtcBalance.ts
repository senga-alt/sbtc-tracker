/**
 * useSbtcBalance Hook
 * 
 * React Query hook for sBTC balance data.
 */

import { useQuery } from '@tanstack/react-query';
import { stacksApiService } from '@/services/api';
import type { StacksAddress } from '@/types/common';
import { CACHE_TTL, TOKEN_DECIMALS } from '@/config/constants';
import BigNumber from 'bignumber.js';
import { useBtcPrice } from './usePrices';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const sbtcKeys = {
  all: ['sbtc'] as const,
  balance: (address: StacksAddress) => [...sbtcKeys.all, 'balance', address] as const,
  totalSupply: () => [...sbtcKeys.all, 'totalSupply'] as const,
  transactions: (address: StacksAddress, limit: number) => 
    [...sbtcKeys.all, 'transactions', address, limit] as const,
};

// =============================================================================
// TYPES
// =============================================================================

interface UseSbtcOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number | false;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Fetch sBTC balance for an address
 * Returns balance as string (raw value)
 */
export function useSbtcBalance(
  address: StacksAddress | null,
  options: UseSbtcOptions = {}
) {
  return useQuery({
    queryKey: sbtcKeys.balance(address!),
    queryFn: async (): Promise<string | null> => {
      const result = await stacksApiService.getSbtcBalance(address!);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: !!address && options.enabled !== false,
    staleTime: options.staleTime ?? CACHE_TTL.BALANCE,
    refetchInterval: options.refetchInterval ?? CACHE_TTL.BALANCE,
    retry: 2,
  });
}

/**
 * Fetch sBTC total supply
 */
export function useSbtcTotalSupply(options: UseSbtcOptions = {}) {
  return useQuery({
    queryKey: sbtcKeys.totalSupply(),
    queryFn: async (): Promise<string> => {
      const result = await stacksApiService.getSbtcTotalSupply();
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: options.enabled !== false,
    staleTime: options.staleTime ?? CACHE_TTL.BALANCE,
    refetchInterval: options.refetchInterval ?? CACHE_TTL.BALANCE,
    retry: 2,
  });
}

/**
 * Hook for formatted sBTC balance display
 */
export function useFormattedSbtcBalance(address: StacksAddress | null) {
  const { data: balance, isLoading, error, refetch } = useSbtcBalance(address);

  const formatted = balance
    ? {
        raw: balance,
        display: new BigNumber(balance)
          .dividedBy(new BigNumber(10).pow(TOKEN_DECIMALS.SBTC))
          .toFixed(8),
        displayShort: new BigNumber(balance)
          .dividedBy(new BigNumber(10).pow(TOKEN_DECIMALS.SBTC))
          .toFixed(4),
        decimals: TOKEN_DECIMALS.SBTC,
      }
    : null;

  return {
    balance: formatted,
    isLoading,
    error,
    refetch,
    hasBalance: formatted ? Number(formatted.display) > 0 : false,
  };
}

/**
 * Combined hook for balance + value
 */
export function useSbtcBalanceWithValue(address: StacksAddress | null) {
  const { data: balance, isLoading: balanceLoading, error: balanceError } = 
    useSbtcBalance(address);

  const { data: btcPrice, isLoading: priceLoading } = useBtcPrice();

  const isLoading = balanceLoading || priceLoading;

  const value = balance && btcPrice
    ? {
        balance: balance,
        balanceFormatted: new BigNumber(balance)
          .dividedBy(new BigNumber(10).pow(TOKEN_DECIMALS.SBTC))
          .toNumber(),
        usd: new BigNumber(balance)
          .dividedBy(new BigNumber(10).pow(TOKEN_DECIMALS.SBTC))
          .multipliedBy(btcPrice.priceUsd)
          .toNumber(),
        btcPrice: btcPrice.priceUsd,
      }
    : null;

  return {
    value,
    isLoading,
    error: balanceError,
  };
}

/**
 * Hook to check if address has any sBTC
 */
export function useHasSbtc(address: StacksAddress | null) {
  const { data: balance, isLoading } = useSbtcBalance(address);
  
  return {
    hasSbtc: balance ? Number(balance) > 0 : false,
    isLoading,
    balance: balance ?? '0',
  };
}
