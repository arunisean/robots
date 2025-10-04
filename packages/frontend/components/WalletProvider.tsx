import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useWalletConnect } from '../hooks/useWalletConnect';
import { useAuth } from '../hooks/useAuth';
import type { UseWalletReturn, UseAuthReturn, User } from '../types/web3';

// 钱包上下文接口
interface WalletContextValue {
  wallet: UseWalletReturn;
  auth: UseAuthReturn;
  user: User | null;
  isInitialized: boolean;
  error: string | null;
}

// 创建上下文
const WalletContext = createContext<WalletContextValue | null>(null);

// 钱包提供者属性
interface WalletProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  supportedChains?: number[];
  onError?: (error: string) => void;
}

// 钱包提供者组件
export function WalletProvider({
  children,
  autoConnect = true,
  supportedChains = [1, 11155111], // 以太坊主网和Sepolia测试网
  onError,
}: WalletProviderProps) {
  const wallet = useWalletConnect();
  const auth = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 初始化
  useEffect(() => {
    initializeProvider();
  }, []);

  // 监听钱包连接状态变化
  useEffect(() => {
    if (wallet.wallet.isConnected && wallet.wallet.address) {
      // 检查网络是否支持
      if (wallet.wallet.chainId && !supportedChains.includes(wallet.wallet.chainId)) {
        const errorMsg = `不支持的网络。请切换到支持的网络。`;
        setError(errorMsg);
        onError?.(errorMsg);
      } else {
        setError(null);
      }
    }
  }, [wallet.wallet.isConnected, wallet.wallet.chainId, supportedChains, onError]);

  // 监听认证状态变化
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChange((event) => {
      switch (event.type) {
        case 'AUTH_FAILED':
          if (event.payload.error) {
            const errorMsg = event.payload.error.message;
            setError(errorMsg);
            onError?.(errorMsg);
          }
          break;
        case 'AUTH_SUCCESS':
          setError(null);
          break;
      }
    });

    return unsubscribe;
  }, [auth, onError]);

  // 监听钱包事件
  useEffect(() => {
    const handleWalletError = (error: any) => {
      const errorMsg = error.message || '钱包操作失败';
      setError(errorMsg);
      onError?.(errorMsg);
    };

    // 这里可以添加更多的钱包事件监听
    // wallet.addEventListener('error', handleWalletError);

    return () => {
      // wallet.removeEventListener('error', handleWalletError);
    };
  }, [wallet, onError]);

  // 初始化提供者
  const initializeProvider = async () => {
    try {
      setIsInitialized(false);
      setError(null);

      // 如果启用自动连接，尝试恢复之前的连接
      if (autoConnect) {
        // 这里可以添加自动连接逻辑
        // 例如检查本地存储中是否有之前的连接信息
      }

      setIsInitialized(true);
    } catch (error: any) {
      console.error('Failed to initialize wallet provider:', error);
      const errorMsg = error.message || '初始化钱包提供者失败';
      setError(errorMsg);
      onError?.(errorMsg);
      setIsInitialized(true); // 即使失败也要设置为已初始化
    }
  };

  // 上下文值
  const contextValue: WalletContextValue = {
    wallet,
    auth,
    user: auth.auth.user,
    isInitialized,
    error,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

// 使用钱包上下文的Hook
export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  
  return context;
}

// 钱包状态指示器组件
interface WalletStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function WalletStatus({ className = '', showDetails = false }: WalletStatusProps) {
  const { wallet, auth, isInitialized, error } = useWallet();

  if (!isInitialized) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-600">初始化中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span className="text-sm text-red-600">
          {showDetails ? error : '连接错误'}
        </span>
      </div>
    );
  }

  if (!wallet.wallet.isConnected) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <span className="text-sm text-gray-600">未连接</span>
      </div>
    );
  }

  if (!auth.auth.isAuthenticated) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
        <span className="text-sm text-yellow-600">已连接，未认证</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
      <span className="text-sm text-green-600">
        {showDetails && auth.auth.user ? 
          `已认证 - ${auth.auth.user.walletAddress.slice(0, 6)}...${auth.auth.user.walletAddress.slice(-4)}` : 
          '已认证'
        }
      </span>
    </div>
  );
}

// 认证守卫组件
interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
  requireWallet?: boolean;
}

export function AuthGuard({ 
  children, 
  fallback, 
  requireAuth = true, 
  requireWallet = true 
}: AuthGuardProps) {
  const { wallet, auth, isInitialized } = useWallet();

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">初始化中...</p>
        </div>
      </div>
    );
  }

  if (requireWallet && !wallet.wallet.isConnected) {
    return fallback || (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p className="text-gray-600 mb-4">请先连接钱包</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !auth.auth.isAuthenticated) {
    return fallback || (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 mb-4">请先完成身份认证</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// 网络切换组件
interface NetworkSwitcherProps {
  className?: string;
  supportedChains?: number[];
}

export function NetworkSwitcher({ className = '', supportedChains = [1, 11155111] }: NetworkSwitcherProps) {
  const { wallet } = useWallet();
  const [isLoading, setIsLoading] = useState(false);

  const chainNames: Record<number, string> = {
    1: '以太坊主网',
    11155111: 'Sepolia 测试网',
    137: 'Polygon',
    80001: 'Polygon Mumbai',
  };

  const handleSwitchNetwork = async (chainId: number) => {
    setIsLoading(true);
    try {
      await wallet.switchNetwork(chainId);
    } catch (error) {
      console.error('Switch network failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!wallet.wallet.isConnected) {
    return null;
  }

  const currentChainId = wallet.wallet.chainId;
  const isUnsupported = currentChainId && !supportedChains.includes(currentChainId);

  return (
    <div className={`relative ${className}`}>
      <select
        value={currentChainId || ''}
        onChange={(e) => handleSwitchNetwork(Number(e.target.value))}
        disabled={isLoading}
        className={`
          px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
          ${isUnsupported ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-300 bg-white'}
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {currentChainId && !supportedChains.includes(currentChainId) && (
          <option value={currentChainId}>
            不支持的网络 ({currentChainId})
          </option>
        )}
        {supportedChains.map(chainId => (
          <option key={chainId} value={chainId}>
            {chainNames[chainId] || `Chain ${chainId}`}
          </option>
        ))}
      </select>
      
      {isLoading && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}