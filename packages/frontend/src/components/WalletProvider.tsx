import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useWalletConnect } from '../hooks/useWalletConnect';
import { useAuth } from '../hooks/useAuth';
import type { UseWalletReturn, UseAuthReturn, User } from '../types/web3';

// Wallet context interface
interface WalletContextValue {
  wallet: UseWalletReturn;
  auth: UseAuthReturn;
  user: User | null;
  isInitialized: boolean;
  error: string | null;
}

// Create context
const WalletContext = createContext<WalletContextValue | null>(null);

// Wallet provider props
interface WalletProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  supportedChains?: number[];
  onError?: (error: string) => void;
}

// Wallet provider component
export function WalletProvider({
  children,
  autoConnect = true,
  supportedChains = [1, 11155111], // Ethereum mainnet and Sepolia testnet
  onError,
}: WalletProviderProps) {
  const wallet = useWalletConnect();
  const auth = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoLoginAttemptedRef = React.useRef(false);

  // Initialize
  useEffect(() => {
    initializeProvider();
  }, []);

  // Listen to wallet connection state changes
  useEffect(() => {
    if (wallet.wallet.isConnected && wallet.wallet.address) {
      // Check if network is supported
      if (wallet.wallet.chainId && !supportedChains.includes(wallet.wallet.chainId)) {
        const errorMsg = `Unsupported network. Please switch to a supported network.`;
        setError(errorMsg);
        onError?.(errorMsg);
      } else {
        setError(null);
      }
    }
  }, [wallet.wallet.isConnected, wallet.wallet.address, wallet.wallet.chainId, supportedChains, onError]);

  // Listen to authentication state changes
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

  // Listen to wallet events
  useEffect(() => {
    const handleWalletError = (error: any) => {
      const errorMsg = error.message || 'Wallet operation failed';
      setError(errorMsg);
      onError?.(errorMsg);
    };

    // More wallet event listeners can be added here
    // wallet.addEventListener('error', handleWalletError);

    return () => {
      // wallet.removeEventListener('error', handleWalletError);
    };
  }, [wallet, onError]);

  // Initialize provider
  const initializeProvider = async () => {
    try {
      setIsInitialized(false);
      setError(null);

      // If auto-connect is enabled, try to restore previous connection
      if (autoConnect) {
        // Auto-connect logic can be added here
        // For example, check if there's previous connection info in local storage
      }

      setIsInitialized(true);
    } catch (error: any) {
      console.error('Failed to initialize wallet provider:', error);
      const errorMsg = error.message || 'Failed to initialize wallet provider';
      setError(errorMsg);
      onError?.(errorMsg);
      setIsInitialized(true); // Set as initialized even if failed
    }
  };

  // Context value
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

// Hook for using wallet context
export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  
  return context;
}

// Wallet status indicator component
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
        <span className="text-sm text-gray-600">Initializing...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span className="text-sm text-red-600">
          {showDetails ? error : 'Connection Error'}
        </span>
      </div>
    );
  }

  if (!wallet.wallet.isConnected) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <span className="text-sm text-gray-600">Not Connected</span>
      </div>
    );
  }

  if (!auth.auth.isAuthenticated) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
        <span className="text-sm text-yellow-600">Connected, Not Authenticated</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
      <span className="text-sm text-green-600">
        {showDetails && auth.auth.user ? 
          `Authenticated - ${auth.auth.user.walletAddress.slice(0, 6)}...${auth.auth.user.walletAddress.slice(-4)}` : 
          'Authenticated'
        }
      </span>
    </div>
  );
}

// Authentication guard component
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
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  if (requireWallet && !wallet.wallet.isConnected) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Wallet Required</h2>
          <p className="text-gray-600 mb-6">Please connect your wallet to access this page</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  if (requireAuth && !auth.auth.isAuthenticated) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please connect your wallet and sign in to access this page</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Network switcher component
interface NetworkSwitcherProps {
  className?: string;
  supportedChains?: number[];
}

export function NetworkSwitcher({ className = '', supportedChains = [1, 11155111] }: NetworkSwitcherProps) {
  const { wallet } = useWallet();
  const [isLoading, setIsLoading] = useState(false);

  const chainNames: Record<number, string> = {
    1: 'Ethereum Mainnet',
    11155111: 'Sepolia Testnet',
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
            Unsupported Network ({currentChainId})
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