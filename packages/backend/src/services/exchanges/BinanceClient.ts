import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import { Logger } from '../../utils/logger';

/**
 * Binance API endpoints
 */
const BINANCE_API_BASE = 'https://api.binance.com';
const BINANCE_TESTNET_BASE = 'https://testnet.binance.vision';

/**
 * Order side
 */
export type OrderSide = 'BUY' | 'SELL';

/**
 * Order type
 */
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT';

/**
 * Order status
 */
export type OrderStatus = 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'PENDING_CANCEL' | 'REJECTED' | 'EXPIRED';

/**
 * Time in force
 */
export type TimeInForce = 'GTC' | 'IOC' | 'FOK';

/**
 * Binance credentials
 */
export interface BinanceCredentials {
  apiKey: string;
  apiSecret: string;
  testnet?: boolean;
}

/**
 * Market order request
 */
export interface MarketOrderRequest {
  symbol: string;
  side: OrderSide;
  quantity?: number;
  quoteOrderQty?: number; // For market orders, can specify quote amount instead of quantity
}

/**
 * Limit order request
 */
export interface LimitOrderRequest {
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  timeInForce?: TimeInForce;
}

/**
 * Order response
 */
export interface OrderResponse {
  symbol: string;
  orderId: number;
  orderListId: number;
  clientOrderId: string;
  transactTime: number;
  price: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  status: OrderStatus;
  timeInForce: TimeInForce;
  type: OrderType;
  side: OrderSide;
  fills?: OrderFill[];
}

/**
 * Order fill
 */
export interface OrderFill {
  price: string;
  qty: string;
  commission: string;
  commissionAsset: string;
  tradeId: number;
}

/**
 * Ticker price
 */
export interface TickerPrice {
  symbol: string;
  price: string;
}

/**
 * Account balance
 */
export interface AccountBalance {
  asset: string;
  free: string;
  locked: string;
}

/**
 * Account information
 */
export interface AccountInfo {
  makerCommission: number;
  takerCommission: number;
  buyerCommission: number;
  sellerCommission: number;
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  updateTime: number;
  accountType: string;
  balances: AccountBalance[];
  permissions: string[];
}

/**
 * Kline/Candlestick data
 */
export interface Kline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
}

/**
 * Rate limiter
 */
class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 1200, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      // Calculate wait time
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest) + 100; // Add 100ms buffer
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.waitForSlot(); // Retry
    }

    this.requests.push(now);
  }

  getStats() {
    const now = Date.now();
    const recentRequests = this.requests.filter(time => now - time < this.windowMs);
    return {
      requestsInWindow: recentRequests.length,
      maxRequests: this.maxRequests,
      utilizationPercent: (recentRequests.length / this.maxRequests) * 100
    };
  }
}

/**
 * Binance API Client
 * Wrapper for Binance REST API with authentication and rate limiting
 */
export class BinanceClient {
  private logger: Logger;
  private credentials: BinanceCredentials;
  private client: AxiosInstance;
  private rateLimiter: RateLimiter;
  private baseUrl: string;

