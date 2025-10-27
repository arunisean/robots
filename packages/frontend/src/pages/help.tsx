/**
 * Help Page
 * Documentation and guides
 */

import Head from 'next/head';
import Link from 'next/link';

export default function HelpPage() {
  return (
    <>
      <Head>
        <title>Help | Web3 Trading Platform</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-3xl font-bold text-gray-900">Help & Documentation</h1>
            <p className="mt-2 text-gray-600">
              Learn how to use the Web3 Trading Automation Platform
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Getting Started */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Getting Started</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Connect Your Wallet</h3>
                <p className="text-gray-600">
                  Click the "Connect Wallet" button in the top right corner and connect your MetaMask or other Web3 wallet.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Browse Strategies</h3>
                <p className="text-gray-600">
                  Visit the <Link href="/strategies" className="text-blue-600 hover:underline">Strategies page</Link> to explore available trading strategy templates.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Configure & Launch</h3>
                <p className="text-gray-600">
                  Select a strategy, configure the parameters, and launch it in paper trading mode to test with virtual funds.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Monitor Performance</h3>
                <p className="text-gray-600">
                  Track your strategies on the <Link href="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link> with real-time updates.
                </p>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">What is paper trading?</h3>
                <p className="text-gray-600">
                  Paper trading allows you to test strategies with virtual funds before risking real capital. All trades are simulated.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">How do I switch to live trading?</h3>
                <p className="text-gray-600">
                  Live trading is not yet available. Currently, all strategies run in paper trading mode for safety.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">What strategies are available?</h3>
                <p className="text-gray-600">
                  We currently offer Grid Trading, with more strategies (Arbitrage, Whale Tracking) coming soon.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Is my wallet safe?</h3>
                <p className="text-gray-600">
                  Yes. We only use your wallet for authentication. We never request access to your funds or private keys.
                </p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Need More Help?</h2>
            <p className="text-gray-600 mb-4">
              If you have questions or need support, please reach out to us:
            </p>
            <div className="flex gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
              >
                GitHub
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                Twitter
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
