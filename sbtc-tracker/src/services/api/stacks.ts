/**
 * Hiro Stacks API Service
 * 
 * Service layer for interacting with the Hiro Stacks Blockchain API.
 * Handles account data, transactions, contract calls, and token balances.
 */

import { getApiClient } from './client';
import { getNetworkConfig, getSbtcTokenContract, parseContractId } from '@/config/network';
import { DECIMALS } from '@/config/constants';
import type { 
  Result, 
  ApiError, 
  StacksAddress, 
  Network, 
  PaginatedResponse,
  TxId,
  ContractId,
} from '@/types';

// =============================================================================
// API RESPONSE TYPES (Raw from Hiro API)
// =============================================================================

interface HiroAccountBalance {
  stx: {
    balance: string;
    total_sent: string;
    total_received: string;
    locked: string;
    lock_tx_id: string;
    lock_height: number;
    burnchain_lock_height: number;
    burnchain_unlock_height: number;
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
  sponsored: boolean;
  block_hash?: string;
  block_height?: number;
  block_time?: number;
  block_time_iso?: string;
  burn_block_time?: number;
  canonical: boolean;
  microblock_canonical: boolean;
  tx_index?: number;
  tx_result?: {
    hex: string;
    repr: string;
  };
  // Token transfer specific
  token_transfer?: {
    recipient_address: string;
    amount: string;
    memo: string;
  };
  // Contract call specific
  contract_call?: {
    contract_id: string;
    function_name: string;
    function_signature: string;
    function_args?: Array<{
      hex: string;
      repr: string;
      name: string;
      type: string;
    }>;
  };
  // Smart contract specific
  smart_contract?: {
    contract_id: string;
    source_code: string;
  };
  // Events
  events?: Array<{
    event_index: number;
    event_type: string;
    tx_id: string;
    contract_log?: {
      contract_id: string;
      topic: string;
      value: { hex: string; repr: string };
    };
    stx_transfer_event?: {
      amount: string;
      sender: string;
      recipient: string;
    };
    ft_transfer_event?: {
      asset_identifier: string;
      amount: string;
      sender: string;
      recipient: string;
    };
  }>;
}

interface HiroContractInfo {
  tx_id: string;
  contract_id: string;
  block_height: number;
  source_code: string;
  abi: string;
}

interface HiroFTMetadata {
  token_uri?: string;
  name?: string;
  description?: string;
  image_uri?: string;
  image_canonical_uri?: string;
  symbol?: string;
  decimals?: number;
  tx_id: string;
  sender_address: string;
  contract_principal: string;
}

interface HiroReadOnlyResponse {
  okay: boolean;
  result?: string;
  cause?: string;
}

// =============================================================================
// STACKS API SERVICE
// =============================================================================

export class StacksApiService {
  private network: Network;

  constructor(network: Network = 'mainnet') {
    this.network = network;
  }

  private get client() {
    return getApiClient(this.network);
  }

  private get config() {
    return getNetworkConfig(this.network);
  }

  // ===========================================================================
  // ACCOUNT METHODS
  // ===========================================================================

  /**
   * Get account balances (STX and all tokens)
   */
  async getAccountBalance(address: StacksAddress): Promise<Result<HiroAccountBalance, ApiError>> {
    return this.client.get<HiroAccountBalance>(`/extended/v1/address/${address}/balances`);
  }

  /**
   * Get STX balance only
   */
  async getStxBalance(address: StacksAddress): Promise<Result<{ balance: string; locked: string }, ApiError>> {
    const result = await this.getAccountBalance(address);
    if (!result.success) return result;
    
    return {
      success: true,
      data: {
        balance: result.data.stx.balance,
        locked: result.data.stx.locked,
      },
    };
  }

  /**
   * Get sBTC balance for an address
   */
  async getSbtcBalance(address: StacksAddress): Promise<Result<string, ApiError>> {
    const result = await this.getAccountBalance(address);
    if (!result.success) return result;

    const sbtcContract = getSbtcTokenContract(this.network);
    const sbtcKey = `${sbtcContract}::sbtc`;
    
    const sbtcBalance = result.data.fungible_tokens[sbtcKey];
    
    return {
      success: true,
      data: sbtcBalance?.balance || '0',
    };
  }

  /**
   * Get all fungible token balances
   */
  async getFungibleTokenBalances(
    address: StacksAddress
  ): Promise<Result<Array<{ contractId: string; balance: string }>, ApiError>> {
    const result = await this.getAccountBalance(address);
    if (!result.success) return result;

    const tokens = Object.entries(result.data.fungible_tokens).map(([key, value]) => {
      const contractId = key.split('::')[0] || key;
      return {
        contractId,
        balance: value.balance,
      };
    });

    return { success: true, data: tokens };
  }

  // ===========================================================================
  // TRANSACTION METHODS
  // ===========================================================================

  /**
   * Get transactions for an address
   */
  async getAddressTransactions(
    address: StacksAddress,
    options: { limit?: number; offset?: number } = {}
  ): Promise<Result<PaginatedResponse<HiroTransaction>, ApiError>> {
    const { limit = 50, offset = 0 } = options;
    return this.client.get<PaginatedResponse<HiroTransaction>>(
      `/extended/v1/address/${address}/transactions?limit=${limit}&offset=${offset}`
    );
  }

