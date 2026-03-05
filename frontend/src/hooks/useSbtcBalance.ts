/**
 * useSbtcBalance Hook
 * 
 * Fetches real sBTC balance from Hiro API based on connected wallet.
 */

import { useState, useEffect, useCallback } from 'react';
import type { SbtcBalance } from '@/types';
import { usePrices } from './usePrices';
import { useWallet } from './useWallet';
import { getSbtcBalance as fetchSbtcBalance } from '@/lib/hiro';

export function useSbtcBalance() {
  const { prices, isLoading: pricesLoading } = usePrices();
  const { wallet } = useWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Fetch sBTC balance from Hiro API
  const fetchBalance = useCallback(async () => {
    if (!wallet.isConnected || !wallet.address) {
      setBalance(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const sbtcBalance = await fetchSbtcBalance(wallet.address, wallet.network);
      setBalance(sbtcBalance);
    } catch (err) {
      console.error('Failed to fetch sBTC balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      setBalance(0);
    } finally {
      setIsLoading(false);
    }
  }, [wallet.isConnected, wallet.address, wallet.network]);

  // Fetch balance when wallet changes
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Calculate balance in USD
  const sbtcBalance: SbtcBalance | null = (() => {
    const sbtc = prices.find(p => p.symbol === 'sBTC');
    if (!sbtc) return null;

    const balanceUsd = balance * sbtc.price;
    const change24h = balanceUsd * (sbtc.changePercent24h / 100);

    return {
      balance,
      balanceUsd,
      change24h,
      changePercent24h: sbtc.changePercent24h,
    };
  })();

  return { 
    sbtcBalance, 
    isLoading: isLoading || pricesLoading,
    error,
    refetch: fetchBalance,
  };
}
