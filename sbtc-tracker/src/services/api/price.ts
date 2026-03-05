/**
 * Price Service
 * 
 * Fetches price data for tokens from CoinGecko API.
 */

import { CACHE_TTL } from '@/config/constants';
import type { Result, ApiError, TokenPrice, PriceHistory, PricePoint } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

interface CoinGeckoPrice {
  [id: string]: {
    usd: number;
    usd_24h_change?: number;
    usd_24h_vol?: number;
    usd_market_cap?: number;
  };
}

interface CoinGeckoMarketChart {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

// =============================================================================
// CACHE
// =============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const priceCache = new Map<string, CacheEntry<TokenPrice>>();
const historyCache = new Map<string, CacheEntry<PriceHistory>>();

function isCacheValid<T>(entry: CacheEntry<T> | undefined, ttl: number): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < ttl;
}

// =============================================================================
// COINGECKO ID MAPPING
// =============================================================================

const TOKEN_TO_COINGECKO: Record<string, string> = {
  'BTC': 'bitcoin',
  'SBTC': 'bitcoin', // sBTC is 1:1 with BTC
  'STX': 'blockstack',
  'USDA': 'usd-coin', // Approximate with USDC
  'XUSD': 'usd-coin',
};

// =============================================================================
// PRICE SERVICE CLASS
// =============================================================================

export class PriceService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env['NEXT_PUBLIC_COINGECKO_API_URL'] || 'https://api.coingecko.com/api/v3';
  }

  /**
   * Get current price for a token
   */
  async getPrice(token: string): Promise<Result<TokenPrice, ApiError>> {
    const cacheKey = token.toUpperCase();
    const cached = priceCache.get(cacheKey);
    
    if (isCacheValid(cached, CACHE_TTL.PRICES)) {
      return { success: true, data: cached!.data };
    }

    const coingeckoId = TOKEN_TO_COINGECKO[cacheKey] || cacheKey.toLowerCase();

    try {
      const response = await fetch(
        `${this.baseUrl}/simple/price?ids=${coingeckoId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`
      );

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: 'FETCH_ERROR',
            message: `Failed to fetch price: ${response.status}`,
          },
        };
      }

      const data: CoinGeckoPrice = await response.json();
      const priceData = data[coingeckoId];

      if (!priceData) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `No price data for ${token}`,
          },
        };
      }

      const tokenPrice: TokenPrice = {
        token: cacheKey,
        priceUsd: priceData.usd,
        priceChange24h: priceData.usd_24h_change || 0,
        volume24h: priceData.usd_24h_vol,
        marketCap: priceData.usd_market_cap,
        lastUpdated: Date.now(),
      };

      // Cache the result
      priceCache.set(cacheKey, { data: tokenPrice, timestamp: Date.now() });

      return { success: true, data: tokenPrice };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch price',
        },
      };
    }
  }

  /**
   * Get prices for multiple tokens
   */
  async getPrices(tokens: string[]): Promise<Result<Map<string, TokenPrice>, ApiError>> {
    const prices = new Map<string, TokenPrice>();
    const tokensToFetch: string[] = [];

    // Check cache first
    for (const token of tokens) {
      const cacheKey = token.toUpperCase();
      const cached = priceCache.get(cacheKey);
      
      if (isCacheValid(cached, CACHE_TTL.PRICES)) {
        prices.set(cacheKey, cached!.data);
      } else {
        tokensToFetch.push(token);
      }
    }

    // If all cached, return early
    if (tokensToFetch.length === 0) {
      return { success: true, data: prices };
    }

    // Fetch remaining prices
    const coingeckoIds = tokensToFetch
      .map((t) => TOKEN_TO_COINGECKO[t.toUpperCase()] || t.toLowerCase())
      .filter((id, index, arr) => arr.indexOf(id) === index); // Dedupe

    try {
      const response = await fetch(
        `${this.baseUrl}/simple/price?ids=${coingeckoIds.join(',')}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`
      );

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: 'FETCH_ERROR',
            message: `Failed to fetch prices: ${response.status}`,
          },
        };
      }

      const data: CoinGeckoPrice = await response.json();

      // Map responses back to tokens
      for (const token of tokensToFetch) {
        const cacheKey = token.toUpperCase();
        const coingeckoId = TOKEN_TO_COINGECKO[cacheKey] || cacheKey.toLowerCase();
        const priceData = data[coingeckoId];

        if (priceData) {
          const tokenPrice: TokenPrice = {
            token: cacheKey,
            priceUsd: priceData.usd,
            priceChange24h: priceData.usd_24h_change || 0,
            volume24h: priceData.usd_24h_vol,
            marketCap: priceData.usd_market_cap,
            lastUpdated: Date.now(),
          };

          prices.set(cacheKey, tokenPrice);
          priceCache.set(cacheKey, { data: tokenPrice, timestamp: Date.now() });
        }
      }

      return { success: true, data: prices };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch prices',
        },
      };
    }
  }

  /**
   * Get BTC price (shorthand for sBTC value)
   */
  async getBtcPrice(): Promise<Result<number, ApiError>> {
    const result = await this.getPrice('BTC');
    if (!result.success) return result;
    return { success: true, data: result.data.priceUsd };
  }

  /**
   * Get STX price
   */
  async getStxPrice(): Promise<Result<number, ApiError>> {
    const result = await this.getPrice('STX');
    if (!result.success) return result;
    return { success: true, data: result.data.priceUsd };
  }

  /**
   * Get price history for a token
   */
  async getPriceHistory(
    token: string,
    days: number = 30
  ): Promise<Result<PriceHistory, ApiError>> {
    const cacheKey = `${token.toUpperCase()}-${days}d`;
    const cached = historyCache.get(cacheKey);
    
    // Use longer TTL for historical data
    const historyTtl = CACHE_TTL.PRICES * 2;
    if (isCacheValid(cached, historyTtl)) {
      return { success: true, data: cached!.data };
    }

    const coingeckoId = TOKEN_TO_COINGECKO[token.toUpperCase()] || token.toLowerCase();

    try {
      const response = await fetch(
        `${this.baseUrl}/coins/${coingeckoId}/market_chart?vs_currency=usd&days=${days}`
      );

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: 'FETCH_ERROR',
            message: `Failed to fetch price history: ${response.status}`,
          },
        };
      }

      const data: CoinGeckoMarketChart = await response.json();

      const pricePoints: PricePoint[] = data.prices.map(([timestamp, price]) => ({
        timestamp,
        price,
        volume: data.total_volumes.find(([t]) => t === timestamp)?.[1],
      }));

      const interval = days <= 1 ? '1h' : days <= 7 ? '24h' : days <= 30 ? '7d' : '30d';

      const history: PriceHistory = {
        token: token.toUpperCase(),
        interval: interval as PriceHistory['interval'],
        data: pricePoints,
        startTime: pricePoints[0]?.timestamp || Date.now(),
        endTime: pricePoints[pricePoints.length - 1]?.timestamp || Date.now(),
      };

      historyCache.set(cacheKey, { data: history, timestamp: Date.now() });

      return { success: true, data: history };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch price history',
        },
      };
    }
  }

  /**
   * Clear price cache
   */
  clearCache(): void {
    priceCache.clear();
    historyCache.clear();
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let priceService: PriceService | null = null;

export function getPriceService(): PriceService {
  if (!priceService) {
    priceService = new PriceService();
  }
  return priceService;
}

export default PriceService;