  /**
   * Get sBTC-specific transactions for an address
   */
  async getSbtcTransactions(
    address: StacksAddress,
    options: { limit?: number; offset?: number } = {}
  ): Promise<Result<PaginatedResponse<HiroTransaction>, ApiError>> {
    const sbtcContract = getSbtcTokenContract(this.network);
    const parsed = parseContractId(sbtcContract);
    if (!parsed) {
      return { 
        success: false, 
        error: { code: 'INVALID_CONTRACT', message: 'Invalid sBTC contract address' } 
      };
    }

    const { limit = 50, offset = 0 } = options;
    
    // Get transactions and filter for sBTC-related ones
    const result = await this.getAddressTransactions(address, { limit: limit * 2, offset });
    if (!result.success) return result;

    const sbtcTxs = result.data.results.filter((tx) => {
      // Check if it's a contract call to sBTC
      if (tx.contract_call?.contract_id === sbtcContract) {
        return true;
      }
      // Check for FT transfer events involving sBTC
      return tx.events?.some(
        (e) => e.ft_transfer_event?.asset_identifier?.startsWith(sbtcContract)
      );
    });

    return {
      success: true,
      data: {
        ...result.data,
        results: sbtcTxs.slice(0, limit),
        total: sbtcTxs.length,
      },
    };
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(txId: TxId): Promise<Result<HiroTransaction, ApiError>> {
    return this.client.get<HiroTransaction>(`/extended/v1/tx/${txId}`);
  }

  /**
   * Get mempool transactions for an address
   */
  async getMempoolTransactions(
    address: StacksAddress,
    options: { limit?: number; offset?: number } = {}
  ): Promise<Result<PaginatedResponse<HiroTransaction>, ApiError>> {
    const { limit = 20, offset = 0 } = options;
    return this.client.get<PaginatedResponse<HiroTransaction>>(
      `/extended/v1/tx/mempool?sender_address=${address}&limit=${limit}&offset=${offset}`
    );
  }

  // ===========================================================================
  // CONTRACT METHODS
  // ===========================================================================

  /**
   * Get contract information
   */
  async getContractInfo(contractId: ContractId): Promise<Result<HiroContractInfo, ApiError>> {
    return this.client.get<HiroContractInfo>(`/extended/v1/contract/${contractId}`);
  }

  /**
   * Call a read-only contract function
   */
  async callReadOnly(
    contractId: ContractId,
    functionName: string,
    args: string[] = [],
    senderAddress?: StacksAddress
  ): Promise<Result<HiroReadOnlyResponse, ApiError>> {
    const parsed = parseContractId(contractId);
    if (!parsed) {
      return { 
        success: false, 
        error: { code: 'INVALID_CONTRACT', message: 'Invalid contract identifier' } 
      };
    }

    const sender = senderAddress || parsed.deployer;
    
    return this.client.post<HiroReadOnlyResponse>(
      `/v2/contracts/call-read/${parsed.deployer}/${parsed.name}/${functionName}`,
      {
        sender: sender,
        arguments: args,
      }
    );
  }

  /**
   * Get token metadata
   */
  async getFungibleTokenMetadata(contractId: ContractId): Promise<Result<HiroFTMetadata, ApiError>> {
    return this.client.get<HiroFTMetadata>(`/metadata/v1/ft/${contractId}`);
  }

  // ===========================================================================
  // SBTC-SPECIFIC METHODS
  // ===========================================================================

  /**
   * Get total sBTC supply
   */
  async getSbtcTotalSupply(): Promise<Result<string, ApiError>> {
    const sbtcContract = getSbtcTokenContract(this.network);
    const result = await this.callReadOnly(
      sbtcContract as ContractId,
      'get-total-supply'
    );

    if (!result.success) return result;
    
    if (!result.data.okay || !result.data.result) {
      return { 
        success: false, 
        error: { code: 'CONTRACT_ERROR', message: result.data.cause || 'Failed to get total supply' } 
      };
    }

    // Parse the result (format: (ok u<amount>))
    const match = result.data.result.match(/u(\d+)/);
    const supply = match ? match[1] : '0';
    
    return { success: true, data: supply || '0' };
  }

  /**
   * Get sBTC balance using contract call (more accurate)
   */
  async getSbtcBalanceFromContract(address: StacksAddress): Promise<Result<string, ApiError>> {
    const sbtcContract = getSbtcTokenContract(this.network);
    
    // Encode address as Clarity principal
    const addressArg = `0x${Buffer.from(`'${address}`).toString('hex')}`;
    
    const result = await this.callReadOnly(
      sbtcContract as ContractId,
      'get-balance',
      [addressArg]
    );

    if (!result.success) return result;
    
    if (!result.data.okay || !result.data.result) {
      return { 
        success: false, 
        error: { code: 'CONTRACT_ERROR', message: result.data.cause || 'Failed to get balance' } 
      };
    }

    // Parse the result
    const match = result.data.result.match(/u(\d+)/);
    const balance = match ? match[1] : '0';
    
    return { success: true, data: balance || '0' };
  }

  // ===========================================================================
  // BLOCK & NETWORK METHODS
  // ===========================================================================

  /**
   * Get current block height
   */
  async getBlockHeight(): Promise<Result<number, ApiError>> {
    interface BlockHeightResponse {
      block_height: number;
    }
    
    const result = await this.client.get<BlockHeightResponse>('/extended/v1/block');
    if (!result.success) return result;
    
    return { success: true, data: result.data.block_height };
  }

  /**
   * Get network status
   */
  async getNetworkStatus(): Promise<Result<{ network_id: number; chain_tip: { block_height: number } }, ApiError>> {
    return this.client.get('/v2/info');
  }
}

// =============================================================================
// SINGLETON INSTANCES
// =============================================================================

let mainnetService: StacksApiService | null = null;
let testnetService: StacksApiService | null = null;

export function getStacksApiService(network: Network = 'mainnet'): StacksApiService {
  if (network === 'mainnet') {
    if (!mainnetService) {
      mainnetService = new StacksApiService('mainnet');
    }
    return mainnetService;
  }

  if (!testnetService) {
    testnetService = new StacksApiService('testnet');
  }
  return testnetService;
}

export default StacksApiService;
