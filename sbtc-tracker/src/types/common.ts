/**
 * Core Type Definitions
 * 
 * Base types used throughout the application.
 */

// =============================================================================
// BASIC TYPES
// =============================================================================

/**
 * Stacks address (starts with SP for mainnet, ST for testnet)
 */
export type StacksAddress = `${'SP' | 'ST'}${string}`;

/**
 * Contract identifier (deployer.contract-name)
 */
export type ContractId = `${StacksAddress}.${string}`;

/**
 * Transaction ID (64 character hex string)
 */
export type TxId = `0x${string}`;

/**
 * Block hash
 */
export type BlockHash = `0x${string}`;

/**
 * Network type
 */
export type Network = 'mainnet' | 'testnet';

// =============================================================================
// RESULT TYPES
// =============================================================================

/**
 * Generic result type for operations that can fail
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  limit: number;
  offset: number;
  total: number;
  results: T[];
}

/**
 * API Error response
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// =============================================================================
// LOADING STATES
// =============================================================================

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  status: LoadingState;
  error: Error | null;
  lastUpdated: number | null;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Make certain properties required
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make all properties optional except specified ones
 */
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Extract the type of array elements
 */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/**
 * JSON-serializable value
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
