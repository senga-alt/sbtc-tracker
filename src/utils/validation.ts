/**
 * Validation Utilities
 * 
 * Functions for validating addresses, transactions, and other data.
 */

import type { StacksAddress, TxId, ContractId, Network } from '@/types';

// =============================================================================
// ADDRESS VALIDATION
// =============================================================================

/**
 * Validate a Stacks address format
 */
export function isValidStacksAddress(address: string): address is StacksAddress {
  if (!address || typeof address !== 'string') return false;
  
  // Stacks addresses start with SP (mainnet) or ST (testnet)
  // and are c32check encoded, typically 34-42 characters
  const mainnetRegex = /^SP[0-9A-Z]{33,41}$/;
  const testnetRegex = /^ST[0-9A-Z]{33,41}$/;
  
  return mainnetRegex.test(address) || testnetRegex.test(address);
}

/**
 * Determine network from address prefix
 */
export function getNetworkFromAddress(address: string): Network | null {
  if (!address) return null;
  if (address.startsWith('SP')) return 'mainnet';
  if (address.startsWith('ST')) return 'testnet';
  return null;
}

/**
 * Validate address matches expected network
 */
export function validateAddressNetwork(address: string, network: Network): boolean {
  const addressNetwork = getNetworkFromAddress(address);
  return addressNetwork === network;
}

// =============================================================================
// TRANSACTION VALIDATION
// =============================================================================

/**
 * Validate a transaction ID format
 */
export function isValidTxId(txId: string): txId is TxId {
  if (!txId || typeof txId !== 'string') return false;
  
  // Transaction IDs are 64-character hex strings, optionally prefixed with 0x
  const cleanTxId = txId.startsWith('0x') ? txId.slice(2) : txId;
  const txIdRegex = /^[0-9a-fA-F]{64}$/;
  
  return txIdRegex.test(cleanTxId);
}

/**
 * Normalize a transaction ID (ensure 0x prefix)
 */
export function normalizeTxId(txId: string): TxId {
  if (!txId) return '0x' as TxId;
  return (txId.startsWith('0x') ? txId : `0x${txId}`) as TxId;
}

// =============================================================================
// CONTRACT VALIDATION
// =============================================================================

/**
 * Validate a contract identifier format
 */
export function isValidContractId(contractId: string): contractId is ContractId {
  if (!contractId || typeof contractId !== 'string') return false;
  
  // Contract IDs are in format: <address>.<contract-name>
  const parts = contractId.split('.');
  if (parts.length !== 2) return false;
  
  const [address, name] = parts;
  
  // Validate address part
  if (!address || !isValidStacksAddress(address)) return false;
  
  // Validate contract name (alphanumeric with hyphens, 1-40 chars)
  if (!name) return false;
  const nameRegex = /^[a-zA-Z][a-zA-Z0-9-]{0,39}$/;
  if (!nameRegex.test(name)) return false;
  
  return true;
}

/**
 * Parse a contract identifier into components
 */
export function parseContractId(contractId: string): { address: StacksAddress; name: string } | null {
  if (!isValidContractId(contractId)) return null;
  
  const [address, name] = contractId.split('.') as [StacksAddress, string];
  return { address, name };
}

// =============================================================================
// AMOUNT VALIDATION
// =============================================================================

/**
 * Validate a token amount string
 */
export function isValidAmount(amount: string): boolean {
  if (!amount || typeof amount !== 'string') return false;
  
  // Must be a non-negative integer (raw token amounts are always integers)
  const amountRegex = /^[0-9]+$/;
  return amountRegex.test(amount);
}

/**
 * Validate a decimal amount input (user-entered)
 */
export function isValidDecimalAmount(amount: string): boolean {
  if (!amount || typeof amount !== 'string') return false;
  
  // Allow decimal numbers with optional commas
  const cleanAmount = amount.replace(/,/g, '');
  const decimalRegex = /^[0-9]+\.?[0-9]*$/;
  
  if (!decimalRegex.test(cleanAmount)) return false;
  
  // Ensure it's a valid number
  const num = parseFloat(cleanAmount);
  return !isNaN(num) && num >= 0 && isFinite(num);
}

/**
 * Check if amount exceeds maximum safe integer
 */
export function isAmountSafe(amount: string): boolean {
  if (!isValidAmount(amount)) return false;
  
  try {
    const bigInt = BigInt(amount);
    // Max safe amount for Stacks is u128 max: 2^128 - 1
    const maxU128 = BigInt('340282366920938463463374607431768211455');
    return bigInt <= maxU128;
  } catch {
    return false;
  }
}

// =============================================================================
// INPUT SANITIZATION
// =============================================================================

/**
 * Sanitize an address input (trim whitespace)
 */
export function sanitizeAddress(input: string): string {
  return input?.trim() || '';
}

/**
 * Sanitize a numeric input (remove invalid characters)
 */
export function sanitizeNumericInput(input: string): string {
  // Remove everything except digits and decimal point
  return input?.replace(/[^0-9.]/g, '') || '';
}

/**
 * Sanitize a memo input (remove null bytes, limit length)
 */
export function sanitizeMemo(memo: string, maxLength: number = 34): string {
  if (!memo) return '';
  
  // Remove null bytes and other control characters
  const clean = memo.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Limit length
  return clean.slice(0, maxLength);
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Check if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Check if value is a positive number
 */
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && value > 0 && isFinite(value);
}

/**
 * Check if value is a valid timestamp (milliseconds)
 */
export function isValidTimestamp(value: unknown): value is number {
  if (typeof value !== 'number') return false;
  
  // Reasonable timestamp range: year 2000 to year 2100
  const min = 946684800000; // 2000-01-01
  const max = 4102444800000; // 2100-01-01
  
  return value >= min && value <= max;
}
