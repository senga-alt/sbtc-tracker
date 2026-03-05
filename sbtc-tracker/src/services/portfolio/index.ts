/**
 * Portfolio Service
 * 
 * High-level service for aggregating portfolio data including
 * wallet balances, sBTC holdings, DeFi positions, and analytics.
 */

import { getStacksApiService } from '../api/stacks';
import { getPriceService } from '../api/price';
import { getNetworkConfig, getSbtcTokenContract } from '@/config/network';
import { DECIMALS, SUPPORTED_TOKENS } from '@/config/constants';
import { formatTokenAmount, formatUsdValue, calculatePercentageChange } from '@/utils/formatters';
import type {
  Result,
  ApiError,
  StacksAddress,
  Network,
  Portfolio,
  TokenBalance,
  SbtcBalance,
  AddressBalance,
  PortfolioAnalytics,
  AllocationBreakdown,
  ValueChange,
  TokenInfo,
} from '@/types';

// =============================================================================
// PORTFOLIO SERVICE CLASS
// =============================================================================

export class PortfolioService {
  private network: Network;

  constructor(network: Network = 'mainnet') {
    this.network = network;
  }

  private get stacksApi() {
    return getStacksApiService(this.network);
  }

  private get priceService() {
    return getPriceService();
  }

  // ===========================================================================
  // CORE PORTFOLIO METHODS
  // ===========================================================================

  /**
   * Get complete portfolio for an address
   */
  async getPortfolio(address: StacksAddress): Promise<Result<Portfolio, ApiError>> {
    // Fetch all data in parallel
    const [balanceResult, pricesResult] = await Promise.all([
      this.getAddressBalance(address),
      this.priceService.getPrices(['BTC', 'STX']),
    ]);

    if (!balanceResult.success) return balanceResult;
    if (!pricesResult.success) {
      // Continue without prices, just won't have USD values
      console.warn('Failed to fetch prices:', pricesResult.error);
    }

    const balance = balanceResult.data;
    const prices = pricesResult.success ? pricesResult.data : new Map();

    // Get token prices
    const btcPrice = prices.get('BTC')?.priceUsd || 0;
    const stxPrice = prices.get('STX')?.priceUsd || 0;

    // Calculate STX value
    const stxBalanceNum = parseFloat(balance.stx.balanceFormatted);
    const stxValueUsd = stxBalanceNum * stxPrice;

    // Calculate sBTC value
    const sbtcBalanceNum = balance.sbtc ? parseFloat(balance.sbtc.balanceFormatted) : 0;
    const sbtcValueUsd = sbtcBalanceNum * btcPrice;

    // Total value
    const totalValueUsd = stxValueUsd + sbtcValueUsd;
    const totalValueBtc = btcPrice > 0 ? totalValueUsd / btcPrice : 0;

    // Build STX balance object
    const stxBalance: TokenBalance = {
      token: {
        symbol: 'STX',
        name: 'Stacks',
        decimals: DECIMALS.STX,
        contractId: '' as any, // Native token
      },
      balance: balance.stx.balance,
      balanceFormatted: balance.stx.balanceFormatted,
      balanceUsd: formatUsdValue(stxValueUsd),
    };

    // Build portfolio object
    const portfolio: Portfolio = {
      id: `${address}-${this.network}`,
      address,
      network: this.network,
      stxBalance,
      sbtcBalance: balance.sbtc,
      tokenBalances: balance.fungibleTokens,
      sbtc: balance.sbtc ? [{ address, balance: balance.sbtc }] : [],
      defiSummary: null, // Will be populated by DeFi service
      totalValueUsd: formatUsdValue(totalValueUsd),
      totalValueBtc: totalValueBtc.toFixed(8),
      totalValue: {
        usd: totalValueUsd,
        btc: totalValueBtc,
      },
      analytics: null, // Will be populated separately
      lastUpdated: Date.now(),
      isWatched: false,
    };

    return { success: true, data: portfolio };
  }

