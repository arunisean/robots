import detectEthereumProvider from '@metamask/detect-provider';
import { WalletType, SUPPORTED_WALLETS } from '../config/web3';
import type { WalletInfo } from '../config/web3';
import type { WalletProvider } from '../types/web3';

// 检测MetaMask
export async function detectMetaMask(): Promise<WalletProvider | null> {
  try {
    const provider = await detectEthereumProvider({ mustBeMetaMask: true });
    return provider as unknown as WalletProvider;
  } catch (error) {
    console.warn('MetaMask detection failed:', error);
    return null;
  }
}

// 检测Coinbase Wallet
export function detectCoinbaseWallet(): WalletProvider | null {
  try {
    if (typeof window !== 'undefined' && window.ethereum) {
      const { ethereum } = window;
      if (ethereum.isCoinbaseWallet) {
        return ethereum as WalletProvider;
      }
    }
    return null;
  } catch (error) {
    console.warn('Coinbase Wallet detection failed:', error);
    return null;
  }
}

// 检测通用以太坊提供者
export function detectInjectedProvider(): WalletProvider | null {
  try {
    if (typeof window !== 'undefined' && window.ethereum) {
      return window.ethereum as WalletProvider;
    }
    return null;
  } catch (error) {
    console.warn('Injected provider detection failed:', error);
    return null;
  }
}

// 检测所有可用的钱包
export async function detectAvailableWallets(): Promise<WalletInfo[]> {
  const wallets = [...SUPPORTED_WALLETS];
  
  try {
    // 检测MetaMask
    const metamask = await detectMetaMask();
    const metamaskWallet = wallets.find(w => w.type === WalletType.METAMASK);
    if (metamaskWallet) {
      metamaskWallet.installed = !!metamask;
    }

    // 检测Coinbase Wallet
    const coinbase = detectCoinbaseWallet();
    const coinbaseWallet = wallets.find(w => w.type === WalletType.COINBASE);
    if (coinbaseWallet) {
      coinbaseWallet.installed = !!coinbase;
    }

    // WalletConnect总是可用（通过二维码）
    const walletConnectWallet = wallets.find(w => w.type === WalletType.WALLET_CONNECT);
    if (walletConnectWallet) {
      walletConnectWallet.installed = true;
    }

  } catch (error) {
    console.error('Error detecting wallets:', error);
  }

  return wallets;
}

// 根据类型获取钱包提供者
export async function getWalletProvider(walletType: WalletType): Promise<WalletProvider | null> {
  switch (walletType) {
    case WalletType.METAMASK:
      return await detectMetaMask();
    
    case WalletType.COINBASE:
      return detectCoinbaseWallet();
    
    case WalletType.INJECTED:
      return detectInjectedProvider();
    
    case WalletType.WALLET_CONNECT:
      // WalletConnect需要特殊处理，这里返回null，在连接时处理
      return null;
    
    default:
      return null;
  }
}

// 检查钱包是否已安装
export async function isWalletInstalled(walletType: WalletType): Promise<boolean> {
  const provider = await getWalletProvider(walletType);
  return !!provider;
}

// 获取钱包信息
export async function getWalletInfo(walletType: WalletType): Promise<WalletInfo | null> {
  const wallets = await detectAvailableWallets();
  return wallets.find(w => w.type === walletType) || null;
}

// 检查是否在移动设备上
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// 检查是否支持Web3
export function isWeb3Supported(): boolean {
  if (typeof window === 'undefined') return false;
  
  return !!(window.ethereum || (window as any).web3);
}

// 获取推荐的钱包类型
export async function getRecommendedWallet(): Promise<WalletType> {
  // 在移动设备上优先推荐WalletConnect
  if (isMobile()) {
    return WalletType.WALLET_CONNECT;
  }

  // 检查已安装的钱包
  const metamask = await detectMetaMask();
  if (metamask) {
    return WalletType.METAMASK;
  }

  const coinbase = detectCoinbaseWallet();
  if (coinbase) {
    return WalletType.COINBASE;
  }

  // 默认推荐MetaMask
  return WalletType.METAMASK;
}

// 钱包优先级排序
export async function sortWalletsByPriority(wallets: WalletInfo[]): Promise<WalletInfo[]> {
  const sorted = [...wallets];
  
  // 已安装的钱包优先
  sorted.sort((a, b) => {
    if (a.installed && !b.installed) return -1;
    if (!a.installed && b.installed) return 1;
    
    // 按类型优先级排序
    const priority = {
      [WalletType.METAMASK]: 1,
      [WalletType.COINBASE]: 2,
      [WalletType.WALLET_CONNECT]: 3,
      [WalletType.INJECTED]: 4,
    };
    
    return priority[a.type] - priority[b.type];
  });
  
  return sorted;
}

// 扩展window对象类型
declare global {
  interface Window {
    ethereum?: WalletProvider & {
      isMetaMask?: boolean;
      isCoinbaseWallet?: boolean;
      providers?: WalletProvider[];
    };
    web3?: any;
  }
}