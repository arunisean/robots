import { AgentConfig, AgentInput, AgentOutput, AgentCategory } from './agent';

// Monitor Agent - Collects market data and on-chain information for trading

// Data source types for trading
export enum MonitorDataSourceType {
  CEX_PRICE = 'cex_price',           // Centralized exchange price feeds
  DEX_PRICE = 'dex_price',           // Decentralized exchange price feeds
  ON_CHAIN = 'on_chain',             // Blockchain data (transactions, balances)
  GAS_PRICE = 'gas_price',           // Network gas prices
  WALLET_TRACKER = 'wallet_tracker', // Track specific wallet addresses
  ORACLE = 'oracle',                 // Price oracles (Chainlink, etc.)
  SOCIAL_SENTIMENT = 'social_sentiment' // Social media sentiment analysis
}

// Monitor data source configuration
export interface MonitorDataSource {
  id: string;
  type: MonitorDataSourceType;
  name: string;
  config: MonitorDataSourceConfig;
  refreshInterval?: number; // milliseconds
  timeout?: number; // milliseconds
}

// Configuration for different monitor types
export interface MonitorDataSourceConfig {
  // CEX configuration
  exchange?: 'binance' | 'okx' | 'coinbase' | 'kraken';
  symbol?: string; // e.g., 'BTC/USDT'
  apiKey?: string;
  apiSecret?: string;
  
  // DEX configuration
  dex?: 'uniswap' | 'pancakeswap' | 'sushiswap';
  tokenAddress?: string;
  poolAddress?: string;
  chain?: 'ethereum' | 'bsc' | 'polygon';
  
  // On-chain configuration
  walletAddress?: string;
  contractAddress?: string;
  eventSignature?: string;
  blockRange?: number;
  
  // Oracle configuration
  oracleAddress?: string;
  priceFeedId?: string;
  
  // Social sentiment configuration
  keywords?: string[];
  platforms?: ('twitter' | 'reddit' | 'discord')[];
  
  // Common configuration
  [key: string]: any;
}

// Market data output
export interface MarketData {
  symbol: string;
  price: number;
  volume24h?: number;
  high24h?: number;
  low24h?: number;
  change24h?: number;
  timestamp: Date;
  source: string;
}

// On-chain data output
export interface OnChainData {
  address: string;
  balance?: string;
  transactions?: Transaction[];
  events?: BlockchainEvent[];
  timestamp: Date;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  token?: string;
  gasUsed?: string;
  timestamp: Date;
}

export interface BlockchainEvent {
  eventName: string;
  contractAddress: string;
  data: Record<string, any>;
  blockNumber: number;
  timestamp: Date;
}

// Gas price data
export interface GasPriceData {
  slow: number;
  standard: number;
  fast: number;
  instant: number;
  unit: 'gwei' | 'wei';
  timestamp: Date;
}

// Monitor Agent configuration
export interface MonitorAgentConfig extends AgentConfig {
  category: AgentCategory.MONITOR;
  dataSources: MonitorDataSource[];
  aggregationStrategy?: 'first' | 'last' | 'average' | 'median';
  cacheEnabled?: boolean;
  cacheTTL?: number; // seconds
}

// Monitor Agent input
export interface MonitorAgentInput extends AgentInput {
  // Monitor agents typically don't need input data
  // They collect data from external sources
  filters?: {
    minPrice?: number;
    maxPrice?: number;
    minVolume?: number;
    timeRange?: {
      start: Date;
      end: Date;
    };
  };
}

// Monitor Agent output
export interface MonitorAgentOutput extends AgentOutput {
  data: {
    marketData?: MarketData[];
    onChainData?: OnChainData[];
    gasPriceData?: GasPriceData;
    sentiment?: SentimentData;
    [key: string]: any;
  };
  metadata: {
    generatedAt: Date;
    processingTime: number;
    version: string;
    format: string;
    sourcesQueried: number;
    successfulSources: number;
    failedSources: number;
  };
}

// Sentiment data
export interface SentimentData {
  score: number; // -1 to 1
  volume: number; // number of mentions
  trending: boolean;
  keywords: string[];
  timestamp: Date;
}

// Monitor execution summary
export interface MonitorSummary {
  totalSources: number;
  successfulSources: number;
  failedSources: number;
  dataPointsCollected: number;
  executionTime: number; // milliseconds
  errors: MonitorError[];
}

export interface MonitorError {
  source: string;
  error: string;
  timestamp: Date;
}
