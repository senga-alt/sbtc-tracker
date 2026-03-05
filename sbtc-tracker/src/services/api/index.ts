/**
 * API Services Index
 * 
 * Centralized export for all API services.
 */

export { ApiClient, getApiClient } from './client';
export { StacksApiService, getStacksApiService } from './stacks';
export { PriceService, getPriceService } from './price';

// Singleton instances for convenience
import { getStacksApiService } from './stacks';
import { getPriceService } from './price';

export const stacksApiService = getStacksApiService();
export const priceService = getPriceService();
