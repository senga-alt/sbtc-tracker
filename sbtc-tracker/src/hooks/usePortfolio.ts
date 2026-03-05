/**
 * usePortfolio Hook
 * 
 * React Query hook for fetching and managing portfolio data.
 */

import { useQuery, useQueries, type UseQueryOptions } from '@tanstack/react-query';
import { portfolioService } from '@/services/portfolio';
import type { Portfolio } from '@/types/portfolio';
import type { SbtcBalance, AddressBalance } from '@/types/sbtc';
import type { StacksAddress } from '@/types/common';
import { CACHE_TTL } from '@/config/constants';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const portfolioKeys = {
  all: ['portfolio'] as const,
  single: (address: StacksAddress) => 
    [...portfolioKeys.all, 'single', address] as const,
  balance: (address: StacksAddress) => 
    [...portfolioKeys.all, 'balance', address] as const,
  multi: (addresses: StacksAddress[]) => 
    [...portfolioKeys.all, 'multi', addresses.join(',')] as const,
};

// =============================================================================
// HOOKS
// =============================================================================

interface UsePortfolioOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number | false;
}

/**
 * Fetch portfolio for a single address
 */
export function usePortfolio(
  address: StacksAddress | null,
  options: UsePortfolioOptions = {}
) {
  return useQuery({
    queryKey: portfolioKeys.single(address!),
    queryFn: async (): Promise<Portfolio> => {
      const result = await portfolioService.getPortfolio(address!);
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
 * Fetch address balance (lighter than full portfolio)
 */
export function useAddressBalance(
  address: StacksAddress | null,
  options: UsePortfolioOptions = {}
) {
  return useQuery({
    queryKey: portfolioKeys.balance(address!),
    queryFn: async (): Promise<AddressBalance> => {
      const result = await portfolioService.getAddressBalance(address!);
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
 * Fetch sBTC balances for multiple addresses (parallel queries)
 */
export function useSbtcBalances(
  addresses: StacksAddress[],
  options: UsePortfolioOptions = {}
) {
  return useQueries({
    queries: addresses.map((address) => ({
      queryKey: ['sbtc', 'balance', address] as const,
      queryFn: async () => {
        const result = await portfolioService.getSbtcBalanceWithValue(address);
        if (!result.success) {
          throw new Error(result.error.message);
        }
        return { address, balance: result.data };
      },
      enabled: options.enabled !== false,
      staleTime: options.staleTime ?? CACHE_TTL.BALANCE,
      refetchInterval: options.refetchInterval ?? CACHE_TTL.BALANCE,
      retry: 2,
    })) as UseQueryOptions<{ address: StacksAddress; balance: SbtcBalance | null }, Error>[],
  });
}

/**
 * Get sBTC allocation percentage for an address
 */
export function useSbtcAllocation(
  address: StacksAddress | null,
  options: UsePortfolioOptions = {}
) {
  return useQuery({
    queryKey: ['sbtc', 'allocation', address] as const,
    queryFn: async (): Promise<number> => {
      const result = await portfolioService.getSbtcAllocation(address!);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: !!address && options.enabled !== false,
    staleTime: options.staleTime ?? CACHE_TTL.BALANCE,
    refetchInterval: options.refetchInterval ?? false,
    retry: 2,
  });
}
