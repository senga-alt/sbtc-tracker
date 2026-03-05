/**
 * Wallet Store
 * 
 * Zustand store for managing wallet connection state.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { StacksAddress, Network } from '@/types/common';
import type { 
  ConnectedWallet, 
  WalletState,
  WalletProvider 
} from '@/types/wallet';

// =============================================================================
// TYPES
// =============================================================================

export interface WatchedAddress {
  address: StacksAddress;
  label?: string;
  addedAt: number;
}

export interface WalletPreferences {
  autoConnect: boolean;
  preferredProvider: WalletProvider | null;
  network: Network;
}

interface WalletStore {
  // State
  wallet: ConnectedWallet | null;
  connectionState: WalletState;
  watchedAddresses: WatchedAddress[];
  preferences: WalletPreferences;
  lastConnectedAt: number | null;

  // Actions
  setWallet: (wallet: ConnectedWallet | null) => void;
  setConnectionState: (state: WalletState) => void;
  
  // Watched addresses
  addWatchedAddress: (address: StacksAddress, label?: string) => void;
  removeWatchedAddress: (address: StacksAddress) => void;
  updateWatchedAddressLabel: (address: StacksAddress, label: string) => void;
  
  // Preferences
  setPreferences: (prefs: Partial<WalletPreferences>) => void;
  setNetwork: (network: Network) => void;
  
  // Derived
  isConnected: boolean;
  currentAddress: StacksAddress | null;
  allAddresses: StacksAddress[];
  
  // Reset
  disconnect: () => void;
  reset: () => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialPreferences: WalletPreferences = {
  autoConnect: true,
  preferredProvider: null,
  network: 'mainnet',
};

const initialState = {
  wallet: null,
  connectionState: 'disconnected' as WalletState,
  watchedAddresses: [] as WatchedAddress[],
  preferences: initialPreferences,
  lastConnectedAt: null,
  isConnected: false,
  currentAddress: null,
  allAddresses: [] as StacksAddress[],
};

// =============================================================================
// STORE
// =============================================================================

export const useWalletStore = create<WalletStore>()(
  persist(
    immer((set) => ({
      ...initialState,

      // Set wallet on connection
      setWallet: (wallet) =>
        set((state) => {
          state.wallet = wallet;
          state.connectionState = wallet ? 'connected' : 'disconnected';
          state.lastConnectedAt = wallet ? Date.now() : null;

          // Update derived state
          state.isConnected = !!wallet;
          state.currentAddress = wallet?.stxAddresses.mainnet ?? null;

          // Recalculate all addresses
          const addresses: StacksAddress[] = [];
          if (wallet?.stxAddresses.mainnet) {
            addresses.push(wallet.stxAddresses.mainnet);
          }
          state.watchedAddresses.forEach((w) => {
            if (!addresses.includes(w.address)) {
              addresses.push(w.address);
            }
          });
          state.allAddresses = addresses;
        }),

      setConnectionState: (connectionState) =>
        set((state) => {
          state.connectionState = connectionState;
        }),

      // Watched addresses management
      addWatchedAddress: (address, label) =>
        set((state) => {
          const exists = state.watchedAddresses.some((w) => w.address === address);
          if (!exists) {
            state.watchedAddresses.push({
              address,
              label,
              addedAt: Date.now(),
            });

            // Update all addresses
            if (!state.allAddresses.includes(address)) {
              state.allAddresses.push(address);
            }
          }
        }),

      removeWatchedAddress: (address) =>
        set((state) => {
          state.watchedAddresses = state.watchedAddresses.filter(
            (w) => w.address !== address
          );

          // Update all addresses - only remove if not the connected wallet
          if (state.wallet?.stxAddresses.mainnet !== address) {
            state.allAddresses = state.allAddresses.filter((a) => a !== address);
          }
        }),

      updateWatchedAddressLabel: (address, label) =>
        set((state) => {
          const watched = state.watchedAddresses.find((w) => w.address === address);
          if (watched) {
            watched.label = label;
          }
        }),

      // Preferences
      setPreferences: (prefs) =>
        set((state) => {
          state.preferences = { ...state.preferences, ...prefs };
        }),

      setNetwork: (network) =>
        set((state) => {
          state.preferences.network = network;
          // Update current address based on network
          if (state.wallet) {
            state.currentAddress =
              network === 'mainnet'
                ? state.wallet.stxAddresses.mainnet
                : state.wallet.stxAddresses.testnet;
          }
        }),

      // Disconnect wallet but keep watched addresses
      disconnect: () =>
        set((state) => {
          state.wallet = null;
          state.connectionState = 'disconnected';
          state.isConnected = false;
          state.currentAddress = null;

          // Keep only watched addresses in allAddresses
          state.allAddresses = state.watchedAddresses.map((w) => w.address);
        }),

      // Full reset
      reset: () =>
        set(() => ({
          ...initialState,
          preferences: initialPreferences,
        })),
    })),
    {
      name: 'sbtc-wallet-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        watchedAddresses: state.watchedAddresses,
        preferences: state.preferences,
        // Don't persist wallet - should reconnect each session
      }),
    }
  )
);

// =============================================================================
// SELECTORS (for performance optimization)
// =============================================================================

export const selectWallet = (state: WalletStore) => state.wallet;
export const selectIsConnected = (state: WalletStore) => state.isConnected;
export const selectCurrentAddress = (state: WalletStore) => state.currentAddress;
export const selectAllAddresses = (state: WalletStore) => state.allAddresses;
export const selectWatchedAddresses = (state: WalletStore) => state.watchedAddresses;
export const selectNetwork = (state: WalletStore) => state.preferences.network;
export const selectConnectionState = (state: WalletStore) => state.connectionState;
