/**
 * Network Configuration
 * 
 * Centralized configuration for Stacks network settings.
 * Supports both mainnet and testnet with automatic switching.
 * 
 * Based on: https://docs.stacks.co/stacks.js/networks
 */

import { STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';

export type NetworkType = 'mainnet' | 'testnet';

// Re-export standard network constants for convenience
export { STACKS_MAINNET, STACKS_TESTNET };

export interface NetworkConfig {
  name: NetworkType;
  displayName: string;
  apiUrl: string;
  explorerUrl: string;
  chainId: number;
  sbtcContracts: {
    token: string;
    deposit: string;
  };
  defiProtocols: {
    alex: string;
    zest: string;
    bitflow: string;
    stackingDao: string;
    velar: string;
  };
}

const mainnetConfig: NetworkConfig = {
  name: 'mainnet',
  displayName: 'Mainnet',
  apiUrl: process.env['NEXT_PUBLIC_MAINNET_API_URL'] || STACKS_MAINNET.client.baseUrl,
  explorerUrl: process.env['NEXT_PUBLIC_MAINNET_EXPLORER_URL'] || 'https://explorer.hiro.so',
  chainId: STACKS_MAINNET.chainId,
  sbtcContracts: {
    token: process.env['NEXT_PUBLIC_MAINNET_SBTC_TOKEN'] || 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token',
    deposit: process.env['NEXT_PUBLIC_MAINNET_SBTC_DEPOSIT'] || 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-deposit',
  },
  defiProtocols: {
    alex: process.env['NEXT_PUBLIC_ALEX_ROUTER'] || 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.amm-pool-v2-01',
    zest: process.env['NEXT_PUBLIC_ZEST_POOL'] || 'SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.pool-v1-0',
    bitflow: process.env['NEXT_PUBLIC_BITFLOW_ROUTER'] || 'SPQC38PW542ELJ5KNAC4BSJA7BXAK8ZFXY3JT9TP.stableswap-core-v-1-2',
    stackingDao: process.env['NEXT_PUBLIC_STACKING_DAO'] || 'SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.stacking-dao-core-v1',
    velar: process.env['NEXT_PUBLIC_VELAR_ROUTER'] || 'SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1.velar-v1',
  },
};

const testnetConfig: NetworkConfig = {
  name: 'testnet',
  displayName: 'Testnet',
  apiUrl: process.env['NEXT_PUBLIC_TESTNET_API_URL'] || STACKS_TESTNET.client.baseUrl,
  explorerUrl: process.env['NEXT_PUBLIC_TESTNET_EXPLORER_URL'] || 'https://explorer.hiro.so/?chain=testnet',
  chainId: STACKS_TESTNET.chainId,
  sbtcContracts: {
    token: process.env['NEXT_PUBLIC_TESTNET_SBTC_TOKEN'] || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token',
    deposit: process.env['NEXT_PUBLIC_TESTNET_SBTC_DEPOSIT'] || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-deposit',
  },
  defiProtocols: {
    alex: '', // May not exist on testnet
    zest: '',
    bitflow: '',
    stackingDao: '',
    velar: '',
  },
};

/**
 * Get the current network based on environment configuration
 */
export function getCurrentNetwork(): NetworkType {
  const network = process.env['NEXT_PUBLIC_NETWORK'] as NetworkType;
  return network === 'mainnet' ? 'mainnet' : 'testnet';
}

/**
 * Get configuration for a specific network
 */
export function getNetworkConfig(network?: NetworkType): NetworkConfig {
  const targetNetwork = network || getCurrentNetwork();
  return targetNetwork === 'mainnet' ? mainnetConfig : testnetConfig;
}

/**
 * Get the API URL for the current or specified network
 */
export function getApiUrl(network?: NetworkType): string {
  return getNetworkConfig(network).apiUrl;
}

/**
 * Get the explorer URL for a transaction, address, or block
 */
export function getExplorerUrl(
  type: 'tx' | 'address' | 'block' | 'contract',
  identifier: string,
  network?: NetworkType
): string {
  const config = getNetworkConfig(network);
  const baseUrl = config.explorerUrl;
  
  const paths: Record<typeof type, string> = {
    tx: 'txid',
    address: 'address',
    block: 'block',
    contract: 'address',
  };
  
  return `${baseUrl}/${paths[type]}/${identifier}`;
}

/**
 * Check if we're on mainnet
 */
export function isMainnet(network?: NetworkType): boolean {
  return (network || getCurrentNetwork()) === 'mainnet';
}

/**
 * Get sBTC contract address for current network
 */
export function getSbtcTokenContract(network?: NetworkType): string {
  return getNetworkConfig(network).sbtcContracts.token;
}

/**
 * Parse a contract identifier into deployer and name
 */
export function parseContractId(contractId: string): { deployer: string; name: string } | null {
  const parts = contractId.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return { deployer: parts[0], name: parts[1] };
}

export const networkConfig = {
  mainnet: mainnetConfig,
  testnet: testnetConfig,
  current: getNetworkConfig(),
};

export default networkConfig;
