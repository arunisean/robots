import React, { useState, useCallback } from 'react';
import { useWalletConnect } from '../hooks/useWalletConnect';
import { useAuth } from '../hooks/useAuth';
import { WalletType, ERROR_MESSAGES, formatAddress, SUPPORTED_WALLETS } from '../src/config/web3';
import type { WalletInfo } from '../src/config/web3';

interface WalletConnectButtonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
  showBalance?: boolean;
  autoLogin?: boolean;
  onConnected?: (address: string) => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
}

export function WalletConnectButton({
  className = '',
  size = 'md',
  variant = 'primary',
  showBalance = false,
  autoLogin = true,
  onConnected,
  onDisconnected,
  onError,
}: WalletConnectButtonProps) {
  const { wallet, connect, disconnect } = useWalletConnect();
  const { auth, login } = useAuth();
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 处理连接钱包
  const handleConnect = useCallback(async (walletType?: WalletType) => {
    setIsLoading(true);
    setShowWalletSelector(false);

    try {
      const result = await connect({ type: walletType });
      
      if (result.success && result.address) {
        onConnected?.(result.address);
        
        // 如果启用自动登录，尝试登录
        if (autoLogin && !auth.isAuthenticated) {
          try {
            await login();
          } catch (error: any) {
            console.warn('Auto login failed:', error);
            onError?.(error.message || 'Login failed');
          }
        }
      } else if (result.error) {
        const errorMessage = ERROR_MESSAGES[result.error.type]?.message || result.error.message;
        onError?.(errorMessage);
      }
    } catch (error: any) {
      console.error('Connect failed:', error);
      onError?.(error.message || 'Connection failed');
    } finally {
      setIsLoading(false);
    }
  }, [connect, autoLogin, auth.isAuthenticated, login, onConnected, onError]);

  // 处理断开连接
  const handleDisconnect = useCallback(async () => {
    setIsLoading(true);
    
    try {
      await disconnect();
      onDisconnected?.();
    } catch (error: any) {
      console.error('Disconnect failed:', error);
      onError?.(error.message || 'Disconnect failed');
    } finally {
      setIsLoading(false);
    }
  }, [disconnect, onDisconnected, onError]);

  // 获取按钮样式
  const getButtonStyles = () => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const sizeStyles = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    const variantStyles = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
      secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
      outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
    };

    return `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`;
  };

  // 渲染连接按钮
  const renderConnectButton = () => (
    <button
      onClick={() => setShowWalletSelector(true)}
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
  );

  // 渲染已连接状态
  const renderConnectedState = () => (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span className="text-sm font-medium text-green-800">
          {formatAddress(wallet.address!)}
        </span>
        {showBalance && wallet.balance && (
          <span className="text-sm text-green-600">
            {parseFloat(wallet.balance).toFixed(4)} ETH
          </span>
        )}
      </div>
      
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
  );

  // 渲染钱包选择器
  const renderWalletSelector = () => {
    if (!showWalletSelector) return null;

    const wallets: WalletInfo[] = [
      {
        type: WalletType.METAMASK,
        name: 'MetaMask',
        icon: '🦊',
        installed: typeof window !== 'undefined' && !!(window as any).ethereum?.isMetaMask,
        downloadUrl: 'https://metamask.io/download/',
      },
      {
        type: WalletType.WALLET_CONNECT,
        name: 'WalletConnect',
        icon: '🔗',
        installed: true,
      },
      {
        type: WalletType.COINBASE,
        name: 'Coinbase Wallet',
        icon: '🔵',
        installed: typeof window !== 'undefined' && !!(window as any).ethereum?.isCoinbaseWallet,
        downloadUrl: 'https://www.coinbase.com/wallet',
      },
    ];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">选择钱包</h3>
            <button
              onClick={() => setShowWalletSelector(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-2">
            {wallets.map((wallet) => (
              <button
                key={wallet.type}
                onClick={() => wallet.installed ? handleConnect(wallet.type) : window.open(wallet.downloadUrl, '_blank')}
                className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{wallet.icon}</span>
                  <span className="font-medium">{wallet.name}</span>
                </div>
                
                {wallet.installed ? (
                  <span className="text-sm text-green-600">已安装</span>
                ) : (
                  <span className="text-sm text-blue-600">安装</span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-4 text-xs text-gray-500 text-center">
            连接钱包即表示您同意我们的服务条款
          </div>
        </div>
      </div>
    );
  };

  // 渲染错误状态
  const renderErrorState = () => {
    if (!wallet.error) return null;

    const errorInfo = ERROR_MESSAGES[wallet.error.type];
    
    return (
      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-red-400 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-800">
              {errorInfo?.title || '连接错误'}
            </h4>
            <p className="text-sm text-red-700 mt-1">
              {errorInfo?.message || wallet.error.message}
            </p>
            {errorInfo?.actionUrl && (
              <a
                href={errorInfo.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-red-600 hover:text-red-800 underline mt-1 inline-block"
              >
                {errorInfo.action}
              </a>
            )}
            {wallet.error.retryable && (
              <button
                onClick={() => handleConnect()}
                className="text-sm text-red-600 hover:text-red-800 underline mt-1 ml-4"
              >
                重试
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {wallet.isConnected ? renderConnectedState() : renderConnectButton()}
      {renderErrorState()}
      {renderWalletSelector()}
    </div>
  );
}