/**
 * usePortfolio Hook
 * 
 * Aggregates real wallet balances with price data for portfolio view.
 */

import { useMemo } from 'react';
import type { PortfolioData } from '@/types';
import { usePrices } from './usePrices';
import { useSbtcBalance } from './useSbtcBalance';
import { useWallet } from './useWallet';
import { useDemoMode } from './useDemoMode';

// Mock balances for demo mode
const MOCK_BALANCES = {
  sBTC: 0.12856700,
  STX: 2450.50,
};

export function usePortfolio() {
  const { prices, isLoading: pricesLoading } = usePrices();
  const { sbtcBalance, isLoading: sbtcLoading } = useSbtcBalance();
  const { wallet, isLoading: walletLoading } = useWallet();
  const { demoMode } = useDemoMode();

  const isLoading = pricesLoading || sbtcLoading || walletLoading;

  const portfolio = useMemo<PortfolioData | null>(() => {
    if (!prices.length) return null;

    const sbtcPrice = prices.find(p => p.symbol === 'sBTC');
    const stxPrice = prices.find(p => p.symbol === 'STX');
    if (!sbtcPrice || !stxPrice) return null;

    // Use real balances when connected, mock for demo mode
    const sbtcBal = demoMode || !wallet.isConnected 
      ? MOCK_BALANCES.sBTC 
      : (sbtcBalance?.balance ?? 0);
    const stxBal = demoMode || !wallet.isConnected 
      ? MOCK_BALANCES.STX 
      : wallet.stxBalance;

    const sbtcValue = sbtcBal * sbtcPrice.price;
    const stxValue = stxBal * stxPrice.price;
    const totalValue = sbtcValue + stxValue;

    const sbtcChange = sbtcValue * (sbtcPrice.changePercent24h / 100);
    const stxChange = stxValue * (stxPrice.changePercent24h / 100);
    const change24h = sbtcChange + stxChange;
    const changePercent24h = totalValue > 0 ? (change24h / (totalValue - change24h)) * 100 : 0;

    return {
      totalValue,
      change24h,
      changePercent24h,
      lastUpdated: new Date(),
      holdings: [
        {
          token: 'sBTC',
          symbol: 'sBTC',
          balance: sbtcBal,
          value: sbtcValue,
          change24h: sbtcPrice.changePercent24h,
          changePercent24h: sbtcPrice.changePercent24h,
        },
        {
          token: 'Stacks',
          symbol: 'STX',
          balance: stxBal,
          value: stxValue,
          change24h: stxPrice.changePercent24h,
          changePercent24h: stxPrice.changePercent24h,
        },
      ],
    };
  }, [prices, sbtcBalance, wallet.isConnected, wallet.stxBalance, demoMode]);

  return { portfolio, isLoading };
}
