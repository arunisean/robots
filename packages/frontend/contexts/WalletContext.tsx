import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// 钱包状态接口
export interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  chainId: number | null;
  balance: string | null;
  error: string | null;
}

// 用户状态接口
export interface User {
  id: string;
  walletAddress: string;
  role: 'user' | 'admin' | 'test';
}

// 认证状态接口
export interface AuthState {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  token: string | null;
  user: User | null;
  error: string | null;
}

// 钱包上下文接口
interface WalletContextValue {
  // 钱包状态
  wallet: WalletState;
  
  // 认证状态
  auth: AuthState;
  
  // 钱包操作
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  
  // 认证操作
  login: () => Promise<void>;
  logout: () => Promise<void>;
  
  // 工具方法
  getAuthHeader: () => string | null;
  isAdmin: () => boolean;
}

// 创建上下文
const WalletContext = createContext<WalletContextValue | null>(null);

// 初始状态
const initialWalletState: WalletState = {
  isConnected: false,
  isConnecting: false,
  address: null,
  chainId: null,
  balance: null,
  error: null,
};

const initialAuthState: AuthState = {
  isAuthenticated: false,
  isAuthenticating: false,
  token: null,
  user: null,
  error: null,
};

// 钱包提供者组件
interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [wallet, setWallet] = useState<WalletState>(initialWalletState);
  const [auth, setAuth] = useState<AuthState>(initialAuthState);

  // 初始化：检查本地存储的状态
  useEffect(() => {
    initializeWallet();
  }, []);

  // 初始化钱包状态
  const initializeWallet = async () => {
    try {
      // 检查本地存储的连接状态
      const savedWalletConnected = localStorage.getItem('wallet_connected') === 'true';
      const savedWalletAddress = localStorage.getItem('wallet_address');
      const savedAuthToken = localStorage.getItem('auth_token');
      const savedUser = localStorage.getItem('current_user');

      if (savedWalletConnected && savedWalletAddress) {
        // 检查MetaMask是否仍然连接
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          try {
            const accounts = await (window as any).ethereum.request({
              method: 'eth_accounts'
            });
            
            if (accounts.length > 0 && accounts[0].toLowerCase() === savedWalletAddress.toLowerCase()) {
              // 钱包仍然连接
              const chainId = await (window as any).ethereum.request({
                method: 'eth_chainId'
              });
              
              setWallet({
                isConnected: true,
                isConnecting: false,
                address: accounts[0],
                chainId: parseInt(chainId, 16),
                balance: null,
                error: null,
              });

              // 如果有保存的认证信息，恢复认证状态
              if (savedAuthToken && savedUser) {
                try {
                  const user = JSON.parse(savedUser);
                  setAuth({
                    isAuthenticated: true,
                    isAuthenticating: false,
                    token: savedAuthToken,
                    user,
                    error: null,
                  });
                } catch (error) {
                  console.error('Failed to parse saved user:', error);
                  // 清理无效的认证数据
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('current_user');
                }
              }
            } else {
              // 钱包已断开，清理状态
              clearWalletState();
            }
          } catch (error) {
            console.error('Failed to check wallet connection:', error);
            clearWalletState();
          }
        } else {
          // MetaMask不可用，清理状态
          clearWalletState();
        }
      }
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
    }
  };

  // 清理钱包状态
  const clearWalletState = () => {
    localStorage.removeItem('wallet_connected');
    localStorage.removeItem('wallet_address');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    setWallet(initialWalletState);
    setAuth(initialAuthState);
  };

  // 连接钱包
  const connectWallet = async () => {
    if (wallet.isConnecting) return;

    setWallet(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        throw new Error('MetaMask not installed');
      }

      const accounts = await (window as any).ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const chainId = await (window as any).ethereum.request({
        method: 'eth_chainId'
      });

      const address = accounts[0];
      
      // 保存到本地存储
      localStorage.setItem('wallet_connected', 'true');
      localStorage.setItem('wallet_address', address);

      setWallet({
        isConnected: true,
        isConnecting: false,
        address,
        chainId: parseInt(chainId, 16),
        balance: null,
        error: null,
      });

      // 设置事件监听器
      setupEventListeners();

    } catch (error: any) {
      console.error('Connect wallet failed:', error);
      setWallet(prev => ({
        ...prev,
        isConnecting: false,
        error: error.message || 'Failed to connect wallet'
      }));
    }
  };

  // 断开钱包连接
  const disconnectWallet = async () => {
    clearWalletState();
  };

  // 登录
  const login = async () => {
    if (!wallet.isConnected || !wallet.address) {
      throw new Error('Wallet not connected');
    }

    if (auth.isAuthenticating) return;

    setAuth(prev => ({ ...prev, isAuthenticating: true, error: null }));

    try {
      // 1. 获取nonce
      const nonceResponse = await fetch('http://localhost:3001/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: wallet.address })
      });

      if (!nonceResponse.ok) {
        throw new Error('Failed to get nonce');
      }

      const { nonce, message } = await nonceResponse.json();

      // 2. 签名消息
      const signature = await (window as any).ethereum.request({
        method: 'personal_sign',
        params: [message, wallet.address]
      });

      // 3. 提交认证
      const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: wallet.address,
          signature,
          message
        })
      });

      if (!loginResponse.ok) {
        throw new Error('Login failed');
      }

      const { success, token, user } = await loginResponse.json();

      if (!success || !token) {
        throw new Error('Invalid login response');
      }

      // 保存认证信息
      localStorage.setItem('auth_token', token);
      localStorage.setItem('current_user', JSON.stringify(user));

      setAuth({
        isAuthenticated: true,
        isAuthenticating: false,
        token,
        user,
        error: null,
      });

    } catch (error: any) {
      console.error('Login failed:', error);
      setAuth(prev => ({
        ...prev,
        isAuthenticating: false,
        error: error.message || 'Login failed'
      }));
      throw error;
    }
  };

  // 登出
  const logout = async () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    setAuth(initialAuthState);
  };

  // 获取认证头
  const getAuthHeader = (): string | null => {
    return auth.token ? `Bearer ${auth.token}` : null;
  };

  // 检查是否为管理员
  const isAdmin = (): boolean => {
    return auth.user?.role === 'admin';
  };

  // 设置事件监听器
  const setupEventListeners = () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) return;

    const ethereum = (window as any).ethereum;

    // 账户变更
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // 用户断开了连接
        clearWalletState();
      } else if (accounts[0] !== wallet.address) {
        // 用户切换了账户
        const newAddress = accounts[0];
        localStorage.setItem('wallet_address', newAddress);
        setWallet(prev => ({ ...prev, address: newAddress }));
        
        // 清理认证状态（需要重新认证）
        localStorage.removeItem('auth_token');
        localStorage.removeItem('current_user');
        setAuth(initialAuthState);
      }
    };

    // 网络变更
    const handleChainChanged = (chainId: string) => {
      const newChainId = parseInt(chainId, 16);
      setWallet(prev => ({ ...prev, chainId: newChainId }));
    };

    // 连接事件
    const handleConnect = (connectInfo: { chainId: string }) => {
      console.log('Wallet connected:', connectInfo);
    };

    // 断开连接事件
    const handleDisconnect = (error: { code: number; message: string }) => {
      console.log('Wallet disconnected:', error);
      clearWalletState();
    };

    // 添加事件监听器
    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);
    ethereum.on('connect', handleConnect);
    ethereum.on('disconnect', handleDisconnect);

    // 清理函数
    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
      ethereum.removeListener('connect', handleConnect);
      ethereum.removeListener('disconnect', handleDisconnect);
    };
  };

  // 上下文值
  const contextValue: WalletContextValue = {
    wallet,
    auth,
    connectWallet,
    disconnectWallet,
    login,
    logout,
    getAuthHeader,
    isAdmin,
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