  constructor(credentials: BinanceCredentials) {
    this.logger = new Logger('BinanceClient');
    this.credentials = credentials;
    this.baseUrl = credentials.testnet ? BINANCE_TESTNET_BASE : BINANCE_API_BASE;
    this.rateLimiter = new RateLimiter();

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'X-MBX-APIKEY': credentials.apiKey
      }
    });

    this.logger.info(`Initialized Binance client (${credentials.testnet ? 'TESTNET' : 'PRODUCTION'})`);
  }

  /**
   * Generate signature for authenticated requests
   */
  private generateSignature(queryString: string): string {
    return crypto
      .createHmac('sha256', this.credentials.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  /**
   * Make authenticated request
   */
  private async authenticatedRequest<T>(
    method: 'GET' | 'POST' | 'DELETE',
    endpoint: string,
    params: Record<string, any> = {}
  ): Promise<T> {
    await this.rateLimiter.waitForSlot();

    // Add timestamp
    const timestamp = Date.now();
    const queryParams = { ...params, timestamp };

    // Generate query string
    const queryString = Object.entries(queryParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');

    // Generate signature
    const signature = this.generateSignature(queryString);
    const signedQueryString = `${queryString}&signature=${signature}`;

    try {
      const response = await this.client.request<T>({
        method,
        url: `${endpoint}?${signedQueryString}`
      });

      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.msg || error.message;
        const errorCode = error.response?.data?.code;
        this.logger.error(`Binance API error: ${errorCode} - ${errorMsg}`);
        throw new Error(`Binance API error: ${errorMsg}`);
      }
      throw error;
    }
  }

  /**
   * Make public request (no authentication)
   */
  private async publicRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    await this.rateLimiter.waitForSlot();

    try {
      const response = await this.client.get<T>(endpoint, { params });
      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.msg || error.message;
        this.logger.error(`Binance API error: ${errorMsg}`);
        throw new Error(`Binance API error: ${errorMsg}`);
      }
      throw error;
    }
  }

  /**
   * Test connectivity
   */
  async ping(): Promise<boolean> {
    try {
      await this.publicRequest('/api/v3/ping');
      this.logger.info('Binance API ping successful');
      return true;
    } catch (error) {
      this.logger.error('Binance API ping failed:', error);
      return false;
    }
  }

  /**
   * Get server time
   */
  async getServerTime(): Promise<number> {
    const response = await this.publicRequest<{ serverTime: number }>('/api/v3/time');
    return response.serverTime;
  }

  /**
   * Get ticker price for a symbol
   */
  async getPrice(symbol: string): Promise<number> {
    const response = await this.publicRequest<TickerPrice>('/api/v3/ticker/price', { symbol });
    return parseFloat(response.price);
  }

  /**
   * Get ticker prices for all symbols
   */
  async getAllPrices(): Promise<Map<string, number>> {
    const response = await this.publicRequest<TickerPrice[]>('/api/v3/ticker/price');
    const priceMap = new Map<string, number>();
    
    for (const ticker of response) {
      priceMap.set(ticker.symbol, parseFloat(ticker.price));
    }
    
    return priceMap;
  }

  /**
   * Get klines/candlestick data
   */
  async getKlines(
    symbol: string,
    interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d',
    limit: number = 500
  ): Promise<Kline[]> {
    const response = await this.publicRequest<any[]>('/api/v3/klines', {
      symbol,
      interval,
      limit
    });

    return response.map(k => ({
      openTime: k[0],
      open: k[1],
      high: k[2],
      low: k[3],
      close: k[4],
      volume: k[5],
      closeTime: k[6],
      quoteAssetVolume: k[7],
      numberOfTrades: k[8],
      takerBuyBaseAssetVolume: k[9],
      takerBuyQuoteAssetVolume: k[10]
    }));
  }

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<AccountInfo> {
    return await this.authenticatedRequest<AccountInfo>('GET', '/api/v3/account');
  }

  /**
   * Get account balance for specific asset
   */
  async getBalance(asset: string): Promise<{ free: number; locked: number }> {
    const accountInfo = await this.getAccountInfo();
    const balance = accountInfo.balances.find(b => b.asset === asset);
    
    if (!balance) {
      return { free: 0, locked: 0 };
    }

    return {
      free: parseFloat(balance.free),
      locked: parseFloat(balance.locked)
    };
  }

  /**
   * Place market order
   */
  async placeMarketOrder(request: MarketOrderRequest): Promise<OrderResponse> {
    this.logger.info(`Placing market order: ${request.side} ${request.quantity || request.quoteOrderQty} ${request.symbol}`);

    const params: any = {
      symbol: request.symbol,
      side: request.side,
      type: 'MARKET'
    };

    if (request.quantity) {
      params.quantity = request.quantity;
    } else if (request.quoteOrderQty) {
      params.quoteOrderQty = request.quoteOrderQty;
    } else {
      throw new Error('Either quantity or quoteOrderQty must be specified');
    }

    const response = await this.authenticatedRequest<OrderResponse>('POST', '/api/v3/order', params);
    
    this.logger.info(
      `Market order placed: ${response.orderId}, ` +
      `executed ${response.executedQty} @ avg ${response.cummulativeQuoteQty}`
    );

    return response;
  }

  /**
   * Place limit order
   */
  async placeLimitOrder(request: LimitOrderRequest): Promise<OrderResponse> {
    this.logger.info(
      `Placing limit order: ${request.side} ${request.quantity} ${request.symbol} @ ${request.price}`
    );

    const params = {
      symbol: request.symbol,
      side: request.side,
      type: 'LIMIT',
      timeInForce: request.timeInForce || 'GTC',
      quantity: request.quantity,
      price: request.price
    };

    const response = await this.authenticatedRequest<OrderResponse>('POST', '/api/v3/order', params);
    
    this.logger.info(`Limit order placed: ${response.orderId}, status: ${response.status}`);

    return response;
  }

  /**
   * Cancel order
   */
  async cancelOrder(symbol: string, orderId: number): Promise<OrderResponse> {
    this.logger.info(`Cancelling order: ${orderId} for ${symbol}`);

    const response = await this.authenticatedRequest<OrderResponse>('DELETE', '/api/v3/order', {
      symbol,
      orderId
    });

    this.logger.info(`Order cancelled: ${orderId}`);

    return response;
  }

  /**
   * Get order status
   */
  async getOrder(symbol: string, orderId: number): Promise<OrderResponse> {
    return await this.authenticatedRequest<OrderResponse>('GET', '/api/v3/order', {
      symbol,
      orderId
    });
  }

  /**
   * Get open orders
   */
  async getOpenOrders(symbol?: string): Promise<OrderResponse[]> {
    const params = symbol ? { symbol } : {};
    return await this.authenticatedRequest<OrderResponse[]>('GET', '/api/v3/openOrders', params);
  }

  /**
   * Validate credentials
   */
  async validateCredentials(): Promise<boolean> {
    try {
      await this.getAccountInfo();
      this.logger.info('Binance credentials validated successfully');
      return true;
    } catch (error) {
      this.logger.error('Binance credentials validation failed:', error);
      return false;
    }
  }

  /**
   * Get rate limiter statistics
   */
  getRateLimiterStats() {
    return this.rateLimiter.getStats();
  }

  /**
   * Check if using testnet
   */
  isTestnet(): boolean {
    return this.credentials.testnet || false;
  }
}
