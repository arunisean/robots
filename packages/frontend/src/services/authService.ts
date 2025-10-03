import { WEB3_CONFIG } from '../config/web3';
import type { 
  AuthCredentials, 
  AuthResult, 
  NonceResponse, 
  User, 
  AuthError,
  AuthStateChangeEvent 
} from '../types/web3';

export class AuthService {
  private token: string | null = null;
  private user: User | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private eventListeners: ((event: AuthStateChangeEvent) => void)[] = [];

  constructor() {
    this.loadStoredAuth();
    this.setupTokenRefresh();
  }

  // 获取nonce
  async getNonce(walletAddress: string): Promise<NonceResponse> {
    try {
      const response = await fetch(`${WEB3_CONFIG.API_ENDPOINTS.BASE_URL}${WEB3_CONFIG.API_ENDPOINTS.AUTH.NONCE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        nonce: data.nonce,
        message: data.message,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5分钟后过期
      };
    } catch (error) {
      console.error('Failed to get nonce:', error);
      throw this.createAuthError('NETWORK_ERROR', 'Failed to get nonce', error);
    }
  }

  // 登录
  async login(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      const response = await fetch(`${WEB3_CONFIG.API_ENDPOINTS.BASE_URL}${WEB3_CONFIG.API_ENDPOINTS.AUTH.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: credentials.walletAddress,
          signature: credentials.signature,
          message: credentials.message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Login failed');
      }

      // 存储认证信息
      this.token = data.token;
      this.user = data.user;
      
      // 计算过期时间（JWT通常有7天有效期）
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // 保存到本地存储
      this.saveAuthToStorage();

      // 设置token刷新
      this.setupTokenRefresh();

      // 触发认证成功事件
      this.emitAuthEvent('AUTH_SUCCESS', { user: this.user, token: this.token });

      return {
        success: true,
        token: this.token,
        user: this.user,
        expiresAt,
      };
    } catch (error) {
      console.error('Login failed:', error);
      
      // 触发认证失败事件
      const authError = this.createAuthError('SERVER_ERROR', 'Login failed', error);
      this.emitAuthEvent('AUTH_FAILED', { error: authError });
      
      return {
        success: false,
        error: authError.message,
      };
    }
  }

  // 登出
  async logout(): Promise<void> {
    try {
      // 如果有token，通知服务器登出
      if (this.token) {
        await fetch(`${WEB3_CONFIG.API_ENDPOINTS.BASE_URL}${WEB3_CONFIG.API_ENDPOINTS.AUTH.LOGOUT}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
        }).catch(error => {
          console.warn('Failed to notify server of logout:', error);
        });
      }
    } finally {
      // 清理本地状态
      this.clearAuth();
      
      // 触发登出事件
      this.emitAuthEvent('AUTH_LOGOUT', {});
    }
  }

  // 刷新token
  async refreshToken(): Promise<boolean> {
    if (!this.token) {
      return false;
    }

    try {
      const response = await fetch(`${WEB3_CONFIG.API_ENDPOINTS.BASE_URL}${WEB3_CONFIG.API_ENDPOINTS.AUTH.REFRESH}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.token) {
        this.token = data.token;
        this.saveAuthToStorage();
        
        // 触发token刷新事件
        this.emitAuthEvent('TOKEN_REFRESHED', { token: this.token });
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      
      // token刷新失败，可能已过期，清理认证状态
      this.clearAuth();
      this.emitAuthEvent('AUTH_LOGOUT', {});
      
      return false;
    }
  }

  // 验证token
  async verifyToken(): Promise<boolean> {
    if (!this.token) {
      return false;
    }

    try {
      const response = await fetch(`${WEB3_CONFIG.API_ENDPOINTS.BASE_URL}${WEB3_CONFIG.API_ENDPOINTS.AUTH.VERIFY}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      
      if (data.success && data.user) {
        // 更新用户信息
        this.user = data.user;
        this.saveAuthToStorage();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to verify token:', error);
      return false;
    }
  }

  // 检查是否已认证
  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  // 获取当前用户
  getCurrentUser(): User | null {
    return this.user;
  }

  // 获取当前token
  getToken(): string | null {
    return this.token;
  }

  // 检查token是否有效
  isTokenValid(): boolean {
    if (!this.token) return false;

    try {
      // 简单的JWT解析（仅用于检查过期时间）
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      
      return payload.exp > now;
    } catch (error) {
      return false;
    }
  }

  // 获取token过期时间
  getTokenExpirationTime(): Date | null {
    if (!this.token) return null;

    try {
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      return new Date(payload.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  // 添加认证状态变化监听器
  onAuthStateChange(callback: (event: AuthStateChangeEvent) => void): () => void {
    this.eventListeners.push(callback);
    
    // 返回取消监听的函数
    return () => {
      const index = this.eventListeners.indexOf(callback);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  // 从本地存储加载认证信息
  private loadStoredAuth(): void {
    if (typeof window === 'undefined') return;

    try {
      const storedToken = localStorage.getItem(WEB3_CONFIG.AUTH_CONFIG.TOKEN_STORAGE_KEY);
      const storedUser = localStorage.getItem(WEB3_CONFIG.AUTH_CONFIG.USER_STORAGE_KEY);

      if (storedToken && storedUser) {
        this.token = storedToken;
        this.user = JSON.parse(storedUser);
        
        // 验证存储的token是否仍然有效
        if (!this.isTokenValid()) {
          this.clearAuth();
        }
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
      this.clearAuth();
    }
  }

  // 保存认证信息到本地存储
  private saveAuthToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      if (this.token) {
        localStorage.setItem(WEB3_CONFIG.AUTH_CONFIG.TOKEN_STORAGE_KEY, this.token);
      }
      
      if (this.user) {
        localStorage.setItem(WEB3_CONFIG.AUTH_CONFIG.USER_STORAGE_KEY, JSON.stringify(this.user));
      }
    } catch (error) {
      console.error('Failed to save auth to storage:', error);
    }
  }

  // 清理认证状态
  private clearAuth(): void {
    this.token = null;
    this.user = null;
    
    // 清理定时器
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    // 清理本地存储
    if (typeof window !== 'undefined') {
      localStorage.removeItem(WEB3_CONFIG.AUTH_CONFIG.TOKEN_STORAGE_KEY);
      localStorage.removeItem(WEB3_CONFIG.AUTH_CONFIG.USER_STORAGE_KEY);
      localStorage.removeItem(WEB3_CONFIG.AUTH_CONFIG.WALLET_STORAGE_KEY);
    }
  }

  // 设置token自动刷新
  private setupTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.token || !this.isTokenValid()) {
      return;
    }

    const expirationTime = this.getTokenExpirationTime();
    if (!expirationTime) return;

    // 在token过期前5分钟刷新
    const refreshTime = expirationTime.getTime() - Date.now() - WEB3_CONFIG.AUTH_CONFIG.TOKEN_REFRESH_BUFFER;
    
    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(async () => {
        const success = await this.refreshToken();
        if (success) {
          this.setupTokenRefresh(); // 设置下次刷新
        }
      }, refreshTime);
    }
  }

  // 创建认证错误
  private createAuthError(type: AuthError['type'], message: string, details?: any): AuthError {
    return {
      type,
      message,
      retryable: type === 'NETWORK_ERROR',
      details,
    };
  }

  // 触发认证事件
  private emitAuthEvent(type: AuthStateChangeEvent['type'], payload: AuthStateChangeEvent['payload']): void {
    const event: AuthStateChangeEvent = {
      type,
      payload,
      timestamp: new Date(),
    };

    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in auth event listener:', error);
      }
    });
  }

  // 清理资源
  destroy(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    this.eventListeners = [];
  }
}

// 创建全局认证服务实例
export const authService = new AuthService();