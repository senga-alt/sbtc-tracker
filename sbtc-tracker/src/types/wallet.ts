/**
 * Wallet Types
 * 
 * Types for wallet connection and management.
 */

import type { StacksAddress, Network } from './common';

// =============================================================================
// WALLET PROVIDER TYPES
// =============================================================================

/**
 * Supported wallet providers
 */
export type WalletProvider = 'leather' | 'xverse' | 'okx' | 'asigna';

/**
 * Wallet connection status
 */
export type WalletConnectionStatus = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

/**
 * Wallet state (simple string type for store)
 */
export type WalletState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Connected wallet information
 */
export interface ConnectedWallet {
  provider: WalletProvider;
  stxAddresses: {
    mainnet: StacksAddress;
    testnet: StacksAddress;
  };
  btcAddress: string | null;
  publicKey: string;
  appPrivateKey: string;
  profile: Record<string, unknown>;
}

/**
 * Wallet state object
 */
export interface WalletStateObject {
  status: WalletConnectionStatus;
  wallet: ConnectedWallet | null;
  error: string | null;
  isConnecting: boolean;
}

// =============================================================================
// WALLET ACTIONS
// =============================================================================

/**
 * Wallet connection options
 */
export interface WalletConnectOptions {
  provider?: WalletProvider;
  network?: Network;
  onConnect?: (wallet: ConnectedWallet) => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Wallet disconnect options
 */
export interface WalletDisconnectOptions {
  clearStorage?: boolean;
  onDisconnect?: () => void;
}

// =============================================================================
// WALLET PROVIDER INFO
// =============================================================================

/**
 * Wallet provider metadata
 */
export interface WalletProviderInfo {
  id: WalletProvider;
  name: string;
  icon: string;
  downloadUrl: string;
  description: string;
  isInstalled: () => boolean;
  supportedNetworks: Network[];
}

/**
 * Available wallet providers
 */
export const WALLET_PROVIDERS: WalletProviderInfo[] = [
  {
    id: 'leather',
    name: 'Leather',
    icon: '/wallets/leather.svg',
    downloadUrl: 'https://leather.io',
    description: 'The most popular Stacks wallet',
    isInstalled: () => typeof window !== 'undefined' && !!(window as any).LeatherProvider,
    supportedNetworks: ['mainnet', 'testnet'],
  },
  {
    id: 'xverse',
    name: 'Xverse',
    icon: '/wallets/xverse.svg',
    downloadUrl: 'https://www.xverse.app',
    description: 'Bitcoin & Stacks wallet',
    isInstalled: () => typeof window !== 'undefined' && !!(window as any).XverseProviders,
    supportedNetworks: ['mainnet', 'testnet'],
  },
  {
    id: 'okx',
    name: 'OKX Wallet',
    icon: '/wallets/okx.svg',
    downloadUrl: 'https://www.okx.com/web3',
    description: 'Multi-chain Web3 wallet',
    isInstalled: () => typeof window !== 'undefined' && !!(window as any).okxwallet,
    supportedNetworks: ['mainnet'],
  },
  {
    id: 'asigna',
    name: 'Asigna',
    icon: '/wallets/asigna.svg',
    downloadUrl: 'https://asigna.io',
    description: 'Multi-sig wallet for Stacks',
    isInstalled: () => typeof window !== 'undefined' && !!(window as any).AsignaProvider,
    supportedNetworks: ['mainnet', 'testnet'],
  },
];

// =============================================================================
// SIGNING TYPES
// =============================================================================

/**
 * Message to sign
 */
export interface SignMessageRequest {
  message: string;
  network?: Network;
}

/**
 * Signed message response
 */
export interface SignedMessage {
  signature: string;
  publicKey: string;
  message: string;
}

/**
 * Transaction signing request
 */
export interface SignTransactionRequest {
  txHex: string;
  network?: Network;
}

/**
 * Signed transaction response
 */
export interface SignedTransaction {
  txHex: string;
  txId: string;
}
