import { useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '../services/authService';
import { useWalletConnect } from './useWalletConnect';
import { WEB3_CONFIG } from '../config/web3';
import type { 
  AuthState, 
  AuthCredentials, 
  AuthResult, 
  UseAuthReturn,
  AuthStateChangeEvent,
  NonceResponse
} from '../types/web3';

const initialAuthState: AuthState = {
  isAuthenticated: false,
  isAuthenticating: false,
  token: null,
  user: null,
  expiresAt: null,
  error: null,
};

export function useAuth(): UseAuthReturn {
  const [auth, setAuth] = useState<AuthState>(initialAuthState);
  const { wallet, signMessage } = useWalletConnect();
  const eventListenersRef = useRef<((event: AuthStateChangeEvent) => void)[]>([]);
  const authStateUnsubscribeRef = useRef<(() => void) | null>(null);

  // 初始化
  useEffect(() => {
    initializeAuth();
    setupAuthEventHandlers();

    return () => {
      cleanup();
    };
  }, []);

  // 监听钱包状态变化
  useEffect(() => {
    if (!wallet.isConnected && auth.isAuthenticated) {
      // 钱包断开连接时自动登出
      logout();
    }
  }, [wallet.isConnected, auth.isAuthenticated]);

  // 初始化认证状态
  const initializeAuth = useCallback(async () => {
    try {
      // 检查是否有存储的认证信息
      if (authService.isAuthenticated()) {
        const user = authService.getCurrentUser();
        const token = authService.getToken();
        const expiresAt = authService.getTokenExpirationTime();

        // 验证token是否仍然有效
        if (authService.isTokenValid()) {
          setAuth({
            isAuthenticated: true,
            isAuthenticating: false,
            token,
            user,
            expiresAt,
            error: null,
          });

          // 验证token（可选，用于获取最新用户信息）
          authService.verifyToken().catch(error => {
            console.warn('Token verification failed:', error);
          });
        } else {
          // token已过期，尝试刷新
          const refreshed = await authService.refreshToken();
          if (!refreshed) {
            // 刷新失败，清理认证状态
            await authService.logout();
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      setAuth(initialAuthState);
    }
  }, []);

  // 设置认证事件处理器
  const setupAuthEventHandlers = useCallback(() => {
    // 监听认证服务的状态变化
    authStateUnsubscribeRef.current = authService.onAuthStateChange((event) => {
      handleAuthStateChange(event);
      
      // 通知外部监听器
      eventListenersRef.current.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in auth event listener:', error);
        }
      });
    });
  }, []);

  // 处理认证状态变化
  const handleAuthStateChange = useCallback((event: AuthStateChangeEvent) => {
    switch (event.type) {
      case 'AUTH_SUCCESS':
        setAuth({
          isAuthenticated: true,
          isAuthenticating: false,
          token: event.payload.token || null,
          user: event.payload.user || null,
          expiresAt: authService.getTokenExpirationTime(),
          error: null,
        });
        break;

      case 'AUTH_FAILED':
        setAuth(prev => ({
          ...prev,
          isAuthenticating: false,
          error: event.payload.error || null,
        }));
        break;

      case 'AUTH_LOGOUT':
        setAuth(initialAuthState);
        break;

      case 'TOKEN_REFRESHED':
        setAuth(prev => ({
          ...prev,
          token: event.payload.token || prev.token,
          expiresAt: authService.getTokenExpirationTime(),
        }));
        break;
    }
  }, []);

  // 登录
  const login = useCallback(async (credentials?: Partial<AuthCredentials>): Promise<AuthResult> => {
    if (auth.isAuthenticating) {
      return { success: false, error: 'Authentication already in progress' };
    }

    if (!wallet.isConnected || !wallet.address) {
      return { success: false, error: 'Wallet not connected' };
    }

    setAuth(prev => ({ ...prev, isAuthenticating: true, error: null }));

    try {
      // 如果没有提供完整凭据，执行完整的登录流程
      if (!credentials?.signature || !credentials?.message) {
        return await performFullLogin();
      }

      // 使用提供的凭据登录
      const fullCredentials: AuthCredentials = {
        walletAddress: wallet.address,
        signature: credentials.signature,
        message: credentials.message,
        chainId: wallet.chainId || 1,
      };

      return await authService.login(fullCredentials);
    } catch (error: any) {
      console.error('Login failed:', error);
      
      setAuth(prev => ({
        ...prev,
        isAuthenticating: false,
        error: {
          type: 'SIGNATURE_ERROR',
          message: error.message || 'Login failed',
          retryable: true,
        },
      }));

      return { success: false, error: error.message || 'Login failed' };
    }
  }, [auth.isAuthenticating, wallet.isConnected, wallet.address, wallet.chainId]);

  // 执行完整登录流程
  const performFullLogin = useCallback(async (): Promise<AuthResult> => {
    if (!wallet.address) {
      throw new Error('Wallet address not available');
    }

    try {
      // 1. 获取nonce
      const nonceResponse: NonceResponse = await authService.getNonce(wallet.address);
      
      // 2. 请求用户签名
      const signature = await signMessage(nonceResponse.message);
      
      // 3. 提交认证
      const credentials: AuthCredentials = {
        walletAddress: wallet.address,
        signature,
        message: nonceResponse.message,
        chainId: wallet.chainId || 1,
      };

      return await authService.login(credentials);
    } catch (error: any) {
      console.error('Full login failed:', error);
      throw error;
    }
  }, [wallet.address, wallet.chainId, signMessage]);

  // 登出
  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
      // 即使登出失败，也要清理本地状态
      setAuth(initialAuthState);
    }
  }, []);

  // 刷新token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      return await authService.refreshToken();
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }, []);

  // 检查token是否有效
  const isTokenValid = useCallback((): boolean => {
    return authService.isTokenValid();
  }, []);

  // 获取token过期时间
  const getTokenExpirationTime = useCallback((): Date | null => {
    return authService.getTokenExpirationTime();
  }, []);

  // 添加认证状态变化监听器
  const onAuthStateChange = useCallback((callback: (event: AuthStateChangeEvent) => void): (() => void) => {
    eventListenersRef.current.push(callback);
    
    // 返回取消监听的函数
    return () => {
      const index = eventListenersRef.current.indexOf(callback);
      if (index > -1) {
        eventListenersRef.current.splice(index, 1);
      }
    };
  }, []);

  // 获取认证头
  const getAuthHeader = useCallback((): string | null => {
    if (!auth.token) return null;
    return `Bearer ${auth.token}`;
  }, [auth.token]);

  // 创建认证的fetch函数
  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const authHeader = getAuthHeader();
    if (!authHeader) {
      throw new Error('Not authenticated');
    }

    const headers = {
      ...options.headers,
      'Authorization': authHeader,
    };

    const response = await fetch(url, { ...options, headers });

    // 如果返回401，可能是token过期，尝试刷新
    if (response.status === 401 && auth.isAuthenticated) {
      const refreshed = await refreshToken();
      if (refreshed) {
        // 重试请求
        const newAuthHeader = getAuthHeader();
        if (newAuthHeader) {
          const retryHeaders = {
            ...options.headers,
            'Authorization': newAuthHeader,
          };
          return fetch(url, { ...options, headers: retryHeaders });
        }
      } else {
        // 刷新失败，登出用户
        await logout();
        throw new Error('Authentication expired');
      }
    }

    return response;
  }, [auth.token, auth.isAuthenticated, getAuthHeader, refreshToken, logout]);

  // 清理资源
  const cleanup = useCallback(() => {
    if (authStateUnsubscribeRef.current) {
      authStateUnsubscribeRef.current();
    }
    eventListenersRef.current = [];
  }, []);

  return {
    auth,
    login,
    logout,
    refreshToken,
    isTokenValid,
    getTokenExpirationTime,
    onAuthStateChange,
    getAuthHeader,
    authenticatedFetch,
  };
}

// 扩展UseAuthReturn接口以包含新方法
declare module '../types/web3' {
  interface UseAuthReturn {
    getAuthHeader: () => string | null;
    authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
  }
}