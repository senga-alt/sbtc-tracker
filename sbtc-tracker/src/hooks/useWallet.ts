/**
 * useWallet Hook
 * 
 * React hook for wallet connection using the modern @stacks/connect v8 API.
 * Supports Leather, Xverse, and other Stacks wallets.
 * 
 * Based on: https://docs.stacks.co/stacks-connect/connect-wallet
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { 
  connect,
  disconnect,
  isConnected,
  getLocalStorage,
  request,
} from '@stacks/connect';
import { useWalletStore } from '@/stores/wallet';
import type { ConnectedWallet, WalletProvider } from '@/types/wallet';
import type { StacksAddress } from '@/types/common';

// =============================================================================
// CONSTANTS
// =============================================================================

const APP_NAME = 'sBTC Portfolio Tracker';

// =============================================================================
// TYPES
// =============================================================================

interface AddressInfo {
  address: string;
  publicKey?: string;
  symbol?: string;
}

interface ConnectResult {
  addresses: AddressInfo[];
}

interface UseWalletReturn {
  // State
  wallet: ConnectedWallet | null;
  isConnected: boolean;
  isConnecting: boolean;
  address: StacksAddress | null;
  error: string | null;
  
  // Actions
  connectWallet: (provider?: WalletProvider) => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (network: 'mainnet' | 'testnet') => void;
  
  // Request helper
  walletRequest: typeof request;
}

// =============================================================================
// HELPER: Extract addresses from response
// =============================================================================

function extractAddresses(response: ConnectResult): {
  mainnet: StacksAddress | null;
  testnet: StacksAddress | null;
  btc: string | null;
  publicKey: string;
} {
  let mainnetAddr: StacksAddress | null = null;
  let testnetAddr: StacksAddress | null = null;
  let btcAddr: string | null = null;
  let pubKey = '';

  // Extract addresses from response
  if (response.addresses && Array.isArray(response.addresses)) {
    for (const addr of response.addresses) {
      // STX addresses
      if (typeof addr.address === 'string') {
        if (addr.address.startsWith('SP')) {
          mainnetAddr = addr.address as StacksAddress;
          pubKey = addr.publicKey || pubKey;
        } else if (addr.address.startsWith('ST')) {
          testnetAddr = addr.address as StacksAddress;
          pubKey = addr.publicKey || pubKey;
        } else if (addr.address.startsWith('bc1') || addr.address.startsWith('3') || addr.address.startsWith('1')) {
          // Bitcoin addresses
          btcAddr = addr.address;
        }
      }
    }
  }

  return { mainnet: mainnetAddr, testnet: testnetAddr, btc: btcAddr, publicKey: pubKey };
}

// =============================================================================
// HOOK
// =============================================================================

export function useWallet(): UseWalletReturn {
  const {
    wallet,
    isConnected: storeIsConnected,
    setWallet,
    setConnectionState,
    disconnect: storeDisconnect,
    preferences,
    setNetwork,
  } = useWalletStore();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check existing connection on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
        // Check if already connected via @stacks/connect local storage
        if (isConnected()) {
          const stored = getLocalStorage();
          if (stored?.addresses) {
            // Extract addresses from stored data (v8 format: addresses.stx and addresses.btc)
            let mainnetAddr: StacksAddress | null = null;
            let testnetAddr: StacksAddress | null = null;
            let btcAddr: string | null = null;

            // Get STX addresses
            if (stored.addresses.stx && Array.isArray(stored.addresses.stx)) {
              for (const addr of stored.addresses.stx) {
                if (addr.address?.startsWith('SP')) {
                  mainnetAddr = addr.address as StacksAddress;
                } else if (addr.address?.startsWith('ST')) {
                  testnetAddr = addr.address as StacksAddress;
                }
              }
            }

            // Get BTC address
            if (stored.addresses.btc && Array.isArray(stored.addresses.btc) && stored.addresses.btc[0]) {
              btcAddr = stored.addresses.btc[0].address || null;
            }

            if (mainnetAddr || testnetAddr) {
              const connectedWallet: ConnectedWallet = {
                stxAddresses: {
                  mainnet: mainnetAddr || ('' as StacksAddress),
                  testnet: testnetAddr || ('' as StacksAddress),
                },
                btcAddress: btcAddr,
                provider: 'leather', // Default - v8 doesn't store provider in localStorage
                publicKey: '',
                appPrivateKey: '',
                profile: {},
              };
              setWallet(connectedWallet);
            }
          }
        }
      } catch (err) {
        console.warn('Error checking existing connection:', err);
      }
    };

    checkExistingConnection();
  }, [setWallet]);

  /**
   * Connect wallet using modern @stacks/connect API
   */
  const connectWallet = useCallback(async (provider?: WalletProvider) => {
    setIsConnecting(true);
    setError(null);
    setConnectionState('connecting');

    try {
      // Build connect options
      const options: Parameters<typeof connect>[0] = {};
      
      // If a specific provider is requested, filter to that provider
      if (provider) {
        const providerMap: Record<WalletProvider, string> = {
          leather: 'LeatherProvider',
          xverse: 'XverseProvider',
          okx: 'OkxProvider',
          asigna: 'AsignaProvider',
        };
        options.approvedProviderIds = [providerMap[provider]];
      }

      // Connect to wallet
      const response = await connect(options);
      
      // Extract addresses from response
      const { mainnet, testnet, btc, publicKey } = extractAddresses(response as ConnectResult);

      if (!mainnet && !testnet) {
        throw new Error('No Stacks address returned from wallet');
      }

      // Create wallet object
      const connectedWallet: ConnectedWallet = {
        stxAddresses: {
          mainnet: mainnet || ('' as StacksAddress),
          testnet: testnet || ('' as StacksAddress),
        },
        btcAddress: btc,
        provider: provider || 'leather',
        publicKey,
        appPrivateKey: '',
        profile: {},
      };

      setWallet(connectedWallet);
      setError(null);
      
    } catch (err) {
      console.error('Wallet connection failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to connect wallet';
      
      // Check if user cancelled
      if (message.includes('cancel') || message.includes('rejected')) {
        setConnectionState('disconnected');
      } else {
        setConnectionState('error');
      }
      
      setError(message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [setWallet, setConnectionState]);

  /**
   * Disconnect wallet
   */
  const disconnectWallet = useCallback(() => {
    // Clear @stacks/connect local storage
    disconnect();
    
    // Clear store
    storeDisconnect();
    setError(null);
  }, [storeDisconnect]);

  /**
   * Switch network
   */
  const switchNetwork = useCallback((network: 'mainnet' | 'testnet') => {
    setNetwork(network);
  }, [setNetwork]);

  // Get current address based on network preference
  const address = wallet
    ? preferences.network === 'mainnet'
      ? wallet.stxAddresses.mainnet
      : wallet.stxAddresses.testnet
    : null;

  // Check if connected (either from store or @stacks/connect)
  const walletIsConnected = storeIsConnected || isConnected();

  return {
    wallet,
    isConnected: walletIsConnected,
    isConnecting,
    address,
    error,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    walletRequest: request,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export { request as walletRequest };
