/**
 * sBTC Type Definitions
 * 
 * Types specific to sBTC operations, balances, and transactions.
 */

import type { StacksAddress, TxId, ContractId, Network } from './common';

// =============================================================================
// TOKEN TYPES
// =============================================================================

/**
 * Token metadata
 */
export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  contractId: ContractId;
  icon?: string;
  totalSupply?: string;
}

/**
 * Token balance with raw and formatted values
 */
export interface TokenBalance {
  token: TokenInfo;
  balance: string; // Raw balance as string (BigInt-safe)
  balanceFormatted: string; // Human-readable formatted balance
  balanceUsd?: string; // USD value if price available
}

/**
 * sBTC specific balance information
 */
export interface SbtcBalance extends TokenBalance {
  // sBTC is 1:1 with BTC, include BTC value
  btcValue: string;
  btcValueUsd?: string;
  
  // Locked sBTC (in DeFi, etc.)
  lockedBalance?: string;
  lockedBalanceFormatted?: string;
  
  // Available balance (total - locked)
  availableBalance: string;
  availableBalanceFormatted: string;
}

// =============================================================================
// BALANCE RESPONSE
// =============================================================================

/**
 * Complete balance response for an address
 */
export interface AddressBalance {
  address: StacksAddress;
  network: Network;
  stx: {
    balance: string;
    balanceFormatted: string;
    balanceUsd?: string;
    locked: string;
    lockedFormatted: string;
    totalSent: string;
    totalReceived: string;
  };
  sbtc: SbtcBalance | null;
  fungibleTokens: TokenBalance[];
  nonFungibleTokens: NftBalance[];
  lastUpdated: number;
}

/**
 * NFT balance summary
 */
export interface NftBalance {
  contractId: ContractId;
  count: number;
  name?: string;
}

// =============================================================================
// TRANSACTION TYPES
// =============================================================================

/**
 * Transaction status
 */
export type TransactionStatus = 
  | 'pending'
  | 'success'
  | 'abort_by_response'
  | 'abort_by_post_condition';

/**
 * Transaction type
 */
export type TransactionType =
  | 'token_transfer'
  | 'contract_call'
  | 'smart_contract'
  | 'coinbase'
  | 'poison_microblock';

/**
 * Base transaction interface
 */
export interface BaseTransaction {
  txId: TxId;
  txType: TransactionType;
  txStatus: TransactionStatus;
  sender: StacksAddress;
  nonce: number;
  fee: string;
  feeFormatted: string;
  blockHeight?: number;
  blockHash?: string;
  blockTime?: number;
  blockTimeIso?: string;
  burnBlockTime?: number;
  canonical: boolean;
  microblockCanonical: boolean;
  txIndex?: number;
}

/**
 * sBTC transfer transaction
 */
export interface SbtcTransferTransaction extends BaseTransaction {
  txType: 'contract_call';
  action: 'transfer' | 'deposit' | 'withdrawal';
  amount: string;
  amountFormatted: string;
  amountUsd?: string;
  recipient?: StacksAddress;
  memo?: string;
  contractId: ContractId;
  functionName: string;
}

/**
 * Generic token transfer
 */
export interface TokenTransferTransaction extends BaseTransaction {
  txType: 'token_transfer';
  amount: string;
  amountFormatted: string;
  recipient: StacksAddress;
  memo?: string;
}

/**
 * Contract call transaction
 */
export interface ContractCallTransaction extends BaseTransaction {
  txType: 'contract_call';
  contractId: ContractId;
  functionName: string;
  functionArgs: unknown[];
}

/**
 * Union type for all transactions
 */
export type Transaction = 
  | SbtcTransferTransaction
  | TokenTransferTransaction
  | ContractCallTransaction
  | BaseTransaction;

/**
 * sBTC-specific transaction filter
 */
export interface SbtcTransactionFilter {
  address?: StacksAddress;
  type?: SbtcTransferTransaction['action'][];
  startDate?: Date;
  endDate?: Date;
  minAmount?: string;
  maxAmount?: string;
  status?: TransactionStatus[];
  limit?: number;
  offset?: number;
}

// =============================================================================
// ACTIVITY TYPES
// =============================================================================

/**
 * Activity categories for portfolio
 */
export type ActivityCategory = 
  | 'deposit'
  | 'withdrawal'
  | 'transfer_in'
  | 'transfer_out'
  | 'swap'
  | 'lending_supply'
  | 'lending_borrow'
  | 'lending_repay'
  | 'lending_withdraw'
  | 'stake'
  | 'unstake'
  | 'claim_rewards'
  | 'liquidity_add'
  | 'liquidity_remove';

/**
 * Portfolio activity item
 */
export interface PortfolioActivity {
  id: string;
  txId: TxId;
  category: ActivityCategory;
  timestamp: number;
  timestampIso: string;
  token: TokenInfo;
  amount: string;
  amountFormatted: string;
  amountUsd?: string;
  fee: string;
  feeUsd?: string;
  status: TransactionStatus;
  protocol?: string;
  counterparty?: StacksAddress;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// PRICE TYPES
// =============================================================================

/**
 * Token price data
 */
export interface TokenPrice {
  token: string;
  priceUsd: number;
  priceChange24h: number;
  volume24h?: number;
  marketCap?: number;
  lastUpdated: number;
}

/**
 * Historical price point
 */
export interface PricePoint {
  timestamp: number;
  price: number;
  volume?: number;
}

/**
 * Price history interval
 */
export type PriceInterval = '1h' | '24h' | '7d' | '30d';

/**
 * Price history data
 */
export interface PriceHistory {
  token: string;
  interval: PriceInterval;
  data: PricePoint[];
  startTime: number;
  endTime: number;
}
