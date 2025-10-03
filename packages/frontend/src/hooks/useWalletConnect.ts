import { useState, useEffect, useCallback, useRef } from 'react';
import { WalletType, WalletErrorType } from '../config/web3';
import { walletConnectionManager } from '../utils/walletConnection';
import { detectAvailableWallets, getRecommendedWallet } from '../utils/walletDetection';
import type { WalletInfo } from '../config/web3';
import type { 
  WalletState, 
  WalletConnectionResult, 
  WalletConnectOptions,
  UseWalletReturn,
  BalanceInfo,
  WalletEventType,
  WalletStateChangeEvent
} from '../types/web3';

const initialWalletState: WalletState = {
  isConnected: false,
  isConnecting: false,
  address: null,
  chainId: null,
  balance: null,
  provider: null,
  error: null,
};

export function useWalletConnect(): UseWalletReturn {
  const [wallet, setWallet] = useState<WalletState>(initialWalletState);
  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([]);
  const eventListenersRef = useRef<Map<WalletEventType, Set<Function>>>(new Map());
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化
  useEffect(() => {
    initializeWallet();
    setupWalletEventHandlers();
    
    return () => {
      cleanup();
    };
  }, []);

  // 初始化钱包
  const initializeWallet = useCallback(async () => {
    try {
      // 检测可用钱包
      const wallets = await detectAvailableWallets();
      setAvailableWallets(wallets);

      // 尝试自动连接（如果之前已连接）
      await attemptAutoConnect();
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
    }
  }, []);

  // 尝试自动连接
  const attemptAutoConnect = useCallback(async () => {
    try {
      const isConnected = await walletConnectionManager.isConnected();
      if (isConnected) {
        const address = await walletConnectionManager.getCurrentAccount();
        const chainId = await walletConnectionManager.getCurrentChainId();
        
        if (address && chainId) {
          setWallet(prev => ({
            ...prev,
            isConnected: true,
            address,
            chainId,
            provider: walletConnectionManager['provider'],
          }));

          // 获取余额
          updateBalance(address);
        }
      }
    } catch (error) {
      console.error('Auto connect failed:', error);
    }
  }, []);

  // 连接钱包
  const connect = useCallback(async (options?: WalletConnectOptions): Promise<WalletConnectionResult> => {
    if (wallet.isConnecting) {
      return { success: false, error: { type: WalletErrorType.UNKNOWN_ERROR, message: 'Connection already in progress', retryable: false } };
    }

    setWallet(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // 确定要连接的钱包类型
      const walletType = options?.type || await getRecommendedWallet();
      
      // 执行连接
      const result = await walletConnectionManager.connect(walletType, options?.chainId);

      if (result.success && result.address && result.chainId) {
        setWallet(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          address: result.address!,
          chainId: result.chainId!,
          provider: result.provider || null,
          error: null,
        }));

        // 获取余额
        updateBalance(result.address);

        // 重置重连计数
        reconnectAttemptsRef.current = 0;

        // 触发连接事件
        emitWalletEvent('WALLET_CONNECTED', {
          address: result.address,
          chainId: result.chainId,
        });

        return result;
      } else {
        setWallet(prev => ({
          ...prev,
          isConnecting: false,
          error: result.error || null,
        }));

        return result;
      }
    } catch (error: any) {
      const walletError = {
        type: WalletErrorType.UNKNOWN_ERROR,
        message: error.message || 'Connection failed',
        retryable: true,
      };

      setWallet(prev => ({
        ...prev,
        isConnecting: false,
        error: walletError,
      }));

      return { success: false, error: walletError };
    }
  }, [wallet.isConnecting]);

  // 断开连接
  const disconnect = useCallback(async (): Promise<void> => {
    try {
      await walletConnectionManager.disconnect();
      
      const previousAddress = wallet.address;
      const previousChainId = wallet.chainId;

      setWallet(initialWalletState);

      // 清理重连定时器
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      // 触发断开连接事件
      emitWalletEvent('WALLET_DISCONNECTED', {
        previousAddress,
        previousChainId,
      });
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  }, [wallet.address, wallet.chainId]);

  // 切换网络
  const switchNetwork = useCallback(async (chainId: number): Promise<boolean> => {
    if (!wallet.isConnected) {
      return false;
    }

    try {
      const success = await walletConnectionManager.switchNetwork(chainId);
      
      if (success) {
        setWallet(prev => ({ ...prev, chainId }));
        
        // 触发网络切换事件
        emitWalletEvent('CHAIN_CHANGED', {
          chainId,
          previousChainId: wallet.chainId,
        });
      }

      return success;
    } catch (error) {
      console.error('Switch network failed:', error);
      return false;
    }
  }, [wallet.isConnected, wallet.chainId]);

  // 签名消息
  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!wallet.isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      return await walletConnectionManager.signMessage(message);
    } catch (error: any) {
      console.error('Sign message failed:', error);
      throw error;
    }
  }, [wallet.isConnected]);

  // 检查钱包是否支持
  const isSupported = useCallback((walletType: WalletType): boolean => {
    return availableWallets.some(w => w.type === walletType && w.installed);
  }, [availableWallets]);

  // 获取余额
  const getBalance = useCallback(async (): Promise<BalanceInfo | null> => {
    if (!wallet.address) return null;

    try {
      const balance = await walletConnectionManager.getBalance(wallet.address);
      
      if (balance) {
        setWallet(prev => ({ ...prev, balance: balance.formatted }));
      }

      return balance;
    } catch (error) {
      console.error('Get balance failed:', error);
      return null;
    }
  }, [wallet.address]);

  // 更新余额
  const updateBalance = useCallback(async (address: string) => {
    try {
      const balance = await walletConnectionManager.getBalance(address);
      if (balance) {
        setWallet(prev => ({ ...prev, balance: balance.formatted }));
      }
    } catch (error) {
      console.error('Update balance failed:', error);
    }
  }, []);

  // 添加事件监听器
  const addEventListener = useCallback((type: WalletEventType, handler: Function): void => {
    if (!eventListenersRef.current.has(type)) {
      eventListenersRef.current.set(type, new Set());
    }
    eventListenersRef.current.get(type)!.add(handler);
  }, []);

  // 移除事件监听器
  const removeEventListener = useCallback((type: WalletEventType, handler: Function): void => {
    const handlers = eventListenersRef.current.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }, []);

  // 触发钱包事件
  const emitWalletEvent = useCallback((type: WalletStateChangeEvent['type'], payload: WalletStateChangeEvent['payload']) => {
    const event: WalletStateChangeEvent = {
      type,
      payload,
      timestamp: new Date(),
    };

    // 触发内部事件监听器
    const handlers = eventListenersRef.current.get(type as WalletEventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('Error in wallet event handler:', error);
        }
      });
    }
  }, []);

  // 设置钱包事件处理器
  const setupWalletEventHandlers = useCallback(() => {
    walletConnectionManager.setEventHandlers({
      onAccountsChanged: (accounts: string[]) => {
        const newAddress = accounts.length > 0 ? accounts[0] : null;
        const previousAddress = wallet.address;

        if (newAddress !== previousAddress) {
          setWallet(prev => ({ 
            ...prev, 
            address: newAddress,
            isConnected: !!newAddress,
          }));

          if (newAddress) {
            updateBalance(newAddress);
            emitWalletEvent('ACCOUNT_CHANGED', {
              address: newAddress,
              previousAddress,
            });
          } else {
            emitWalletEvent('WALLET_DISCONNECTED', {
              previousAddress,
            });
          }
        }
      },

      onChainChanged: (chainId: string) => {
        const newChainId = parseInt(chainId, 16);
        const previousChainId = wallet.chainId;

        if (newChainId !== previousChainId) {
          setWallet(prev => ({ ...prev, chainId: newChainId }));
          
          emitWalletEvent('CHAIN_CHANGED', {
            chainId: newChainId,
            previousChainId,
          });

          // 更新余额（新网络可能有不同余额）
          if (wallet.address) {
            updateBalance(wallet.address);
          }
        }
      },

      onConnect: (connectInfo: { chainId: string }) => {
        console.log('Wallet connected:', connectInfo);
      },

      onDisconnect: (error: { code: number; message: string }) => {
        console.log('Wallet disconnected:', error);
        
        // 如果是意外断开连接，尝试重连
        if (wallet.isConnected && error.code !== 0) {
          attemptReconnect();
        } else {
          setWallet(initialWalletState);
          emitWalletEvent('WALLET_DISCONNECTED', {});
        }
      },
    });
  }, [wallet.address, wallet.chainId, wallet.isConnected, updateBalance, emitWalletEvent]);

  // 尝试重连
  const attemptReconnect = useCallback(async () => {
    if (reconnectAttemptsRef.current >= 3) {
      console.log('Max reconnect attempts reached');
      setWallet(initialWalletState);
      return;
    }

    reconnectAttemptsRef.current++;
    
    console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/3)...`);

    reconnectTimerRef.current = setTimeout(async () => {
      try {
        const isConnected = await walletConnectionManager.isConnected();
        if (isConnected) {
          await attemptAutoConnect();
        } else {
          attemptReconnect();
        }
      } catch (error) {
        console.error('Reconnect failed:', error);
        attemptReconnect();
      }
    }, 2000 * reconnectAttemptsRef.current); // 递增延迟
  }, [attemptAutoConnect]);

  // 清理资源
  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    eventListenersRef.current.clear();
  }, []);

  return {
    wallet,
    connect,
    disconnect,
    switchNetwork,
    signMessage,
    isSupported,
    getBalance,
    addEventListener,
    removeEventListener,
  };
}