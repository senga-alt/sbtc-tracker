/**
 * DeFi Types
 * 
 * Types for DeFi protocol integrations including lending, DEX, and staking.
 */

import type { StacksAddress, ContractId } from './common';
import type { TokenInfo } from './sbtc';

// =============================================================================
// PROTOCOL TYPES
// =============================================================================

/**
 * DeFi protocol category
 */
export type ProtocolCategory = 'dex' | 'lending' | 'staking' | 'yield' | 'bridge';

/**
 * Protocol information
 */
export interface Protocol {
  id: string;
  name: string;
  displayName: string;
  category: ProtocolCategory;
  icon?: string;
  website?: string;
  contractIds: ContractId[];
  tvl?: string;
  tvlUsd?: string;
}

// =============================================================================
// POSITION TYPES
// =============================================================================

/**
 * Base position interface
 */
export interface BasePosition {
  id: string;
  protocol: Protocol;
  type: PositionType;
  token: TokenInfo;
  balance: string;
  balanceFormatted: string;
  balanceUsd?: string;
  entryTimestamp?: number;
  lastUpdated: number;
}

/**
 * Position type
 */
export type PositionType = 
  | 'supply'
  | 'borrow'
  | 'stake'
  | 'liquidity'
  | 'farm'
  | 'collateral';

/**
 * Lending supply position
 */
export interface LendingSupplyPosition extends BasePosition {
  type: 'supply';
  apy: number;
  earnedInterest: string;
  earnedInterestFormatted: string;
  earnedInterestUsd?: string;
  collateralFactor?: number;
  canBeCollateral: boolean;
}

/**
 * Lending borrow position
 */
export interface LendingBorrowPosition extends BasePosition {
  type: 'borrow';
  apr: number;
  accruedInterest: string;
  accruedInterestFormatted: string;
  accruedInterestUsd?: string;
  healthFactor?: number;
  liquidationThreshold?: number;
}

/**
 * Staking position
 */
export interface StakingPosition extends BasePosition {
  type: 'stake';
  apy: number;
  rewards: TokenReward[];
  lockPeriod?: number; // In blocks or seconds
  unlockTime?: number;
  canUnstake: boolean;
}

/**
 * Liquidity pool position
 */
export interface LiquidityPosition extends BasePosition {
  type: 'liquidity';
  pool: LiquidityPool;
  lpTokenBalance: string;
  lpTokenBalanceFormatted: string;
  token0Amount: string;
  token0AmountFormatted: string;
  token1Amount: string;
  token1AmountFormatted: string;
  shareOfPool: number; // Percentage
  impermanentLoss?: number; // Percentage
  fees24h?: string;
  fees24hUsd?: string;
}

/**
 * Farming / yield position
 */
export interface FarmPosition extends BasePosition {
  type: 'farm';
  apy: number;
  apr: number;
  rewards: TokenReward[];
  lpToken: TokenInfo;
  lpTokenBalance: string;
  depositedAt?: number;
}

/**
 * Union type for all positions
 */
export type DeFiPosition = 
  | LendingSupplyPosition
  | LendingBorrowPosition
  | StakingPosition
  | LiquidityPosition
  | FarmPosition;

// =============================================================================
// LIQUIDITY POOL TYPES
// =============================================================================

/**
 * Liquidity pool information
 */
export interface LiquidityPool {
  id: string;
  contractId: ContractId;
  token0: TokenInfo;
  token1: TokenInfo;
  reserve0: string;
  reserve1: string;
  totalLiquidity: string;
  totalLiquidityUsd?: string;
  fee: number; // Percentage (e.g., 0.3)
  apy24h?: number;
  apy7d?: number;
  volume24h?: string;
  volume24hUsd?: string;
}

// =============================================================================
// REWARD TYPES
// =============================================================================

/**
 * Token reward from staking/farming
 */
export interface TokenReward {
  token: TokenInfo;
  amount: string;
  amountFormatted: string;
  amountUsd?: string;
  claimable: boolean;
  lastClaimed?: number;
}

// =============================================================================
// LENDING MARKET TYPES
// =============================================================================

/**
 * Lending market information
 */
export interface LendingMarket {
  id: string;
  protocol: Protocol;
  token: TokenInfo;
  totalSupply: string;
  totalSupplyUsd?: string;
  totalBorrow: string;
  totalBorrowUsd?: string;
  supplyApy: number;
  borrowApr: number;
  utilizationRate: number;
  collateralFactor: number;
  liquidationThreshold: number;
  reserveFactor: number;
}

// =============================================================================
// AGGREGATED TYPES
// =============================================================================

/**
 * Aggregated DeFi summary for an address
 */
export interface DeFiSummary {
  address: StacksAddress;
  totalValueUsd: string;
  positions: DeFiPosition[];
  byProtocol: Map<string, DeFiPosition[]>;
  byCategory: Map<PositionType, DeFiPosition[]>;
  
  // Aggregated metrics
  totalSupplied: string;
  totalSuppliedUsd?: string;
  totalBorrowed: string;
  totalBorrowedUsd?: string;
  totalStaked: string;
  totalStakedUsd?: string;
  totalLiquidity: string;
  totalLiquidityUsd?: string;
  
  // Pending rewards
  pendingRewards: TokenReward[];
  totalPendingRewardsUsd?: string;
  
  // Health metrics
  netApy: number;
  healthFactor?: number; // For lending positions
  
  lastUpdated: number;
}

// =============================================================================
// PROTOCOL-SPECIFIC TYPES
// =============================================================================

/**
 * ALEX specific types
 */
export namespace Alex {
  export interface PoolInfo {
    poolId: number;
    tokenX: ContractId;
    tokenY: ContractId;
    balanceX: string;
    balanceY: string;
    totalShares: string;
    fee: number;
  }
  
  export interface UserPosition {
    poolId: number;
    shares: string;
    tokenXAmount: string;
    tokenYAmount: string;
  }
}

/**
 * Zest Protocol specific types
 */
export namespace Zest {
  export interface Market {
    token: ContractId;
    totalDeposits: string;
    totalBorrows: string;
    depositApy: number;
    borrowApr: number;
    ltv: number;
  }
  
  export interface UserPosition {
    deposited: string;
    borrowed: string;
    collateral: string;
    healthFactor: number;
  }
}

/**
 * StackingDAO specific types
 */
export namespace StackingDAO {
  export interface StakeInfo {
    stStxBalance: string;
    exchangeRate: string;
    apy: number;
    nextCycleRewards: string;
  }
}
