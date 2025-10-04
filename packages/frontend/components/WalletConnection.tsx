import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';

interface WalletConnectionProps {
  className?: string;
  showBalance?: boolean;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function WalletConnection({ 
  className = '', 
  showBalance = false, 
  showDetails = true,
  size = 'md'
}: WalletConnectionProps) {
  const { wallet, auth, connectWallet, disconnectWallet, login, logout } = useWallet();
  const [isLoading, setIsLoading] = useState(false);

  // 处理连接钱包
  const handleConnect = async () => {
    setIsLoading(true);
    try {
      await connectWallet();
    } catch (error: any) {
      console.error('Connect failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理登录
  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await login();
    } catch (error: any) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理断开连接
  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await logout();
      await disconnectWallet();
    } catch (error: any) {
      console.error('Disconnect failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取按钮样式
  const getButtonStyles = () => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const sizeStyles = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return `${baseStyles} ${sizeStyles[size]} bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500`;
  };

  // 格式化地址
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 如果钱包未连接
  if (!wallet.isConnected) {
    return (
      <div className={className}>
        <button
          onClick={handleConnect}
          disabled={isLoading || wallet.isConnecting}
          className={getButtonStyles()}
        >
          {isLoading || wallet.isConnecting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              连接中...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              连接钱包
            </>
          )}
        </button>
        
        {wallet.error && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{wallet.error}</p>
          </div>
        )}
      </div>
    );
  }

  // 如果钱包已连接但未认证
  if (!auth.isAuthenticated) {
    return (
      <div className={className}>
        <div className="flex items-center space-x-3">
          {/* 钱包状态 */}
          <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span className="text-sm font-medium text-yellow-800">
              {showDetails ? formatAddress(wallet.address!) : '已连接'}
            </span>
          </div>

          {/* 登录按钮 */}
          <button
            onClick={handleLogin}
            disabled={isLoading || auth.isAuthenticating}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading || auth.isAuthenticating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                认证中...
              </>
            ) : (
              '登录'
            )}
          </button>

          {/* 断开连接按钮 */}
          <button
            onClick={handleDisconnect}
            disabled={isLoading}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="断开连接"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {auth.error && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{auth.error}</p>
            <button
              onClick={handleLogin}
              className="text-sm text-red-600 hover:text-red-800 underline mt-1"
            >
              重试
            </button>
          </div>
        )}
      </div>
    );
  }

  // 如果已完全认证
  return (
    <div className={className}>
      <div className="flex items-center space-x-3">
        {/* 认证状态 */}
        <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-green-800">
              {showDetails ? formatAddress(wallet.address!) : '已认证'}
            </span>
            {showDetails && auth.user && (
              <span className="text-xs text-green-600">
                {auth.user.role === 'admin' ? '管理员' : 
                 auth.user.role === 'test' ? '测试用户' : '用户'}
              </span>
            )}
          </div>
        </div>

        {/* 余额显示 */}
        {showBalance && wallet.balance && (
          <div className="text-sm text-gray-600">
            {parseFloat(wallet.balance).toFixed(4)} ETH
          </div>
        )}

        {/* 断开连接按钮 */}
        <button
          onClick={handleDisconnect}
          disabled={isLoading}
          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          title="断开连接"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// 简化的钱包状态指示器
export function WalletStatus({ className = '' }: { className?: string }) {
  const { wallet, auth } = useWallet();

  if (!wallet.isConnected) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <span className="text-sm text-gray-600">未连接</span>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
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
      <span className="text-sm text-green-600">已认证</span>
    </div>
  );
}

// 认证守卫组件
interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
  requireWallet?: boolean;
}

export function AuthGuard({ 
  children, 
  fallback, 
  requireAuth = true, 
  requireWallet = true 
}: AuthGuardProps) {
  const { wallet, auth } = useWallet();

  if (requireWallet && !wallet.isConnected) {
    return fallback || (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p className="text-gray-600 mb-4">请先连接钱包</p>
          <WalletConnection />
        </div>
      </div>
    );
  }

  if (requireAuth && !auth.isAuthenticated) {
    return fallback || (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 mb-4">请先完成身份认证</p>
          <WalletConnection />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}