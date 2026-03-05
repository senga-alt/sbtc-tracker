/**
 * Formatting Utilities
 * 
 * Functions for formatting numbers, currencies, addresses, and dates.
 */

import BigNumber from 'bignumber.js';
import { format, formatDistanceToNow, formatRelative } from 'date-fns';

// Configure BigNumber for precise decimal handling
BigNumber.config({
  DECIMAL_PLACES: 18,
  ROUNDING_MODE: BigNumber.ROUND_DOWN,
  EXPONENTIAL_AT: [-20, 20],
});

// =============================================================================
// NUMBER FORMATTING
// =============================================================================

/**
 * Format a token amount from raw value to human-readable
 */
export function formatTokenAmount(
  amount: string | number | BigNumber,
  decimals: number,
  displayDecimals?: number
): string {
  const bn = new BigNumber(amount);
  const divisor = new BigNumber(10).pow(decimals);
  const value = bn.dividedBy(divisor);

  // Determine display decimals based on value size
  const effectiveDecimals = displayDecimals ?? getAutoDecimals(value);

  return value.toFormat(effectiveDecimals, {
    groupSize: 3,
    groupSeparator: ',',
    decimalSeparator: '.',
  });
}

/**
 * Convert human-readable amount to raw token amount
 */
export function toRawAmount(amount: string | number, decimals: number): string {
  const bn = new BigNumber(amount);
  const multiplier = new BigNumber(10).pow(decimals);
  return bn.multipliedBy(multiplier).toFixed(0);
}

/**
 * Automatically determine decimal places based on value
 */
function getAutoDecimals(value: BigNumber): number {
  const abs = value.abs();
  if (abs.isZero()) return 2;
  if (abs.gte(1000000)) return 0;
  if (abs.gte(1000)) return 2;
  if (abs.gte(1)) return 4;
  if (abs.gte(0.0001)) return 6;
  return 8;
}

/**
 * Format a number with compact notation (K, M, B)
 */
export function formatCompactNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '0';
  if (Math.abs(num) < 1000) return num.toFixed(2);
  if (Math.abs(num) < 1000000) return (num / 1000).toFixed(2) + 'K';
  if (Math.abs(num) < 1000000000) return (num / 1000000).toFixed(2) + 'M';
  return (num / 1000000000).toFixed(2) + 'B';
}

/**
 * Format percentage with sign
 */
export function formatPercentage(
  value: number,
  decimals: number = 2,
  includeSign: boolean = true
): string {
  const formatted = value.toFixed(decimals);
  if (!includeSign) return `${formatted}%`;
  
  if (value > 0) return `+${formatted}%`;
  if (value < 0) return `${formatted}%`; // Already has minus
  return `${formatted}%`;
}

// =============================================================================
// CURRENCY FORMATTING
// =============================================================================

/**
 * Format USD value
 */
export function formatUsdValue(
  value: number | string,
  options: { compact?: boolean; decimals?: number } = {}
): string {
  const { compact = false, decimals = 2 } = options;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '$0.00';

  if (compact && Math.abs(num) >= 1000) {
    return '$' + formatCompactNumber(num);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

// Alias for convenience
export function formatUsd(value: number | string, decimals: number = 2): string {
  return formatUsdValue(value, { decimals });
}

/**
 * Format BTC value
 */
export function formatBtcValue(value: number | string, decimals: number = 8): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0 BTC';
  
  return `${num.toFixed(decimals)} BTC`;
}

// =============================================================================
// ADDRESS FORMATTING
// =============================================================================

/**
 * Truncate an address for display
 */
export function truncateAddress(
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format a Stacks address (SP.../ST...)
 */
export function formatStacksAddress(address: string): string {
  return truncateAddress(address, 6, 4);
}

/**
 * Format a transaction ID
 */
export function formatTxId(txId: string): string {
  if (!txId) return '';
  const cleanTxId = txId.startsWith('0x') ? txId.slice(2) : txId;
  return `0x${truncateAddress(cleanTxId, 8, 6)}`;
}

// =============================================================================
// DATE & TIME FORMATTING
// =============================================================================

/**
 * Format a timestamp to date string
 */
export function formatDate(
  timestamp: number,
  formatString: string = 'MMM d, yyyy'
): string {
  return format(new Date(timestamp), formatString);
}

/**
 * Format a timestamp to datetime string
 */
export function formatDateTime(
  timestamp: number,
  formatString: string = 'MMM d, yyyy h:mm a'
): string {
  return format(new Date(timestamp), formatString);
}

/**
 * Format timestamp as relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: number): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}

/**
 * Format timestamp as smart relative (today/yesterday/date)
 */
export function formatSmartDate(timestamp: number): string {
  return formatRelative(new Date(timestamp), new Date());
}

/**
 * Format block time
 */
export function formatBlockTime(blockTime?: number): string {
  if (!blockTime) return 'Pending';
  // Block time is in seconds, convert to milliseconds
  return formatRelativeTime(blockTime * 1000);
}

// =============================================================================
// CALCULATION UTILITIES
// =============================================================================

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(
  currentValue: number | string,
  previousValue: number | string
): number {
  const current = typeof currentValue === 'string' ? parseFloat(currentValue) : currentValue;
  const previous = typeof previousValue === 'string' ? parseFloat(previousValue) : previousValue;
  
  if (previous === 0) return current > 0 ? 100 : 0;
  
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Safe division (returns 0 if divisor is 0)
 */
export function safeDivide(
  numerator: number | string,
  denominator: number | string
): number {
  const num = typeof numerator === 'string' ? parseFloat(numerator) : numerator;
  const denom = typeof denominator === 'string' ? parseFloat(denominator) : denominator;
  
  if (denom === 0 || isNaN(denom)) return 0;
  return num / denom;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
