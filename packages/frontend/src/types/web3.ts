import { WalletType, WalletErrorType } from '../config/web3';

// 钱包状态接口
export interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  chainId: number | null;
  balance: string | null;
  provider: any | null;
  error: WalletError | null;
}

// 钱包错误接口
export interface WalletError {
  type: WalletErrorType;
  message: string;
  details?: any;
  retryable: boolean;
}

// 认证状态接口
export interface AuthState {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  token: string | null;
  user: User | null;
  expiresAt: Date | null;
  error: AuthError | null;
}

// 认证错误接口
export interface AuthError {
  type: 'WALLET_ERROR' | 'SIGNATURE_ERROR' | 'NETWORK_ERROR' | 'SERVER_ERROR';
  message: string;
  retryable: boolean;
  details?: any;
}

// 用户接口
export interface User {
  id: string;
  walletAddress: string;
  preferences: UserPreferences;
  profile: UserProfile;
  createdAt: Date;
  lastLoginAt?: Date;
}

// 用户偏好设置
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: NotificationSettings;
  dashboard: DashboardSettings;
  privacy: PrivacySettings;
}

// 通知设置
export interface NotificationSettings {
  email: boolean;
  browser: boolean;
  slack: boolean;
  agentAlerts: boolean;
  performanceReports: boolean;
  securityAlerts: boolean;
  systemUpdates: boolean;
}

// 仪表板设置
export interface DashboardSettings {
  layout: 'grid' | 'list';
  defaultView: 'agents' | 'workflows' | 'analytics';
  refreshInterval: number;
  showMetrics: boolean;
  compactMode: boolean;
}

// 隐私设置
export interface PrivacySettings {
  shareUsageData: boolean;
  allowAnalytics: boolean;
  publicProfile: boolean;
  shareAgents: boolean;
}

// 用户资料
export interface UserProfile {
  stats: UserStats;
  socialLinks: Record<string, string>;
}

// 用户统计
export interface UserStats {
  totalAgents: number;
  totalWorkflows: number;
  totalExecutions: number;
  successRate: number;
  joinedAt: Date;
  lastActive: Date;
  reputation: number;
  contributions: number;
}

// 钱包连接选项
export interface WalletConnectOptions {
  type: WalletType;
  autoConnect?: boolean;
  chainId?: number;
  timeout?: number;
}

// 签名请求接口
export interface SignatureRequest {
  message: string;
  address: string;
  chainId: number;
}

// 签名响应接口
export interface SignatureResponse {
  signature: string;
  message: string;
  address: string;
}

// 认证凭据接口
export interface AuthCredentials {
  walletAddress: string;
  signature: string;
  message: string;
  chainId: number;
}

// 认证结果接口
export interface AuthResult {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
  expiresAt?: Date;
}

// Nonce响应接口
export interface NonceResponse {
  nonce: string;
  message: string;
  expiresAt: Date;
}

// 网络信息接口
export interface NetworkInfo {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

// 钱包提供者接口
export interface WalletProvider {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isWalletConnect?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
  selectedAddress?: string;
  chainId?: string;
  networkVersion?: string;
}

// 钱包事件类型
export type WalletEventType = 
  | 'accountsChanged'
  | 'chainChanged'
  | 'connect'
  | 'disconnect'
  | 'message';

// 钱包事件处理器
export interface WalletEventHandlers {
  onAccountsChanged?: (accounts: string[]) => void;
  onChainChanged?: (chainId: string) => void;
  onConnect?: (connectInfo: { chainId: string }) => void;
  onDisconnect?: (error: { code: number; message: string }) => void;
  onMessage?: (message: { type: string; data: any }) => void;
}

// 钱包连接结果
export interface WalletConnectionResult {
  success: boolean;
  address?: string;
  chainId?: number;
  provider?: WalletProvider;
  error?: WalletError;
}

// 网络切换请求
export interface NetworkSwitchRequest {
  chainId: number;
  chainData?: {
    chainId: string;
    chainName: string;
    rpcUrls: string[];
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    };
    blockExplorerUrls: string[];
  };
}

// 余额信息
export interface BalanceInfo {
  formatted: string;
  value: bigint;
  decimals: number;
  symbol: string;
}

// 交易信息
export interface TransactionInfo {
  hash: string;
  from: string;
  to?: string;
  value: string;
  gasLimit: string;
  gasPrice: string;
  nonce: number;
  data?: string;
}

// 钱包状态变化事件
export interface WalletStateChangeEvent {
  type: 'WALLET_CONNECTED' | 'WALLET_DISCONNECTED' | 'ACCOUNT_CHANGED' | 'CHAIN_CHANGED';
  payload: {
    address?: string;
    chainId?: number;
    previousAddress?: string;
    previousChainId?: number;
  };
  timestamp: Date;
}

// 认证状态变化事件
export interface AuthStateChangeEvent {
  type: 'AUTH_SUCCESS' | 'AUTH_FAILED' | 'AUTH_LOGOUT' | 'TOKEN_REFRESHED';
  payload: {
    user?: User;
    token?: string;
    error?: AuthError;
  };
  timestamp: Date;
}

// Hook返回类型
export interface UseWalletReturn {
  // 状态
  wallet: WalletState;
  
  // 方法
  connect: (options?: WalletConnectOptions) => Promise<WalletConnectionResult>;
  disconnect: () => Promise<void>;
  switchNetwork: (chainId: number) => Promise<boolean>;
  signMessage: (message: string) => Promise<string>;
  
  // 工具方法
  isSupported: (walletType: WalletType) => boolean;
  getBalance: () => Promise<BalanceInfo | null>;
  
  // 事件处理
  addEventListener: (type: WalletEventType, handler: Function) => void;
  removeEventListener: (type: WalletEventType, handler: Function) => void;
}

export interface UseAuthReturn {
  // 状态
  auth: AuthState;
  
  // 方法
  login: (credentials?: Partial<AuthCredentials>) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  
  // 工具方法
  isTokenValid: () => boolean;
  getTokenExpirationTime: () => Date | null;
  
  // 事件处理
  onAuthStateChange: (callback: (event: AuthStateChangeEvent) => void) => () => void;
}