  /**
   * Get full address balance with formatted values
   */
  async getAddressBalance(address: StacksAddress): Promise<Result<AddressBalance, ApiError>> {
    const result = await this.stacksApi.getAccountBalance(address);
    if (!result.success) return result;

    const data = result.data;

    // Get prices for USD calculation
    const pricesResult = await this.priceService.getPrices(['BTC', 'STX']);
    const btcPrice = pricesResult.success ? pricesResult.data.get('BTC')?.priceUsd || 0 : 0;
    const stxPrice = pricesResult.success ? pricesResult.data.get('STX')?.priceUsd || 0 : 0;

    // Format STX balance
    const stxBalanceFormatted = formatTokenAmount(data.stx.balance, DECIMALS.STX);
    const stxLockedFormatted = formatTokenAmount(data.stx.locked, DECIMALS.STX);
    const stxValueUsd = parseFloat(stxBalanceFormatted) * stxPrice;

    // Get sBTC balance
    const sbtcContract = getSbtcTokenContract(this.network);
    const sbtcKey = Object.keys(data.fungible_tokens).find(
      (key) => key.startsWith(sbtcContract)
    );
    
    let sbtcBalance: SbtcBalance | null = null;
    
    if (sbtcKey) {
      const sbtcData = data.fungible_tokens[sbtcKey];
      const sbtcBalanceFormatted = formatTokenAmount(sbtcData?.balance || '0', DECIMALS.SBTC);
      const sbtcValueUsd = parseFloat(sbtcBalanceFormatted) * btcPrice;

      sbtcBalance = {
        token: {
          symbol: 'sBTC',
          name: 'sBTC',
          decimals: DECIMALS.SBTC,
          contractId: sbtcContract as any,
          icon: SUPPORTED_TOKENS.SBTC.icon,
        },
        balance: sbtcData?.balance || '0',
        balanceFormatted: sbtcBalanceFormatted,
        balanceUsd: formatUsdValue(sbtcValueUsd),
        btcValue: sbtcBalanceFormatted, // 1:1 peg
        btcValueUsd: formatUsdValue(sbtcValueUsd),
        availableBalance: sbtcData?.balance || '0',
        availableBalanceFormatted: sbtcBalanceFormatted,
      };
    }

    // Format other fungible tokens
    const fungibleTokens: TokenBalance[] = [];
    for (const [key, value] of Object.entries(data.fungible_tokens)) {
      // Skip sBTC as it's handled separately
      if (key.startsWith(sbtcContract)) continue;

      const contractId = key.split('::')[0] || key;
      // Try to get token info - for now use defaults
      const tokenInfo: TokenInfo = {
        symbol: key.split('::')[1] || 'UNKNOWN',
        name: key.split('::')[1] || 'Unknown Token',
        decimals: 6, // Default, should fetch from metadata
        contractId: contractId as any,
      };

      fungibleTokens.push({
        token: tokenInfo,
        balance: value.balance,
        balanceFormatted: formatTokenAmount(value.balance, tokenInfo.decimals),
      });
    }

    // Format NFT balances
    const nftBalances = Object.entries(data.non_fungible_tokens).map(([key, value]) => ({
      contractId: key as any,
      count: value.count,
    }));

    const addressBalance: AddressBalance = {
      address,
      network: this.network,
      stx: {
        balance: data.stx.balance,
        balanceFormatted: stxBalanceFormatted,
        balanceUsd: formatUsdValue(stxValueUsd),
        locked: data.stx.locked,
        lockedFormatted: stxLockedFormatted,
        totalSent: data.stx.total_sent,
        totalReceived: data.stx.total_received,
      },
      sbtc: sbtcBalance,
      fungibleTokens,
      nonFungibleTokens: nftBalances,
      lastUpdated: Date.now(),
    };

    return { success: true, data: addressBalance };
  }

  // ===========================================================================
  // SBTC-SPECIFIC METHODS
  // ===========================================================================

  /**
   * Get sBTC balance with USD value
   */
  async getSbtcBalanceWithValue(address: StacksAddress): Promise<Result<SbtcBalance | null, ApiError>> {
    const balanceResult = await this.getAddressBalance(address);
    if (!balanceResult.success) return balanceResult;

    return { success: true, data: balanceResult.data.sbtc };
  }

