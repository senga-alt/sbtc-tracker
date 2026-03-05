/**
 * Application Constants
 * 
 * Centralized constants for the sBTC Portfolio Tracker.
 */

// =============================================================================
// TOKEN DECIMALS
// =============================================================================
export const DECIMALS = {
  BTC: 8,
  SBTC: 8,
  STX: 6,
  USDA: 6,
  XUSD: 6,
} as const;

// Alias for convenience
export const TOKEN_DECIMALS = DECIMALS;

// =============================================================================
// CACHE TTL (Time To Live) in milliseconds
// =============================================================================
export const CACHE_TTL = {
  BALANCE: 30 * 1000, // 30 seconds
  TRANSACTIONS: 60 * 1000, // 1 minute
  PRICES: 5 * 60 * 1000, // 5 minutes
  DEFI_POSITIONS: 2 * 60 * 1000, // 2 minutes
  CONTRACT_DATA: 10 * 60 * 1000, // 10 minutes
} as const;

// =============================================================================
// API LIMITS
// =============================================================================
export const API_LIMITS = {
  MAX_TRANSACTIONS_PER_PAGE: 50,
  MAX_ADDRESSES_PER_BATCH: 20,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  RATE_LIMIT_PER_MINUTE: 60,
} as const;

// =============================================================================
// UI CONSTANTS
// =============================================================================
export const UI = {
  ANIMATION_DURATION: 200,
  TOAST_DURATION: 5000,
  DEBOUNCE_DELAY: 300,
  MAX_DISPLAYED_TRANSACTIONS: 100,
  CHART_DATA_POINTS: 30,
  REFRESH_INTERVAL: 30 * 1000, // 30 seconds
} as const;

// =============================================================================
// SUPPORTED TOKENS
// =============================================================================
export const SUPPORTED_TOKENS = {
  SBTC: {
    symbol: 'sBTC',
    name: 'sBTC',
    decimals: 8,
    icon: '/tokens/sbtc.svg',
    coingeckoId: 'bitcoin', // sBTC is pegged 1:1 to BTC
  },
  STX: {
    symbol: 'STX',
    name: 'Stacks',
    decimals: 6,
    icon: '/tokens/stx.svg',
    coingeckoId: 'blockstack',
  },
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    decimals: 8,
    icon: '/tokens/btc.svg',
    coingeckoId: 'bitcoin',
  },
} as const;

// =============================================================================
// DEFI PROTOCOLS
// =============================================================================
export const DEFI_PROTOCOLS = {
  ALEX: {
    name: 'ALEX',
    displayName: 'ALEX DEX',
    type: 'dex',
    icon: '/protocols/alex.svg',
    website: 'https://alexgo.io',
  },
  ZEST: {
    name: 'ZEST',
    displayName: 'Zest Protocol',
    type: 'lending',
    icon: '/protocols/zest.svg',
    website: 'https://app.zestprotocol.com',
  },
  BITFLOW: {
    name: 'BITFLOW',
    displayName: 'BitFlow',
    type: 'dex',
    icon: '/protocols/bitflow.svg',
    website: 'https://bitflow.finance',
  },
  STACKING_DAO: {
    name: 'STACKING_DAO',
    displayName: 'StackingDAO',
    type: 'staking',
    icon: '/protocols/stackingdao.svg',
    website: 'https://stackingdao.com',
  },
  VELAR: {
    name: 'VELAR',
    displayName: 'Velar',
    type: 'dex',
    icon: '/protocols/velar.svg',
    website: 'https://velar.co',
  },
} as const;

// =============================================================================
// TRANSACTION TYPES
// =============================================================================
export const TRANSACTION_TYPES = {
  TRANSFER: 'transfer',
  CONTRACT_CALL: 'contract_call',
  SMART_CONTRACT: 'smart_contract',
  COINBASE: 'coinbase',
  POISON_MICROBLOCK: 'poison_microblock',
  TOKEN_TRANSFER: 'token_transfer',
} as const;

// =============================================================================
// PORTFOLIO CATEGORIES
// =============================================================================
export const PORTFOLIO_CATEGORIES = {
  WALLET: 'wallet',
  LENDING: 'lending',
  LIQUIDITY: 'liquidity',
  STAKING: 'staking',
  FARMING: 'farming',
} as const;

// =============================================================================
// ERROR CODES
// =============================================================================
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  CONTRACT_ERROR: 'CONTRACT_ERROR',
  WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
  UNSUPPORTED_NETWORK: 'UNSUPPORTED_NETWORK',
  FETCH_ERROR: 'FETCH_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
} as const;

// =============================================================================
// LOCAL STORAGE KEYS
// =============================================================================
export const STORAGE_KEYS = {
  CONNECTED_WALLET: 'sbtc-tracker:connected-wallet',
  WATCHED_ADDRESSES: 'sbtc-tracker:watched-addresses',
  PREFERRED_NETWORK: 'sbtc-tracker:preferred-network',
  THEME: 'sbtc-tracker:theme',
  DISMISSED_BANNERS: 'sbtc-tracker:dismissed-banners',
} as const;

// =============================================================================
// FEATURE FLAGS
// =============================================================================
export const FEATURES = {
  DEFI_TRACKING: process.env['NEXT_PUBLIC_ENABLE_DEFI_TRACKING'] === 'true',
  PRICE_CHARTS: process.env['NEXT_PUBLIC_ENABLE_PRICE_CHARTS'] === 'true',
  TRANSACTION_HISTORY: process.env['NEXT_PUBLIC_ENABLE_TRANSACTION_HISTORY'] === 'true',
  PORTFOLIO_ANALYTICS: process.env['NEXT_PUBLIC_ENABLE_PORTFOLIO_ANALYTICS'] === 'true',
  NOTIFICATIONS: process.env['NEXT_PUBLIC_ENABLE_NOTIFICATIONS'] === 'true',
} as const;
