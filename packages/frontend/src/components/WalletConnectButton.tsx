import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useWalletConnect } from '../hooks/useWalletConnect';
import { useWallet } from './WalletProvider';
import { WalletType, ERROR_MESSAGES, formatAddress, SUPPORTED_WALLETS } from '../config/web3';
import type { WalletInfo } from '../config/web3';

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
  const { auth: authContext } = useWallet(); // 从context获取auth，避免创建新实例
  const { auth, login } = authContext;
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempted, setLoginAttempted] = useState(false); // 防止重复登录

  // 处理连接钱包
  const handleConnect = useCallback(async (walletType?: WalletType) => {
    setIsLoading(true);
    setShowWalletSelector(false);

    try {
      const result = await connect({ type: walletType });

      if (result.success && result.address) {
        onConnected?.(result.address);

        // 如果启用自动登录，尝试登录（只尝试一次）
        if (autoLogin && !auth.isAuthenticated && !auth.isAuthenticating && !loginAttempted) {
          console.log('🔐 Starting auto login process...');
          console.log('- Wallet connected:', result.address);
          console.log('- Auth status:', auth.isAuthenticated);
          console.log('- Auth authenticating:', auth.isAuthenticating);

          setLoginAttempted(true); // 标记已尝试登录

          try {
            // 直接传递钱包地址，不依赖hook状态
            const loginResult = await login({ walletAddress: result.address });
            console.log('🔐 Auto login result:', loginResult);

            if (!loginResult.success) {
              console.error('🔐 Auto login failed:', loginResult.error);
              onError?.(loginResult.error || 'Login failed');
              setLoginAttempted(false); // 失败后允许重试
            }
          } catch (error: any) {
            console.error('🔐 Auto login exception:', error);
            onError?.(error.message || 'Login failed');
            setLoginAttempted(false); // 失败后允许重试
          }
        } else {
          console.log('🔐 Auto login skipped:', {
            autoLogin,
            isAuthenticated: auth.isAuthenticated,
            isAuthenticating: auth.isAuthenticating,
            loginAttempted
          });
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
      // 断开钱包时同时登出
      if (auth.isAuthenticated) {
        await authContext.logout();
      }
      onDisconnected?.();
    } catch (error: any) {
      console.error('Disconnect failed:', error);
      onError?.(error.message || 'Disconnect failed');
    } finally {
      setIsLoading(false);
    }
  }, [disconnect, auth.isAuthenticated, authContext, onDisconnected, onError]);

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
          Connecting...
        </>
      ) : (
        <>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Connect Wallet
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
        title="Disconnect"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );

  // 渲染钱包选择器
  const renderWalletSelector = () => {
    if (!showWalletSelector || typeof document === 'undefined') return null;

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

    const modalContent = (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={() => setShowWalletSelector(false)}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <div
          className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Select Wallet</h3>
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
                  <span className="text-sm text-green-600">Installed</span>
                ) : (
                  <span className="text-sm text-blue-600">Install</span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-4 text-xs text-gray-500 text-center">
            By connecting your wallet, you agree to our Terms of Service
          </div>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
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
              {errorInfo?.title || 'Connection Error'}
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
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div>
        {wallet.isConnected ? renderConnectedState() : renderConnectButton()}
        {renderErrorState()}
      </div>
      {renderWalletSelector()}
    </>
  );
}