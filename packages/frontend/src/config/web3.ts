// Web3配置常量
export const WEB3_CONFIG = {
  // 支持的网络
  SUPPORTED_CHAINS: {
    ETHEREUM_MAINNET: 1,
    ETHEREUM_SEPOLIA: 11155111,
    POLYGON: 137,
    POLYGON_MUMBAI: 80001,
  },

  // 默认网络
  DEFAULT_CHAIN_ID: 1, // 以太坊主网

  // RPC端点
  RPC_URLS: {
    1: 'https://eth-mainnet.g.alchemy.com/v2/demo',
    11155111: 'https://eth-sepolia.g.alchemy.com/v2/demo',
    137: 'https://polygon-mainnet.g.alchemy.com/v2/demo',
    80001: 'https://polygon-mumbai.g.alchemy.com/v2/demo',
  },

  // 网络名称
  CHAIN_NAMES: {
    1: 'Ethereum Mainnet',
    11155111: 'Ethereum Sepolia',
    137: 'Polygon',
    80001: 'Polygon Mumbai',
  },

  // 区块浏览器
  BLOCK_EXPLORERS: {
    1: 'https://etherscan.io',
    11155111: 'https://sepolia.etherscan.io',
    137: 'https://polygonscan.com',
    80001: 'https://mumbai.polygonscan.com',
  },

  // 钱包连接配置
  WALLET_CONFIG: {
    // 连接超时时间（毫秒）
    CONNECTION_TIMEOUT: 10000,
    
    // 签名超时时间（毫秒）
    SIGNATURE_TIMEOUT: 30000,
    
    // 自动重连尝试次数
    MAX_RECONNECT_ATTEMPTS: 3,
    
    // 重连间隔（毫秒）
    RECONNECT_INTERVAL: 2000,
  },

  // 认证配置
  AUTH_CONFIG: {
    // JWT token存储key
    TOKEN_STORAGE_KEY: 'multi_agent_auth_token',
    
    // 用户信息存储key
    USER_STORAGE_KEY: 'multi_agent_user_info',
    
    // 钱包地址存储key
    WALLET_STORAGE_KEY: 'multi_agent_wallet_address',
    
    // token刷新提前时间（毫秒）
    TOKEN_REFRESH_BUFFER: 5 * 60 * 1000, // 5分钟
    
    // 签名消息前缀
    SIGN_MESSAGE_PREFIX: 'Multi-Agent Platform Login',
  },

  // API端点
  API_ENDPOINTS: {
    BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    AUTH: {
      NONCE: '/auth/nonce',
      LOGIN: '/auth/login',
      VERIFY: '/auth/verify',
      REFRESH: '/auth/refresh',
      LOGOUT: '/auth/logout',
    },
  },
} as const;

// 钱包类型枚举
export enum WalletType {
  METAMASK = 'metamask',
  WALLET_CONNECT = 'walletconnect',
  COINBASE = 'coinbase',
  INJECTED = 'injected',
}

// 钱包信息接口
export interface WalletInfo {
  type: WalletType;
  name: string;
  icon: string;
  installed: boolean;
  downloadUrl?: string;
}

// 支持的钱包列表
export const SUPPORTED_WALLETS: WalletInfo[] = [
  {
    type: WalletType.METAMASK,
    name: 'MetaMask',
    icon: '/icons/metamask.svg',
    installed: false, // 运行时检测
    downloadUrl: 'https://metamask.io/download/',
  },
  {
    type: WalletType.WALLET_CONNECT,
    name: 'WalletConnect',
    icon: '/icons/walletconnect.svg',
    installed: true, // 总是可用
  },
  {
    type: WalletType.COINBASE,
    name: 'Coinbase Wallet',
    icon: '/icons/coinbase.svg',
    installed: false, // 运行时检测
    downloadUrl: 'https://www.coinbase.com/wallet',
  },
];

// 错误类型
export enum WalletErrorType {
  NOT_INSTALLED = 'WALLET_NOT_INSTALLED',
  USER_REJECTED = 'USER_REJECTED_CONNECTION',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNSUPPORTED_CHAIN = 'UNSUPPORTED_CHAIN',
  WALLET_LOCKED = 'WALLET_LOCKED',
  SIGNATURE_REJECTED = 'SIGNATURE_REJECTED',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// 错误消息映射
export const ERROR_MESSAGES = {
  [WalletErrorType.NOT_INSTALLED]: {
    title: '未检测到钱包',
    message: '请安装MetaMask或其他Web3钱包',
    action: '安装MetaMask',
    actionUrl: 'https://metamask.io/download/',
  },
  [WalletErrorType.USER_REJECTED]: {
    title: '连接被拒绝',
    message: '您拒绝了钱包连接请求',
    action: '重试连接',
    actionUrl: null,
  },
  [WalletErrorType.UNSUPPORTED_CHAIN]: {
    title: '网络不支持',
    message: '请切换到支持的网络',
    action: '切换网络',
    actionUrl: null,
  },
  [WalletErrorType.WALLET_LOCKED]: {
    title: '钱包已锁定',
    message: '请解锁您的钱包后重试',
    action: '解锁钱包',
    actionUrl: null,
  },
  [WalletErrorType.SIGNATURE_REJECTED]: {
    title: '签名被拒绝',
    message: '您拒绝了签名请求，无法完成登录',
    action: '重新签名',
    actionUrl: null,
  },
  [WalletErrorType.NETWORK_ERROR]: {
    title: '网络错误',
    message: '网络连接失败，请检查网络后重试',
    action: '重试',
    actionUrl: null,
  },
  [WalletErrorType.CONNECTION_TIMEOUT]: {
    title: '连接超时',
    message: '钱包连接超时，请重试',
    action: '重试连接',
    actionUrl: null,
  },
} as const;

// 工具函数：检查是否为支持的网络
export function isSupportedChain(chainId: number): boolean {
  return Object.values(WEB3_CONFIG.SUPPORTED_CHAINS).includes(chainId as any);
}

// 工具函数：获取网络名称
export function getChainName(chainId: number): string {
  return WEB3_CONFIG.CHAIN_NAMES[chainId as keyof typeof WEB3_CONFIG.CHAIN_NAMES] || `Chain ${chainId}`;
}

// 工具函数：获取区块浏览器URL
export function getBlockExplorerUrl(chainId: number): string {
  return WEB3_CONFIG.BLOCK_EXPLORERS[chainId as keyof typeof WEB3_CONFIG.BLOCK_EXPLORERS] || '';
}

// 工具函数：格式化钱包地址
export function formatAddress(address: string, length = 4): string {
  if (!address) return '';
  return `${address.slice(0, 2 + length)}...${address.slice(-length)}`;
}

// 工具函数：验证以太坊地址
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}