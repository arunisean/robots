import { ethers } from 'ethers';
import { WEB3_CONFIG, WalletType, WalletErrorType, isSupportedChain } from '../config/web3';
import { getWalletProvider, detectAvailableWallets } from './walletDetection';
import type { 
  WalletProvider, 
  WalletConnectionResult, 
  WalletError, 
  NetworkSwitchRequest,
  BalanceInfo,
  WalletEventHandlers 
} from '../types/web3';

export class WalletConnectionManager {
  private provider: WalletProvider | null = null;
  private ethersProvider: ethers.BrowserProvider | null = null;
  private eventHandlers: WalletEventHandlers = {};
  private connectionTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.setupEventListeners();
  }

  // 连接钱包
  async connect(walletType: WalletType, chainId?: number): Promise<WalletConnectionResult> {
    try {
      // 清除之前的连接超时
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
      }

      // 设置连接超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        this.connectionTimeout = setTimeout(() => {
          reject(this.createError(WalletErrorType.CONNECTION_TIMEOUT, 'Connection timeout'));
        }, WEB3_CONFIG.WALLET_CONFIG.CONNECTION_TIMEOUT);
      });

      // 执行连接
      const connectPromise = this.performConnection(walletType, chainId);
      
      // 等待连接完成或超时
      const result = await Promise.race([connectPromise, timeoutPromise]);
      
      // 清除超时
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }

      return result;
    } catch (error) {
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      return {
        success: false,
        error: this.handleConnectionError(error),
      };
    }
  }

  // 执行实际的连接逻辑
  private async performConnection(walletType: WalletType, chainId?: number): Promise<WalletConnectionResult> {
    // 获取钱包提供者
    const provider = await getWalletProvider(walletType);
    if (!provider) {
      throw this.createError(WalletErrorType.NOT_INSTALLED, `${walletType} wallet not found`);
    }

    this.provider = provider;
    this.ethersProvider = new ethers.BrowserProvider(provider);

    // 请求连接账户
    const accounts = await provider.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      throw this.createError(WalletErrorType.USER_REJECTED, 'No accounts returned');
    }

    const address = accounts[0];

    // 获取当前网络
    const currentChainId = await this.getCurrentChainId();

    // 检查网络是否支持
    if (!isSupportedChain(currentChainId)) {
      // 如果指定了chainId，尝试切换
      if (chainId && isSupportedChain(chainId)) {
        const switched = await this.switchNetwork(chainId);
        if (!switched) {
          throw this.createError(WalletErrorType.UNSUPPORTED_CHAIN, 'Unsupported network');
        }
      } else {
        throw this.createError(WalletErrorType.UNSUPPORTED_CHAIN, 'Unsupported network');
      }
    }

    // 设置事件监听器
    this.setupProviderEventListeners();

    return {
      success: true,
      address,
      chainId: currentChainId,
      provider,
    };
  }

  // 断开连接
  async disconnect(): Promise<void> {
    try {
      // 移除事件监听器
      this.removeProviderEventListeners();

      // 清理提供者
      this.provider = null;
      this.ethersProvider = null;

      // 触发断开连接事件
      if (this.eventHandlers.onDisconnect) {
        this.eventHandlers.onDisconnect({ code: 0, message: 'User disconnected' });
      }
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  }

  // 切换网络
  async switchNetwork(chainId: number): Promise<boolean> {
    if (!this.provider) {
      throw new Error('No wallet connected');
    }

    try {
      // 尝试切换到指定网络
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });

      return true;
    } catch (error: any) {
      // 如果网络不存在，尝试添加网络
      if (error.code === 4902) {
        return await this.addNetwork(chainId);
      }
      
      console.error('Failed to switch network:', error);
      return false;
    }
  }

  // 添加网络
  private async addNetwork(chainId: number): Promise<boolean> {
    if (!this.provider) return false;

    const networkData = this.getNetworkData(chainId);
    if (!networkData) return false;

    try {
      await this.provider.request({
        method: 'wallet_addEthereumChain',
        params: [networkData],
      });

      return true;
    } catch (error) {
      console.error('Failed to add network:', error);
      return false;
    }
  }

  // 获取网络数据
  private getNetworkData(chainId: number): NetworkSwitchRequest['chainData'] | null {
    const rpcUrl = WEB3_CONFIG.RPC_URLS[chainId as keyof typeof WEB3_CONFIG.RPC_URLS];
    const chainName = WEB3_CONFIG.CHAIN_NAMES[chainId as keyof typeof WEB3_CONFIG.CHAIN_NAMES];
    const blockExplorerUrl = WEB3_CONFIG.BLOCK_EXPLORERS[chainId as keyof typeof WEB3_CONFIG.BLOCK_EXPLORERS];

    if (!rpcUrl || !chainName) return null;

    return {
      chainId: `0x${chainId.toString(16)}`,
      chainName,
      rpcUrls: [rpcUrl],
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
      blockExplorerUrls: blockExplorerUrl ? [blockExplorerUrl] : [],
    };
  }

  // 签名消息
  async signMessage(message: string): Promise<string> {
    if (!this.ethersProvider) {
      throw new Error('No wallet connected');
    }

    try {
      const signer = await this.ethersProvider.getSigner();
      const signature = await signer.signMessage(message);
      return signature;
    } catch (error: any) {
      if (error.code === 4001) {
        throw this.createError(WalletErrorType.SIGNATURE_REJECTED, 'User rejected signature');
      }
      throw this.createError(WalletErrorType.UNKNOWN_ERROR, error.message);
    }
  }

  // 获取余额
  async getBalance(address: string): Promise<BalanceInfo | null> {
    if (!this.ethersProvider) return null;

    try {
      const balance = await this.ethersProvider.getBalance(address);
      const formatted = ethers.formatEther(balance);

      return {
        formatted,
        value: balance,
        decimals: 18,
        symbol: 'ETH',
      };
    } catch (error) {
      console.error('Failed to get balance:', error);
      return null;
    }
  }

  // 获取当前链ID
  async getCurrentChainId(): Promise<number> {
    if (!this.provider) {
      throw new Error('No wallet connected');
    }

    const chainId = await this.provider.request({ method: 'eth_chainId' });
    return parseInt(chainId, 16);
  }

  // 获取当前账户
  async getCurrentAccount(): Promise<string | null> {
    if (!this.provider) return null;

    try {
      const accounts = await this.provider.request({ method: 'eth_accounts' });
      return accounts && accounts.length > 0 ? accounts[0] : null;
    } catch (error) {
      console.error('Failed to get current account:', error);
      return null;
    }
  }

  // 检查连接状态
  async isConnected(): Promise<boolean> {
    if (!this.provider) return false;

    try {
      const accounts = await this.provider.request({ method: 'eth_accounts' });
      return accounts && accounts.length > 0;
    } catch (error) {
      return false;
    }
  }

  // 设置事件处理器
  setEventHandlers(handlers: WalletEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  // 设置提供者事件监听器
  private setupProviderEventListeners(): void {
    if (!this.provider) return;

    this.provider.on('accountsChanged', this.handleAccountsChanged.bind(this));
    this.provider.on('chainChanged', this.handleChainChanged.bind(this));
    this.provider.on('connect', this.handleConnect.bind(this));
    this.provider.on('disconnect', this.handleDisconnect.bind(this));
  }

  // 移除提供者事件监听器
  private removeProviderEventListeners(): void {
    if (!this.provider) return;

    this.provider.removeListener('accountsChanged', this.handleAccountsChanged.bind(this));
    this.provider.removeListener('chainChanged', this.handleChainChanged.bind(this));
    this.provider.removeListener('connect', this.handleConnect.bind(this));
    this.provider.removeListener('disconnect', this.handleDisconnect.bind(this));
  }

  // 设置全局事件监听器
  private setupEventListeners(): void {
    if (typeof window !== 'undefined') {
      // 监听页面可见性变化
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
      
      // 监听网络状态变化
      window.addEventListener('online', this.handleNetworkChange.bind(this));
      window.addEventListener('offline', this.handleNetworkChange.bind(this));
    }
  }

  // 处理账户变化
  private handleAccountsChanged(accounts: string[]): void {
    if (this.eventHandlers.onAccountsChanged) {
      this.eventHandlers.onAccountsChanged(accounts);
    }
  }

  // 处理链变化
  private handleChainChanged(chainId: string): void {
    if (this.eventHandlers.onChainChanged) {
      this.eventHandlers.onChainChanged(chainId);
    }
  }

  // 处理连接
  private handleConnect(connectInfo: { chainId: string }): void {
    if (this.eventHandlers.onConnect) {
      this.eventHandlers.onConnect(connectInfo);
    }
  }

  // 处理断开连接
  private handleDisconnect(error: { code: number; message: string }): void {
    this.provider = null;
    this.ethersProvider = null;
    
    if (this.eventHandlers.onDisconnect) {
      this.eventHandlers.onDisconnect(error);
    }
  }

  // 处理页面可见性变化
  private handleVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      // 页面变为可见时，检查连接状态
      this.checkConnectionStatus();
    }
  }

  // 处理网络状态变化
  private handleNetworkChange(): void {
    if (navigator.onLine) {
      // 网络恢复时，检查连接状态
      this.checkConnectionStatus();
    }
  }

  // 检查连接状态
  private async checkConnectionStatus(): Promise<void> {
    if (this.provider) {
      try {
        const isConnected = await this.isConnected();
        if (!isConnected) {
          this.handleDisconnect({ code: -1, message: 'Connection lost' });
        }
      } catch (error) {
        console.error('Failed to check connection status:', error);
      }
    }
  }

  // 处理连接错误
  private handleConnectionError(error: any): WalletError {
    if (error instanceof Error && error.message.includes('User rejected')) {
      return this.createError(WalletErrorType.USER_REJECTED, 'User rejected connection');
    }

    if (error.code === 4001) {
      return this.createError(WalletErrorType.USER_REJECTED, 'User rejected connection');
    }

    if (error.code === -32002) {
      return this.createError(WalletErrorType.CONNECTION_TIMEOUT, 'Connection request pending');
    }

    return this.createError(WalletErrorType.UNKNOWN_ERROR, error.message || 'Unknown error');
  }

  // 创建错误对象
  private createError(type: WalletErrorType, message: string, details?: any): WalletError {
    return {
      type,
      message,
      details,
      retryable: type !== WalletErrorType.USER_REJECTED && type !== WalletErrorType.NOT_INSTALLED,
    };
  }

  // 清理资源
  destroy(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }
    
    this.removeProviderEventListeners();
    
    if (typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
      window.removeEventListener('online', this.handleNetworkChange.bind(this));
      window.removeEventListener('offline', this.handleNetworkChange.bind(this));
    }
  }
}

// 创建全局钱包连接管理器实例
export const walletConnectionManager = new WalletConnectionManager();