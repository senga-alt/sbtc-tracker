/**
 * API Client
 * 
 * Base HTTP client with retry logic, rate limiting, and error handling.
 */

import { API_LIMITS, ERROR_CODES } from '@/config/constants';
import type { Result, ApiError } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

interface RateLimitState {
  remaining: number;
  resetTime: number;
  lastRequest: number;
}

// =============================================================================
// RATE LIMITER
// =============================================================================

class RateLimiter {
  private state: RateLimitState = {
    remaining: API_LIMITS.RATE_LIMIT_PER_MINUTE,
    resetTime: Date.now() + 60000,
    lastRequest: 0,
  };

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();

    // Reset counter if window expired
    if (now >= this.state.resetTime) {
      this.state.remaining = API_LIMITS.RATE_LIMIT_PER_MINUTE;
      this.state.resetTime = now + 60000;
    }

    // If no remaining requests, wait until reset
    if (this.state.remaining <= 0) {
      const waitTime = this.state.resetTime - now;
      if (waitTime > 0) {
        await sleep(waitTime);
        this.state.remaining = API_LIMITS.RATE_LIMIT_PER_MINUTE;
        this.state.resetTime = Date.now() + 60000;
      }
    }

    this.state.remaining--;
    this.state.lastRequest = Date.now();
  }

  updateFromHeaders(headers: Headers): void {
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');

    if (remaining) {
      this.state.remaining = parseInt(remaining, 10);
    }
    if (reset) {
      this.state.resetTime = parseInt(reset, 10) * 1000;
    }
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(status: number): boolean {
  return status === 429 || status >= 500;
}

// =============================================================================
// API CLIENT CLASS
// =============================================================================

export class ApiClient {
  private baseUrl: string;
  private apiKey?: string;
  private rateLimiter: RateLimiter;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
    this.rateLimiter = new RateLimiter();
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (apiKey) {
      this.defaultHeaders['x-api-key'] = apiKey;
    }
  }

  /**
   * Make an HTTP request with retry logic
   */
  async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<Result<T, ApiError>> {
    const {
      timeout = 30000,
      retries = API_LIMITS.MAX_RETRIES,
      retryDelay = API_LIMITS.RETRY_DELAY_MS,
      ...fetchConfig
    } = config;

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    let lastError: ApiError | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Wait for rate limit
        await this.rateLimiter.waitIfNeeded();

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...fetchConfig,
          headers: {
            ...this.defaultHeaders,
            ...fetchConfig.headers,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Update rate limit state from response headers
        this.rateLimiter.updateFromHeaders(response.headers);

        // Handle non-OK responses
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          
          lastError = {
            code: getErrorCode(response.status),
            message: errorBody.message || errorBody.error || `HTTP ${response.status}`,
            details: errorBody,
          };

          // Retry on retryable errors
          if (isRetryableError(response.status) && attempt < retries) {
            const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
            await sleep(delay);
            continue;
          }

          return { success: false, error: lastError };
        }

        // Parse successful response
        const data = await response.json();
        return { success: true, data: data as T };

      } catch (error) {
        lastError = {
          code: ERROR_CODES.NETWORK_ERROR,
          message: error instanceof Error ? error.message : 'Network error',
          details: { attempt, url },
        };

        // Retry on network errors
        if (attempt < retries) {
          const delay = retryDelay * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }
      }
    }

    return {
      success: false,
      error: lastError || {
        code: ERROR_CODES.FETCH_ERROR,
        message: 'Request failed after retries',
      },
    };
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, config?: RequestConfig): Promise<Result<T, ApiError>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<Result<T, ApiError>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

// =============================================================================
// ERROR CODE MAPPING
// =============================================================================

function getErrorCode(status: number): string {
  switch (status) {
    case 400:
      return ERROR_CODES.INVALID_ADDRESS;
    case 429:
      return ERROR_CODES.RATE_LIMITED;
    case 500:
    case 502:
    case 503:
    case 504:
      return ERROR_CODES.NETWORK_ERROR;
    default:
      return ERROR_CODES.FETCH_ERROR;
  }
}

// =============================================================================
// SINGLETON INSTANCES
// =============================================================================

let mainnetClient: ApiClient | null = null;
let testnetClient: ApiClient | null = null;

export function getApiClient(network: 'mainnet' | 'testnet'): ApiClient {
  const apiKey = process.env['NEXT_PUBLIC_HIRO_API_KEY'];

  if (network === 'mainnet') {
    if (!mainnetClient) {
      const baseUrl = process.env['NEXT_PUBLIC_MAINNET_API_URL'] || 'https://api.hiro.so';
      mainnetClient = new ApiClient(baseUrl, apiKey);
    }
    return mainnetClient;
  }

  if (!testnetClient) {
    const baseUrl = process.env['NEXT_PUBLIC_TESTNET_API_URL'] || 'https://api.testnet.hiro.so';
    testnetClient = new ApiClient(baseUrl, apiKey);
  }
  return testnetClient;
}

export default ApiClient;
