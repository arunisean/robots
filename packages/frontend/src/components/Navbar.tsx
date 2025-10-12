import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { WalletConnectButton } from './WalletConnectButton';
import { WalletStatus } from './WalletProvider';
import { useWallet } from './WalletProvider';

interface NavbarProps {
  className?: string;
}

export function Navbar({ className = '' }: NavbarProps) {
  const router = useRouter();
  const { wallet, auth, user } = useWallet();

  const navigation = [
    { name: 'Workflows', href: '/workflows', current: router.pathname.startsWith('/workflows') },
    { name: 'Executions', href: '/executions', current: router.pathname.startsWith('/executions') },
    { name: 'Agent Types', href: '/agent-types', current: router.pathname.startsWith('/agent-types') },
  ];

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <nav className={`bg-white shadow-sm border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and main navigation */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MA</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">Multi-Agent Platform</span>
            </Link>

            <div className="hidden md:flex space-x-6">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    item.current
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Wallet connection and user info */}
          <div className="flex items-center space-x-4">
            {/* Wallet status indicator */}
            <WalletStatus showDetails className="hidden sm:flex" />

            {/* User info when authenticated */}
            {auth.isAuthenticated && user && (
              <div className="flex items-center space-x-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-green-800">
                    {formatAddress(user.walletAddress)}
                  </span>
                  {user.profile?.displayName && (
                    <span className="text-xs text-green-600">
                      {user.profile.displayName}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Wallet connect button */}
            <WalletConnectButton
              size="sm"
              variant="outline"
              showBalance={false}
              autoLogin={true}
            />

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                type="button"
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                onClick={() => {
                  // TODO: Implement mobile menu toggle
                }}
              >
                <span className="sr-only">Open main menu</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile navigation menu */}
      <div className="md:hidden border-t border-gray-200">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                item.current
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
        
        {/* Mobile wallet status */}
        <div className="px-4 py-3 border-t border-gray-200">
          <WalletStatus showDetails className="mb-2" />
          {auth.isAuthenticated && user && (
            <div className="text-sm text-gray-600">
              Authenticated: {formatAddress(user.walletAddress)}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;