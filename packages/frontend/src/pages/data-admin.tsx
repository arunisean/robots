import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DataAdminPage() {
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if accessing from localhost
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    setIsLocalhost(isLocal);
    setChecking(false);
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Checking access...</div>
      </div>
    );
  }

  if (!isLocalhost) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="max-w-md bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            Data management features are only accessible from localhost for security reasons.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-left">
            <p className="text-sm text-yellow-800 font-medium mb-2">To access this page:</p>
            <ol className="text-sm text-yellow-700 list-decimal list-inside space-y-1">
              <li>Access the application from localhost</li>
              <li>Use URL: http://localhost:3000/data-admin</li>
              <li>Or use: http://127.0.0.1:3000/data-admin</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Data Administration</h1>
          <p className="text-gray-600">
            Manage historical market data for backtesting
          </p>
          <div className="mt-2 inline-block px-3 py-1 bg-green-100 text-green-800 text-sm rounded">
            ✓ Localhost Access Verified
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Download Data */}
          <Link href="/data-download">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-4xl mb-4">📥</div>
              <h2 className="text-xl font-bold mb-2">Download Data</h2>
              <p className="text-gray-600 text-sm">
                Download historical K-line data from Binance public repository
              </p>
              <div className="mt-4 text-blue-600 font-medium">
                Start Download →
              </div>
            </div>
          </Link>

          {/* Manage Datasets */}
          <Link href="/data-management">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-4xl mb-4">📊</div>
              <h2 className="text-xl font-bold mb-2">Manage Datasets</h2>
              <p className="text-gray-600 text-sm">
                View, verify, and delete downloaded datasets
              </p>
              <div className="mt-4 text-blue-600 font-medium">
                Manage Data →
              </div>
            </div>
          </Link>

          {/* Storage Stats */}
          <Link href="/data-storage">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-4xl mb-4">💾</div>
              <h2 className="text-xl font-bold mb-2">Storage Statistics</h2>
              <p className="text-gray-600 text-sm">
                View storage usage and data distribution
              </p>
              <div className="mt-4 text-blue-600 font-medium">
                View Stats →
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Quick Info</h2>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Supported Markets</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Spot Trading</li>
                <li>• USDT-Margined Futures</li>
                <li>• Coin-Margined Futures</li>
                <li>• Options</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Supported Intervals</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Minutes: 1m, 3m, 5m, 15m, 30m</li>
                <li>• Hours: 1h, 2h, 4h, 6h, 8h, 12h</li>
                <li>• Days: 1d, 3d</li>
                <li>• Weeks: 1w • Months: 1mo</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Documentation Link */}
        <div className="mt-6 text-center">
          <a
            href="https://github.com/binance/binance-public-data"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            📚 Binance Public Data Documentation →
          </a>
        </div>
      </div>
    </div>
  );
}