  /**
   * Get sBTC holdings as percentage of portfolio
   */
  async getSbtcAllocation(address: StacksAddress): Promise<Result<number, ApiError>> {
    const portfolioResult = await this.getPortfolio(address);
    if (!portfolioResult.success) return portfolioResult;

    const portfolio = portfolioResult.data;
    const totalValue = parseFloat(portfolio.totalValueUsd.replace(/[$,]/g, ''));
    
    if (!portfolio.sbtcBalance || totalValue === 0) {
      return { success: true, data: 0 };
    }

    const sbtcValue = parseFloat(portfolio.sbtcBalance.balanceUsd?.replace(/[$,]/g, '') || '0');
    const allocation = (sbtcValue / totalValue) * 100;

    return { success: true, data: allocation };
  }

  // ===========================================================================
  // ANALYTICS METHODS
  // ===========================================================================

  /**
   * Calculate portfolio allocation breakdown
   */
  calculateAllocation(portfolio: Portfolio): AllocationBreakdown {
    const totalUsd = parseFloat(portfolio.totalValueUsd.replace(/[$,]/g, '')) || 1;
    
    const byAsset: AllocationBreakdown['byAsset'] = [];

    // STX allocation
    const stxValue = parseFloat(portfolio.stxBalance.balanceUsd?.replace(/[$,]/g, '') || '0');
    if (stxValue > 0) {
      byAsset.push({
        name: 'STX',
        value: portfolio.stxBalance.balance,
        valueUsd: portfolio.stxBalance.balanceUsd || '$0',
        percentage: (stxValue / totalUsd) * 100,
        color: '#5546FF',
      });
    }

    // sBTC allocation
    if (portfolio.sbtcBalance) {
      const sbtcValue = parseFloat(portfolio.sbtcBalance.balanceUsd?.replace(/[$,]/g, '') || '0');
      if (sbtcValue > 0) {
        byAsset.push({
          name: 'sBTC',
          value: portfolio.sbtcBalance.balance,
          valueUsd: portfolio.sbtcBalance.balanceUsd || '$0',
          percentage: (sbtcValue / totalUsd) * 100,
          color: '#F7931A',
        });
      }
    }

    // Other tokens
    for (const token of portfolio.tokenBalances) {
      const tokenValue = parseFloat(token.balanceUsd?.replace(/[$,]/g, '') || '0');
      if (tokenValue > 0) {
        byAsset.push({
          name: token.token.symbol,
          value: token.balance,
          valueUsd: token.balanceUsd || '$0',
          percentage: (tokenValue / totalUsd) * 100,
          color: '#6B7280',
        });
      }
    }

    // Sort by value
    byAsset.sort((a, b) => b.percentage - a.percentage);

    // Category allocation (wallet vs DeFi)
    const byCategory = [
      {
        name: 'Wallet',
        value: portfolio.totalValueUsd,
        valueUsd: portfolio.totalValueUsd,
        percentage: 100, // For now, all in wallet
      },
    ];

    // Protocol allocation (none yet without DeFi)
    const byProtocol: AllocationBreakdown['byProtocol'] = [];

    return { byAsset, byCategory, byProtocol };
  }

  /**
   * Create value change object
   */
  createValueChange(currentValue: number, previousValue: number): ValueChange {
    const absoluteChange = currentValue - previousValue;
    const percentageChange = previousValue > 0 
      ? ((currentValue - previousValue) / previousValue) * 100 
      : 0;
    
    return {
      absoluteChange: formatUsdValue(absoluteChange),
      percentageChange,
      direction: absoluteChange > 0 ? 'up' : absoluteChange < 0 ? 'down' : 'neutral',
    };
  }
}

// =============================================================================
// SINGLETON INSTANCES
// =============================================================================

let mainnetService: PortfolioService | null = null;
let testnetService: PortfolioService | null = null;

export function getPortfolioService(network: Network = 'mainnet'): PortfolioService {
  if (network === 'mainnet') {
    if (!mainnetService) {
      mainnetService = new PortfolioService('mainnet');
    }
    return mainnetService;
  }

  if (!testnetService) {
    testnetService = new PortfolioService('testnet');
  }
  return testnetService;
}

// Default singleton instance
export const portfolioService = getPortfolioService();

export default PortfolioService;
