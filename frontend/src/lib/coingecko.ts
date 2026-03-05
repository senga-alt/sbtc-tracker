/**
 * CoinGecko Price Service
 * 
 * Handles price fetching with:
 * - Vite proxy in dev to bypass CORS
 * - In-memory + localStorage caching
 * - Exponential backoff retry logic
 * - Rate limit (429) handling
 */

// Use proxy in development, direct URL in production (via serverless function)
const BASE_URL = import.meta.env.DEV 
  ? '/api/coingecko' 
  : (import.meta.env.VITE_COINGECKO_PROXY_URL || 'https://api.coingecko.com/api/v3');

// Cache configuration
const CACHE_KEY_PRICES = 'sbtc-tracker:prices';
const CACHE_KEY_CHART = 'sbtc-tracker:chart';
const PRICE_CACHE_TTL = 30_000;   // 30 seconds for prices
const CHART_CACHE_TTL = 300_000; // 5 minutes for charts
const STALE_CACHE_TTL = 3600_000; // 1 hour - use stale data as fallback

export interface CoinGeckoPrices {
  bitcoin: { usd: number; usd_24h_change: number };
  blockstack: { usd: number; usd_24h_change: number };
}

export interface MarketChartPoint {
  timestamp: number;
  price: number;
}

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

// =============================================================================
// CACHE HELPERS
// =============================================================================

function getFromLocalStorage<T>(key: string): CacheEntry<T> | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored) as CacheEntry<T>;
  } catch {
    return null;
  }
}

function saveToLocalStorage<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, fetchedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage might be full or disabled
  }
}

// In-memory cache (faster than localStorage)
const memoryCache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string, ttl: number): { data: T; isStale: boolean } | null {
  const now = Date.now();
  
  // Check memory cache first
  const memEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (memEntry) {
    const age = now - memEntry.fetchedAt;
    if (age < ttl) {
      return { data: memEntry.data, isStale: false };
    }
    if (age < STALE_CACHE_TTL) {
      return { data: memEntry.data, isStale: true };
    }
  }
  
  // Fall back to localStorage
  const lsEntry = getFromLocalStorage<T>(key);
  if (lsEntry) {
    const age = now - lsEntry.fetchedAt;
    // Update memory cache from localStorage
    memoryCache.set(key, lsEntry);
    if (age < ttl) {
      return { data: lsEntry.data, isStale: false };
    }
    if (age < STALE_CACHE_TTL) {
      return { data: lsEntry.data, isStale: true };
    }
  }
  
  return null;
}

function setCache<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = { data, fetchedAt: Date.now() };
  memoryCache.set(key, entry);
  saveToLocalStorage(key, data);
}

// =============================================================================
// FETCH WITH RETRY
// =============================================================================

interface FetchOptions {
  maxRetries?: number;
  initialDelay?: number;
}

async function fetchWithRetry(
  url: string, 
  options: FetchOptions = {}
): Promise<Response> {
  const { maxRetries = 3, initialDelay = 1000 } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      
      // Success
      if (response.ok) {
        return response;
      }
      
      // Rate limited - retry with backoff
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter 
          ? parseInt(retryAfter, 10) * 1000 
          : initialDelay * Math.pow(2, attempt);
        
        console.warn(`[CoinGecko] Rate limited, retrying in ${delay}ms...`);
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // Other error - return response for caller to handle
      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Network error');
      
      // Network error - retry with backoff
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.warn(`[CoinGecko] Network error, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

export async function fetchPrices(): Promise<CoinGeckoPrices> {
  // Check cache first
  const cached = getCached<CoinGeckoPrices>(CACHE_KEY_PRICES, PRICE_CACHE_TTL);
  if (cached && !cached.isStale) {
    return cached.data;
  }
  
  try {
    const response = await fetchWithRetry(
      `${BASE_URL}/simple/price?ids=bitcoin,blockstack&vs_currencies=usd&include_24hr_change=true`
    );

    if (response.status === 429) {
      // Rate limited - return stale cache if available
      if (cached) {
        console.warn('[CoinGecko] Using stale price cache due to rate limit');
        return cached.data;
      }
      throw new Error('Rate limited by CoinGecko');
    }

    if (!response.ok) {
      if (cached) {
        console.warn('[CoinGecko] Using stale price cache due to API error');
        return cached.data;
      }
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json() as CoinGeckoPrices;
    setCache(CACHE_KEY_PRICES, data);
    return data;
  } catch (err) {
    // Network failure - return any cached data
    if (cached) {
      console.warn('[CoinGecko] Using stale price cache due to network error');
      return cached.data;
    }
    throw err;
  }
}

export async function fetchMarketChart(
  coinId: string,
  days: number | string
): Promise<MarketChartPoint[]> {
  const cacheKey = `${CACHE_KEY_CHART}:${coinId}:${days}`;
  
  // Check cache first
  const cached = getCached<MarketChartPoint[]>(cacheKey, CHART_CACHE_TTL);
  if (cached && !cached.isStale) {
    return cached.data;
  }

  try {
    const response = await fetchWithRetry(
      `${BASE_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
    );

    if (response.status === 429) {
      if (cached) {
        console.warn('[CoinGecko] Using stale chart cache due to rate limit');
        return cached.data;
      }
      throw new Error('Rate limited by CoinGecko');
    }

    if (!response.ok) {
      if (cached) {
        console.warn('[CoinGecko] Using stale chart cache due to API error');
        return cached.data;
      }
      throw new Error(`CoinGecko chart API error: ${response.status}`);
    }

    const json = await response.json();
    const points: MarketChartPoint[] = (json.prices as [number, number][]).map(
      ([timestamp, price]) => ({ timestamp, price })
    );

    setCache(cacheKey, points);
    return points;
  } catch (err) {
    // On network failure, fall back to any cached data
    if (cached) {
      console.warn('[CoinGecko] Using stale chart cache due to network error');
      return cached.data;
    }
    throw err;
  }
}

/**
 * Clear all CoinGecko caches
 */
export function clearPriceCache(): void {
  memoryCache.clear();
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('sbtc-tracker:')) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore localStorage errors
  }
}
