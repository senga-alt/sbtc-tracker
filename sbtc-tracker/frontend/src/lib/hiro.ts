/**
 * Hiro Stacks API Client
 * 
 * Service for interacting with the Hiro Stacks Blockchain API.
 * Handles account balances, transactions, and sBTC-specific data.
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const HIRO_API = {
  mainnet: 'https://api.hiro.so',
  testnet: 'https://api.testnet.hiro.so',
} as const;

// sBTC token contract addresses (official from Stacks docs)
// https://docs.stacks.co/clarinet/integrations/sbtc
const SBTC_CONTRACT = {
  mainnet: 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token',
  testnet: 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token',
} as const;

const DECIMALS = {
  STX: 6,
  SBTC: 8,
  BTC: 8,
} as const;

type Network = 'mainnet' | 'testnet';

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

interface HiroAccountBalance {
  stx: {
    balance: string;
    total_sent: string;
    total_received: string;
    locked: string;
  };
  fungible_tokens: Record<string, { balance: string; total_sent: string; total_received: string }>;
  non_fungible_tokens: Record<string, { count: number; total_sent: number; total_received: number }>;
}

interface HiroTransaction {
  tx_id: string;
  tx_type: string;
  tx_status: string;
  nonce: number;
  fee_rate: string;
  sender_address: string;
  block_height?: number;
  block_time?: number;
  block_time_iso?: string;
  token_transfer?: {
    recipient_address: string;
    amount: string;
    memo: string;
  };
  contract_call?: {
    contract_id: string;
    function_name: string;
    function_args?: Array<{
      hex: string;
      repr: string;
      name: string;
      type: string;
    }>;
  };
  events?: Array<{
    event_index: number;
    event_type: string;
    tx_id: string;
    ft_transfer_event?: {
      asset_identifier: string;
      amount: string;
      sender: string;
      recipient: string;
    };
  }>;
}

interface PaginatedResponse<T> {
  limit: number;
  offset: number;
  total: number;
  results: T[];
}

// =============================================================================
// UTILS
// =============================================================================

function getApiUrl(network: Network): string {
  return HIRO_API[network];
}

function getSbtcContract(network: Network): string {
  return SBTC_CONTRACT[network];
}

function microToStandard(microAmount: string, decimals: number): number {
  return parseInt(microAmount, 10) / Math.pow(10, decimals);
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Fetch account balances (STX and all tokens)
 */
export async function getAccountBalance(
  address: string,
  network: Network = 'mainnet'
): Promise<HiroAccountBalance> {
  const url = `${getApiUrl(network)}/extended/v1/address/${address}/balances`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch balance: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get STX balance in standard units
 */
export async function getStxBalance(
  address: string,
  network: Network = 'mainnet'
): Promise<{ balance: number; locked: number }> {
  const data = await getAccountBalance(address, network);
  
  return {
    balance: microToStandard(data.stx.balance, DECIMALS.STX),
    locked: microToStandard(data.stx.locked, DECIMALS.STX),
  };
}

/**
 * Get sBTC balance in standard units (BTC)
 */
export async function getSbtcBalance(
  address: string,
  network: Network = 'mainnet'
): Promise<number> {
  const data = await getAccountBalance(address, network);
  const sbtcContract = getSbtcContract(network);
  const sbtcKey = `${sbtcContract}::sbtc`;
  
  const sbtcBalance = data.fungible_tokens[sbtcKey];
  if (!sbtcBalance) return 0;
  
  return microToStandard(sbtcBalance.balance, DECIMALS.SBTC);
}

/**
 * Get all token balances
 */
export async function getAllBalances(
  address: string,
  network: Network = 'mainnet'
): Promise<{
  stx: { balance: number; locked: number };
  sbtc: number;
  tokens: Array<{ contractId: string; balance: string }>;
}> {
  const data = await getAccountBalance(address, network);
  const sbtcContract = getSbtcContract(network);
  const sbtcKey = `${sbtcContract}::sbtc`;
  
  const tokens = Object.entries(data.fungible_tokens)
    .filter(([key]) => key !== sbtcKey)
    .map(([key, value]) => ({
      contractId: key.split('::')[0] || key,
      balance: value.balance,
    }));
  
  return {
    stx: {
      balance: microToStandard(data.stx.balance, DECIMALS.STX),
      locked: microToStandard(data.stx.locked, DECIMALS.STX),
    },
    sbtc: microToStandard(data.fungible_tokens[sbtcKey]?.balance || '0', DECIMALS.SBTC),
    tokens,
  };
}

/**
 * Get transactions for an address
 */
export async function getTransactions(
  address: string,
  network: Network = 'mainnet',
  options: { limit?: number; offset?: number } = {}
): Promise<PaginatedResponse<HiroTransaction>> {
  const { limit = 50, offset = 0 } = options;
  const url = `${getApiUrl(network)}/extended/v1/address/${address}/transactions?limit=${limit}&offset=${offset}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch transactions: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get sBTC-specific transactions
 */
export async function getSbtcTransactions(
  address: string,
  network: Network = 'mainnet',
  options: { limit?: number; offset?: number } = {}
): Promise<PaginatedResponse<HiroTransaction>> {
  const { limit = 50 } = options;
  const sbtcContract = getSbtcContract(network);
  
  // Fetch more transactions and filter for sBTC-related ones
  const data = await getTransactions(address, network, { ...options, limit: limit * 2 });
  
  const sbtcTxs = data.results.filter((tx) => {
    // Contract call to sBTC
    if (tx.contract_call?.contract_id === sbtcContract) return true;
    
    // FT transfer event involving sBTC
    return tx.events?.some(
      (e) => e.ft_transfer_event?.asset_identifier?.startsWith(sbtcContract)
    );
  });
  
  return {
    ...data,
    results: sbtcTxs.slice(0, limit),
    total: sbtcTxs.length,
  };
}

/**
 * Get pending mempool transactions
 */
export async function getMempoolTransactions(
  address: string,
  network: Network = 'mainnet',
  options: { limit?: number } = {}
): Promise<PaginatedResponse<HiroTransaction>> {
  const { limit = 20 } = options;
  const url = `${getApiUrl(network)}/extended/v1/tx/mempool?sender_address=${address}&limit=${limit}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch mempool: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get a single transaction by ID
 */
export async function getTransaction(
  txId: string,
  network: Network = 'mainnet'
): Promise<HiroTransaction> {
  const url = `${getApiUrl(network)}/extended/v1/tx/${txId}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch transaction: ${response.statusText}`);
  }
  
  return response.json();
}

// =============================================================================
// EXPORTS
// =============================================================================

export { DECIMALS, SBTC_CONTRACT, microToStandard };
export type { HiroAccountBalance, HiroTransaction, PaginatedResponse, Network };
