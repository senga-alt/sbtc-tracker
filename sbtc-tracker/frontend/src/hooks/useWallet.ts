/**
 * useWallet Hook
 * 
 * Real wallet connection using @stacks/connect v8.
 * Supports Leather, Xverse, and other Stacks wallets.
 * 
 * Based on: https://docs.stacks.co/stacks-connect/connect-wallet
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  connect,
  disconnect,
  isConnected,
  getLocalStorage,
} from '@stacks/connect';
import { getStxBalance } from '@/lib/hiro';
import type { WalletState } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

interface AddressInfo {
  address: string;
  publicKey?: string;
  type?: string;
  symbol?: string;
}

interface StoredAddresses {
  addresses?: {
    stx?: AddressInfo[];
    btc?: AddressInfo[];
  };
}

interface ConnectResponse {
  addresses?: AddressInfo[];
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Extract STX addresses from getLocalStorage() response.
 * Structure: { addresses: { stx: [{ address: "SP..." }, { address: "ST..." }] } }
 */
function extractFromStorage(stored: StoredAddresses | null): {
  mainnet: string | null;
  testnet: string | null;
} {
  let mainnetAddr: string | null = null;
  let testnetAddr: string | null = null;

  if (!stored?.addresses?.stx) {
    return { mainnet: null, testnet: null };
  }

  for (const addr of stored.addresses.stx) {
    if (typeof addr.address === 'string') {
      if (addr.address.startsWith('SP') || addr.address.startsWith('SM')) {
        mainnetAddr = addr.address;
      } else if (addr.address.startsWith('ST') || addr.address.startsWith('SN')) {
        testnetAddr = addr.address;
      }
    }
  }

  return { mainnet: mainnetAddr, testnet: testnetAddr };
}

/**
 * Extract STX addresses from connect() response.
 * Structure: { addresses: [{ address: "SP...", symbol: "STX" }, ...] }
 */
function extractFromConnectResponse(response: ConnectResponse | null): {
  mainnet: string | null;
  testnet: string | null;
} {
  let mainnetAddr: string | null = null;
  let testnetAddr: string | null = null;

  if (!response?.addresses || !Array.isArray(response.addresses)) {
    return { mainnet: null, testnet: null };
  }

  for (const addr of response.addresses) {
    if (typeof addr.address === 'string') {
      // Check for STX addresses by prefix
      if (addr.address.startsWith('SP') || addr.address.startsWith('SM')) {
        mainnetAddr = addr.address;
      } else if (addr.address.startsWith('ST') || addr.address.startsWith('SN')) {
        testnetAddr = addr.address;
      }
    }
  }

  return { mainnet: mainnetAddr, testnet: testnetAddr };
}

// =============================================================================
// HOOK
// =============================================================================

export function useWallet() {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    address: null,
    network: 'mainnet',
    stxBalance: 0,
  });

  // Get current network from localStorage
  const getStoredNetwork = (): 'mainnet' | 'testnet' => {
    try {
      return (localStorage.getItem('sbtc-network') as 'mainnet' | 'testnet') || 'mainnet';
    } catch {
      return 'mainnet';
    }
  };

  // Check existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const network = getStoredNetwork();
        
        if (isConnected()) {
          const stored = getLocalStorage() as StoredAddresses | null;
          const { mainnet, testnet } = extractFromStorage(stored);
          const address = network === 'mainnet' ? mainnet : testnet;
          
          if (address) {
            // Fetch real STX balance
            let stxBalance = 0;
            try {
              const balanceData = await getStxBalance(address, network);
              stxBalance = balanceData.balance;
            } catch (err) {
              console.warn('Failed to fetch STX balance:', err);
            }

            setWallet({
              isConnected: true,
              address,
              network,
              stxBalance,
            });
          } else {
            // Connected but no address for current network
            setWallet(prev => ({
              ...prev,
              isConnected: false,
              network,
            }));
          }
        } else {
          setWallet(prev => ({
            ...prev,
            network,
          }));
        }
      } catch (err) {
        console.error('Failed to check wallet connection:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();
  }, []);

  // Connect wallet using @stacks/connect v8
  // Per Stacks docs: connect() initiates wallet connection and stores addresses
  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Call connect() - this will show the wallet selector modal
      // Per drip-protocol pattern and Stacks docs
      console.log('[Wallet] Calling connect()...');
      const response = await connect();
      console.log('[Wallet] Connect response:', response);
      
      // Extract addresses from response
      const { mainnet, testnet } = extractFromConnectResponse(response);
      
      // Also check localStorage as fallback (some wallets store differently)
      const stored = getLocalStorage() as StoredAddresses | null;
      const fromStorage = extractFromStorage(stored);
      
      const mainnetAddr = mainnet || fromStorage.mainnet;
      const testnetAddr = testnet || fromStorage.testnet;
      
      const network = getStoredNetwork();
      const address = network === 'mainnet' ? mainnetAddr : testnetAddr;
      
      if (!address) {
        throw new Error(`No ${network} address returned from wallet. Try switching networks.`);
      }

      // Fetch STX balance
      let stxBalance = 0;
      try {
        const balanceData = await getStxBalance(address, network);
        stxBalance = balanceData.balance;
      } catch (err) {
        console.warn('Failed to fetch STX balance:', err);
      }

      setWallet({
        isConnected: true,
        address,
        network,
        stxBalance,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(message);
      console.error('Wallet connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    disconnect();
    setWallet(prev => ({
      isConnected: false,
      address: null,
      network: prev.network,
      stxBalance: 0,
    }));
    setError(null);
  }, []);

  // Switch network
  const switchNetwork = useCallback(async (network: 'mainnet' | 'testnet') => {
    // Store network preference
    try {
      localStorage.setItem('sbtc-network', network);
    } catch {
      // Ignore localStorage errors
    }

    if (!wallet.isConnected) {
      setWallet(prev => ({ ...prev, network }));
      return;
    }

    // Get address for new network from stored data
    const stored = getLocalStorage() as StoredAddresses | null;
    const { mainnet, testnet } = extractFromStorage(stored);
    const address = network === 'mainnet' ? mainnet : testnet;

    if (address) {
      // Fetch balance for new network
      let stxBalance = 0;
      try {
        const balanceData = await getStxBalance(address, network);
        stxBalance = balanceData.balance;
      } catch {
        console.warn('Failed to fetch STX balance for new network');
      }

      setWallet({
        isConnected: true,
        address,
        network,
        stxBalance,
      });
    } else {
      // No address for this network - stay connected but show warning
      setWallet(prev => ({
        ...prev,
        network,
        address: null,
        stxBalance: 0,
      }));
      setError(`No ${network} address found. Reconnect your wallet.`);
    }
  }, [wallet.isConnected]);

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!wallet.isConnected || !wallet.address) return;

    try {
      const balanceData = await getStxBalance(wallet.address, wallet.network);
      setWallet(prev => ({
        ...prev,
        stxBalance: balanceData.balance,
      }));
    } catch (err) {
      console.warn('Failed to refresh balance:', err);
    }
  }, [wallet.isConnected, wallet.address, wallet.network]);

  return {
    wallet,
    isLoading,
    isConnecting,
    error,
    connect: connectWallet,
    disconnect: disconnectWallet,
    switchNetwork,
    refreshBalance,
  };
}
