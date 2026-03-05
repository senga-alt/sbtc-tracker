/**
 * useTransactions Hook
 * 
 * Fetches real transactions from Hiro API when wallet is connected.
 * Falls back to mock data in demo mode or when disconnected.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Transaction } from '@/types';
import { useWallet } from './useWallet';
import { useDemoMode } from './useDemoMode';
import { getTransactions as fetchTransactions, type HiroTransaction } from '@/lib/hiro';

// =============================================================================
// MOCK DATA (for demo mode and disconnected state)
// =============================================================================

const now = new Date();
const mins = (m: number) => new Date(now.getTime() - m * 60000);
const hours = (h: number) => new Date(now.getTime() - h * 3600000);
const days = (d: number) => new Date(now.getTime() - d * 86400000);

const MOCK_TXS: Transaction[] = [
  { id: '1', type: 'receive', token: 'sBTC', amount: 0.05, value: 4860, from: 'SP1A2B3C4D5E6F7G8H9I0J', to: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', timestamp: mins(12), status: 'confirmed', txHash: '0xabc123def456' },
  { id: '2', type: 'send', token: 'STX', amount: 500, value: 925, from: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', to: 'SP3X4Y5Z6A7B8C9D0E1F2G', timestamp: mins(45), status: 'confirmed', txHash: '0xdef456abc789' },
  { id: '3', type: 'swap', token: 'sBTC', amount: 0.02, value: 1943, from: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', to: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', timestamp: hours(2), status: 'confirmed', txHash: '0xghi789jkl012' },
  { id: '4', type: 'receive', token: 'STX', amount: 1200, value: 2220, from: 'SP4D5E6F7G8H9I0J1K2L3M', to: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', timestamp: hours(5), status: 'confirmed', txHash: '0xjkl012mno345' },
  { id: '5', type: 'send', token: 'sBTC', amount: 0.01, value: 971.50, from: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', to: 'SP5E6F7G8H9I0J1K2L3M4N', timestamp: hours(8), status: 'pending', txHash: '0xmno345pqr678' },
  { id: '6', type: 'receive', token: 'sBTC', amount: 0.03, value: 2914.50, from: 'SP6F7G8H9I0J1K2L3M4N5O', to: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', timestamp: hours(12), status: 'confirmed', txHash: '0xpqr678stu901' },
  { id: '7', type: 'swap', token: 'STX', amount: 800, value: 1480, from: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', to: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', timestamp: hours(18), status: 'confirmed', txHash: '0xstu901vwx234' },
  { id: '8', type: 'receive', token: 'STX', amount: 350, value: 647.50, from: 'SP7G8H9I0J1K2L3M4N5O6P', to: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', timestamp: hours(24), status: 'confirmed', txHash: '0xvwx234yza567' },
  { id: '9', type: 'send', token: 'STX', amount: 250, value: 462.50, from: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', to: 'SP8H9I0J1K2L3M4N5O6P7Q', timestamp: days(1.5), status: 'confirmed', txHash: '0xbcd890efg123' },
  { id: '10', type: 'receive', token: 'sBTC', amount: 0.015, value: 1457.25, from: 'SP9I0J1K2L3M4N5O6P7Q8R', to: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', timestamp: days(2), status: 'confirmed', txHash: '0xefg123hij456' },
];

// =============================================================================
// TRANSFORM HIRO TX TO APP TX
// =============================================================================

function transformTransaction(
  tx: HiroTransaction,
  userAddress: string
): Transaction {
  const isSender = tx.sender_address === userAddress;
  
  // Determine transaction type
  let type: 'send' | 'receive' | 'swap' = 'receive';
  let token = 'STX';
  let amount = 0;
  let from = tx.sender_address;
  let to = '';

  if (tx.token_transfer) {
    // STX transfer
    token = 'STX';
    amount = parseInt(tx.token_transfer.amount, 10) / 1_000_000; // µSTX to STX
    to = tx.token_transfer.recipient_address;
    type = isSender ? 'send' : 'receive';
  } else if (tx.contract_call) {
    // Contract call - could be swap or sBTC transfer
    const fnName = tx.contract_call.function_name.toLowerCase();
    
    if (fnName.includes('swap') || fnName.includes('exchange')) {
      type = 'swap';
      token = 'STX'; // Default, would need more logic for accurate token
    } else if (fnName.includes('transfer')) {
      type = isSender ? 'send' : 'receive';
      // Check if it's sBTC
      if (tx.contract_call.contract_id.includes('sbtc')) {
        token = 'sBTC';
      }
    }
    to = tx.contract_call.contract_id;
    
    // Try to get amount from FT transfer events
    const ftEvent = tx.events?.find(e => e.ft_transfer_event);
    if (ftEvent?.ft_transfer_event) {
      amount = parseInt(ftEvent.ft_transfer_event.amount, 10) / 100_000_000; // Assuming 8 decimals
      to = ftEvent.ft_transfer_event.recipient;
      from = ftEvent.ft_transfer_event.sender;
    }
  }

  return {
    id: tx.tx_id,
    type,
    token,
    amount,
    value: 0, // Would need price data to calculate
    from,
    to,
    timestamp: tx.block_time ? new Date(tx.block_time * 1000) : new Date(),
    status: tx.tx_status === 'success' ? 'confirmed' : 'pending',
    txHash: tx.tx_id,
  };
}

// =============================================================================
// HOOK
// =============================================================================

export function useTransactions() {
  const { wallet } = useWallet();
  const { demoMode } = useDemoMode();
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Fetch transactions
  const fetchTxs = useCallback(async (reset = false) => {
    // Use mock data if in demo mode or not connected
    if (demoMode || !wallet.isConnected || !wallet.address) {
      setTransactions(MOCK_TXS);
      setIsLoading(false);
      setHasMore(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const currentOffset = reset ? 0 : offset;
      const data = await fetchTransactions(wallet.address, wallet.network, { 
        limit: 20, 
        offset: currentOffset 
      });

      const transformedTxs = data.results.map(tx => 
        transformTransaction(tx, wallet.address!)
      );

      if (reset) {
        setTransactions(transformedTxs);
        setOffset(20);
      } else {
        setTransactions(prev => [...prev, ...transformedTxs]);
        setOffset(prev => prev + 20);
      }

      setHasMore(data.results.length === 20 && data.total > currentOffset + 20);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
      // Fall back to mock data on error
      if (transactions.length === 0) {
        setTransactions(MOCK_TXS);
      }
    } finally {
      setIsLoading(false);
    }
  }, [wallet.isConnected, wallet.address, wallet.network, demoMode, offset, transactions.length]);

  // Initial fetch
  useEffect(() => {
    fetchTxs(true);
  }, [wallet.address, wallet.network, demoMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load more function for pagination
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchTxs(false);
    }
  }, [isLoading, hasMore, fetchTxs]);

  return { 
    transactions, 
    isLoading, 
    error,
    hasMore,
    loadMore,
    refetch: () => fetchTxs(true),
  };
}
