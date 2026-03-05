export interface WalletState {
  isConnected: boolean;
  address: string | null;
  network: 'mainnet' | 'testnet';
  stxBalance: number;
}

export interface PriceData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  sparkline: number[];
}

export interface SbtcBalance {
  balance: number;
  balanceUsd: number;
  change24h: number;
  changePercent24h: number;
}

export interface PortfolioData {
  totalValue: number;
  change24h: number;
  changePercent24h: number;
  lastUpdated: Date;
  holdings: Holding[];
}

export interface Holding {
  token: string;
  symbol: string;
  balance: number;
  value: number;
  change24h: number;
  changePercent24h: number;
  icon?: string;
}

export interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'swap';
  token: string;
  amount: number;
  value: number;
  from: string;
  to: string;
  timestamp: Date;
  status: 'pending' | 'confirmed';
  txHash: string;
}

export type TimeInterval = '1H' | '24H' | '7D' | '30D';

export type Theme = 'light' | 'dark' | 'system';

export interface PriceAlert {
  id: string;
  symbol: 'BTC' | 'sBTC' | 'STX';
  direction: 'above' | 'below';
  targetPrice: number;
  createdAt: string;
  repeat?: boolean;
  fireCount?: number;
}
