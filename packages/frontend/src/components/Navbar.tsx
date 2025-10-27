import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { WalletConnectButton } from './WalletConnectButton';
import { useWallet } from './WalletProvider';

interface NavbarProps {
  className?: string;
}

export function Navbar({ className = '' }: NavbarProps) {
  const router = useRouter();
  const { auth } = useWallet();

  const navigation = [
    { name: 'Home', href: '/', current: router.pathname === '/' },
    { name: 'Strategies', href: '/strategies', current: router.pathname.startsWith('/strategies') },
    { name: 'Dashboard', href: '/dashboard', current: router.pathname.startsWith('/dashboard'), requireAuth: true },
    { name: 'Help', href: '/help', current: router.pathname.startsWith('/help') },
  ];

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
              <span className="text-xl font-semibold text-gray-900">Trading Automation</span>
            </Link>

            <div className="flex space-x-6">
              {navigation.map((item) => {
                // Hide auth-required items if not authenticated
                if (item.requireAuth && !auth.auth.isAuthenticated) {
                  return (
                    <span
                      key={item.name}
                      className="px-3 py-2 rounded-md text-sm font-medium text-gray-400 cursor-not-allowed"
                      title="Connect wallet to access"
                    >
                      {item.name}
                    </span>
                  );
                }
                
                return (
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
                );
              })}
            </div>
          </div>

          {/* Wallet connection */}
          <div className="flex items-center">
            <WalletConnectButton
              size="sm"
              variant="outline"
              showBalance={false}
              autoLogin={true}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;