import { AgentConfig, AgentInput, AgentOutput, AgentCategory } from './agent';
import { TradingSignal } from './analyze-agent';

// Execute Agent - Executes trades and manages positions

// Execution platform types
export enum ExecutionPlatform {
  BINANCE = 'binance',
  OKX = 'okx',
  COINBASE = 'coinbase',
  UNISWAP = 'uniswap',
  PANCAKESWAP = 'pancakeswap',
  SUSHISWAP = 'sushiswap',
  AAVE = 'aave',
  COMPOUND = 'compound'
}

// Order types
export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  STOP_LOSS = 'stop_loss',
  TAKE_PROFIT = 'take_profit',
  STOP_LIMIT = 'stop_limit'
}

// Order side
export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell'
}

// Order status
export enum OrderStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  PARTIALLY_FILLED = 'partially_filled',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

// Execution action configuration
export interface ExecutionAction {
  id: string;
  platform: ExecutionPlatform;
  action: 'trade' | 'stake' | 'lend' | 'bridge' | 'swap';
  config: ExecutionActionConfig;
}

// Configuration for different execution types
export interface ExecutionActionConfig {
  // Trading configuration
  symbol?: string;
  orderType?: OrderType;
  side?: OrderSide;
  quantity?: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK'; // Good Till Cancel, Immediate or Cancel, Fill or Kill
  
  // DEX configuration
  tokenIn?: string;
  tokenOut?: string;
  amountIn?: number;
  minAmountOut?: number;
  slippageTolerance?: number; // percentage
  deadline?: number; // seconds
  
  // DeFi configuration
  protocol?: string;
  asset?: string;
  amount?: number;
  duration?: number;
  
  // Bridge configuration
  fromChain?: string;
  toChain?: string;
  
  // Common configuration
  maxGasPrice?: number;
  gasLimit?: number;
  [key: string]: any;
}

// Order request
export interface OrderRequest {
  platform: ExecutionPlatform;
  symbol: string;
  orderType: OrderType;
  side: OrderSide;
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: string;
  clientOrderId?: string;
}

// Order result
export interface OrderResult {
  orderId: string;
  clientOrderId?: string;
  status: OrderStatus;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  executedQuantity: number;
  price?: number;
  averagePrice?: number;
  commission?: number;
  commissionAsset?: string;
  timestamp: Date;
  transactionHash?: string; // For DEX trades
}

// DEX swap request
export interface SwapRequest {
  dex: ExecutionPlatform;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  minAmountOut: number;
  slippageTolerance: number;
  deadline: number;
  recipient: string;
}

// DEX swap result
export interface SwapResult {
  transactionHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  gasUsed: number;
  gasPrice: number;
  effectivePrice: number;
  slippage: number;
  timestamp: Date;
}

// Position management
export interface PositionUpdate {
  symbol: string;
  action: 'open' | 'close' | 'increase' | 'decrease';
  quantity: number;
  price: number;
  timestamp: Date;
}

// Execute Agent configuration
export interface ExecuteAgentConfig extends AgentConfig {
  category: AgentCategory.EXECUTE;
  executionActions: ExecutionAction[];
  paperTrading?: boolean;
  requireConfirmation?: boolean;
  maxRetries?: number;
  retryDelay?: number; // milliseconds
}

// Execute Agent input
export interface ExecuteAgentInput extends AgentInput {
  data: {
    signal?: TradingSignal;
    orders?: OrderRequest[];
    swaps?: SwapRequest[];
    positionUpdates?: PositionUpdate[];
    [key: string]: any;
  };
}

// Execute Agent output
export interface ExecuteAgentOutput extends AgentOutput {
  data: {
    orders?: OrderResult[];
    swaps?: SwapResult[];
    positions?: PositionUpdate[];
    errors?: ExecutionError[];
    [key: string]: any;
  };
  metadata: {
    generatedAt: Date;
    processingTime: number;
    version: string;
    format: string;
    totalOrders: number;
    successfulOrders: number;
    failedOrders: number;
    totalValue: number; // in USDT
  };
}

// Execution error
export interface ExecutionError {
  action: string;
  platform: ExecutionPlatform;
  error: string;
  code?: string;
  retryable: boolean;
  timestamp: Date;
}

// Paper trading simulation
export interface PaperTradingState {
  virtualBalance: Record<string, number>; // asset -> balance
  virtualPositions: Position[];
  totalValue: number;
  realizedPnL: number;
  unrealizedPnL: number;
  tradeHistory: PaperTrade[];
}

export interface PaperTrade {
  id: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  commission: number;
  pnl?: number;
  timestamp: Date;
}

export interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  unrealizedPnL: number;
}

// Execution summary
export interface ExecutionSummary {
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  totalVolume: number; // in USDT
  totalFees: number; // in USDT
  executionTime: number; // milliseconds
  errors: ExecutionError[];
}

// Credential management
export interface ExchangeCredentials {
  exchange: ExecutionPlatform;
  apiKey: string;
  apiSecret: string;
  passphrase?: string; // For some exchanges
  testnet?: boolean;
}

// Gas estimation
export interface GasEstimation {
  gasLimit: number;
  gasPrice: number;
  maxFeePerGas?: number;
  maxPriorityFeePerGas?: number;
  estimatedCost: number; // in native token
  estimatedCostUSD: number;
}
