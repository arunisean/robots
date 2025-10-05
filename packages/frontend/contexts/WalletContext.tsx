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

    console.log('\n=== Web3 Login Process Started ===');
    console.log('Wallet Address:', wallet.address);
    console.log('Timestamp:', new Date().toISOString());

    setAuth(prev => ({ ...prev, isAuthenticating: true, error: null }));

    try {
      // 1. 获取nonce
      console.log('\n--- Step 1: Requesting Nonce ---');
      console.log('Request URL:', 'http://localhost:3001/api/auth/nonce');
      console.log('Request Body:', { walletAddress: wallet.address });
      
      const nonceResponse = await fetch('http://localhost:3001/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: wallet.address })
      });

      console.log('Nonce Response Status:', nonceResponse.status);
      console.log('Nonce Response OK:', nonceResponse.ok);

      if (!nonceResponse.ok) {
        const errorText = await nonceResponse.text();
        console.error('Nonce Request Failed:', errorText);
        throw new Error('Failed to get nonce');
      }

      const { nonce, message } = await nonceResponse.json();
      
      console.log('Received Nonce:', nonce);
      console.log('Message to Sign:');
      console.log('- Content:', JSON.stringify(message));
      console.log('- Length:', message.length);
      console.log('- First 100 chars:', message.substring(0, 100));
      console.log('- Last 100 chars:', message.substring(message.length - 100));
      console.log('- Contains wallet address:', message.includes(wallet.address));
      console.log('- Contains nonce:', message.includes(nonce));

      // 2. 签名消息
      console.log('\n--- Step 2: Signing Message ---');
      console.log('Signing Method: personal_sign');
      console.log('Signing Params:', [message, wallet.address]);
      
      const signature = await (window as any).ethereum.request({
        method: 'personal_sign',
        params: [message, wallet.address]
      });

      console.log('Signature Result:');
      console.log('- Signature:', signature);
      console.log('- Signature Length:', signature.length);
      console.log('- Signature Type:', typeof signature);
      console.log('- Starts with 0x:', signature.startsWith('0x'));

      // 3. 提交认证
      console.log('\n--- Step 3: Submitting Authentication ---');
      const loginPayload = {
        walletAddress: wallet.address,
        signature,
        message
      };
      console.log('Login Payload:', {
        walletAddress: loginPayload.walletAddress,
        signature: loginPayload.signature,
        messageLength: loginPayload.message.length,
        messagePreview: loginPayload.message.substring(0, 50) + '...'
      });
      
      const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginPayload)
      });

      console.log('Login Response Status:', loginResponse.status);
      console.log('Login Response OK:', loginResponse.ok);

      if (!loginResponse.ok) {
        const errorResponse = await loginResponse.text();
        console.error('Login Request Failed:');
        console.error('- Status:', loginResponse.status);
        console.error('- Response:', errorResponse);
        throw new Error(`Login failed: ${errorResponse}`);
      }

      const loginResult = await loginResponse.json();
      console.log('Login Response Data:', loginResult);

      const { success, token, user } = loginResult;

      if (!success || !token) {
        console.error('Invalid Login Response:');
        console.error('- Success:', success);
        console.error('- Token Present:', !!token);
        console.error('- User Present:', !!user);
        throw new Error('Invalid login response');
      }

      // 保存认证信息
      console.log('\n--- Step 4: Saving Authentication Data ---');
      console.log('Token to Save:', token.substring(0, 20) + '...');
      console.log('User Data:', user);
      
      localStorage.setItem('auth_token', token);
      localStorage.setItem('current_user', JSON.stringify(user));

      console.log('Storage Verification:');
      console.log('- Token in localStorage:', !!localStorage.getItem('auth_token'));
      console.log('- User in localStorage:', !!localStorage.getItem('current_user'));
      console.log('- Token matches:', localStorage.getItem('auth_token') === token);

      setAuth({
        isAuthenticated: true,
        isAuthenticating: false,
        token,
        user,
        error: null,
      });

      console.log('\n=== Web3 Login Process Completed Successfully ===');
      console.log('Final Auth State:', {
        isAuthenticated: true,
        hasToken: !!token,
        hasUser: !!user,
        userId: user?.id
      });

    } catch (error: any) {
      console.error('\n=== Web3 Login Process Failed ===');
      console.error('Error Type:', error.constructor.name);
      console.error('Error Message:', error.message);
      console.error('Error Stack:', error.stack);
      console.error('Current Wallet State:', {
        isConnected: wallet.isConnected,
        address: wallet.address,
        chainId: wallet.chainId
      });
      
      // 显示更详细的错误信息
      let errorMessage = error.message || 'Login failed';
      if (error.message && error.message.includes('signature')) {
        errorMessage = `Signature verification failed. Please try again. Details: ${error.message}`;
        console.error('Signature Verification Error Detected');
      } else if (error.message && error.message.includes('nonce')) {
        errorMessage = `Nonce validation failed. Please try again. Details: ${error.message}`;
        console.error('Nonce Validation Error Detected');
      }
      
      setAuth(prev => ({
        ...prev,
        isAuthenticating: false,
        error: errorMessage
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