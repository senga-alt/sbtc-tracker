/**
 * Portfolio Types
 * 
 * Types for portfolio aggregation, analytics, and tracking.
 */

import type { StacksAddress, Network } from './common';
import type { SbtcBalance, TokenBalance, PortfolioActivity, TokenPrice } from './sbtc';
import type { DeFiPosition, DeFiSummary, TokenReward } from './defi';

// =============================================================================
// PORTFOLIO TYPES
// =============================================================================

/**
 * Complete portfolio for an address
 */
export interface Portfolio {
  id: string;
  address: StacksAddress;
  network: Network;
  
  // Token balances
  stxBalance: TokenBalance;
  sbtcBalance: SbtcBalance | null;
  tokenBalances: TokenBalance[];
  
  // sBTC data across addresses (for multi-address support)
  sbtc: Array<{
    address: StacksAddress;
    balance: SbtcBalance;
  }>;
  
  // DeFi positions
  defiSummary: DeFiSummary | null;
  
  // Aggregated values
  totalValueUsd: string;
  totalValueBtc: string;
  totalValue: {
    usd: number;
    btc: number;
  };
  
  // Analytics
  analytics: PortfolioAnalytics | null;
  
  // Metadata
  lastUpdated: number;
  isWatched: boolean;
  label?: string;
}

/**
 * Simple portfolio summary for quick display
 */
export interface PortfolioSummary {
  address: StacksAddress;
  totalSbtc: string;
  totalSbtcFormatted: string;
  totalValueUsd: number;
  totalValueBtc: number;
  stxBalance: string;
  stxValueUsd: number;
  lastUpdated: number;
}

/**
 * Portfolio history entry
 */
export interface PortfolioHistory {
  timestamp: number;
  totalValueUsd: number;
  totalValueBtc: number;
  sbtcBalance: string;
  stxBalance: string;
}

/**
 * Portfolio analytics
 */
export interface PortfolioAnalytics {
  // Value changes
  valueChange24h: ValueChange;
  valueChange7d: ValueChange;
  valueChange30d: ValueChange;
  
  // Allocation breakdown
  allocation: AllocationBreakdown;
  
  // Performance metrics
  performance: PerformanceMetrics;
  
  // Activity summary
  activitySummary: ActivitySummary;
}

/**
 * Value change data
 */
export interface ValueChange {
  absoluteChange: string;
  percentageChange: number;
  direction: 'up' | 'down' | 'neutral';
}

/**
 * Portfolio allocation breakdown
 */
export interface AllocationBreakdown {
  byAsset: AllocationItem[];
  byCategory: AllocationItem[];
  byProtocol: AllocationItem[];
}

/**
 * Single allocation item
 */
export interface AllocationItem {
  name: string;
  value: string;
  valueUsd: string;
  percentage: number;
  color?: string;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  // Total returns
  totalReturn: string;
  totalReturnUsd: string;
  totalReturnPercentage: number;
  
  // Income/rewards earned
  totalRewardsEarned: string;
  totalRewardsEarnedUsd: string;
  
  // Fees paid
  totalFeesPaid: string;
  totalFeesPaidUsd: string;
  
  // Net APY from all positions
  weightedApy: number;
  
  // Risk metrics
  riskScore?: number; // 1-100
  healthFactor?: number;
}

/**
 * Activity summary
 */
export interface ActivitySummary {
  totalTransactions: number;
  transactions24h: number;
  transactions7d: number;
  
  // By type
  deposits: number;
  withdrawals: number;
  swaps: number;
  transfers: number;
  
  // Volume
  volume24h: string;
  volume24hUsd: string;
  volume7d: string;
  volume7dUsd: string;
  
  // Last activity
  lastActivityTimestamp: number;
  lastActivityType: string;
}

// =============================================================================
// MULTI-ADDRESS TRACKING
// =============================================================================

/**
 * Watched address with metadata
 */
export interface WatchedAddress {
  address: StacksAddress;
  label: string;
  addedAt: number;
  lastChecked: number;
  notifications: boolean;
  tags?: string[];
}

/**
 * Multi-portfolio aggregation
 */
export interface PortfolioAggregate {
  addresses: StacksAddress[];
  portfolios: Map<StacksAddress, Portfolio>;
  
  // Combined totals
  totalValueUsd: string;
  totalValueBtc: string;
  
  // Combined balances
  totalStxBalance: string;
  totalSbtcBalance: string;
  
  // Combined DeFi
  totalDeFiValue: string;
  allPositions: DeFiPosition[];
  allPendingRewards: TokenReward[];
  
  // Combined analytics
  combinedAllocation: AllocationBreakdown;
  
  lastUpdated: number;
}

// =============================================================================
// HISTORICAL DATA
// =============================================================================

/**
 * Portfolio snapshot at a point in time
 */
export interface PortfolioSnapshot {
  timestamp: number;
  totalValueUsd: string;
  totalValueBtc: string;
  stxBalance: string;
  sbtcBalance: string;
  defiValue: string;
}

/**
 * Portfolio history
 */
export interface PortfolioHistory {
  address: StacksAddress;
  snapshots: PortfolioSnapshot[];
  interval: '1h' | '24h' | '7d' | '30d';
  startTime: number;
  endTime: number;
}

// =============================================================================
// DASHBOARD TYPES
// =============================================================================

/**
 * Dashboard card data
 */
export interface DashboardCard {
  id: string;
  title: string;
  value: string;
  subValue?: string;
  change?: ValueChange;
  icon?: string;
  tooltip?: string;
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  cards: DashboardCard[];
  refreshInterval: number;
  showDefiPositions: boolean;
  showTransactionHistory: boolean;
  showPriceCharts: boolean;
  defaultTimeRange: '24h' | '7d' | '30d' | '1y';
}

// =============================================================================
// EXPORT / REPORT TYPES
// =============================================================================

/**
 * Portfolio report format
 */
export type ReportFormat = 'json' | 'csv' | 'pdf';

/**
 * Portfolio export options
 */
export interface ExportOptions {
  format: ReportFormat;
  includeTransactions: boolean;
  includeDefi: boolean;
  includeAnalytics: boolean;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Generated report
 */
export interface PortfolioReport {
  generatedAt: number;
  format: ReportFormat;
  address: StacksAddress;
  portfolio: Portfolio;
  transactions?: PortfolioActivity[];
  data: string | Blob;
}
