import React from 'react';
import Link from 'next/link';
import { Layout } from '../src/components/Layout';

export default function Home() {
  return (
    <Layout 
      title="Web3 Trading Automation Platform"
      description="Automate your cryptocurrency trading with pre-configured strategy templates and Web3 authentication"
    >
      <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Web3 Trading Automation Platform
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Automate your cryptocurrency trading with pre-configured strategy templates
            </p>
            
            {/* Core Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-5xl mx-auto">
              <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Strategy Templates</h3>
                <p className="text-sm text-gray-600">
                  Pre-configured trading strategies including Grid Trading, Arbitrage, and Whale Tracking
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="text-4xl mb-4">🚀</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">One-Click Launch</h3>
                <p className="text-sm text-gray-600">
                  Start automated trading within minutes with minimal configuration required
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="text-4xl mb-4">🛡️</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Risk Controls</h3>
                <p className="text-sm text-gray-600">
                  Automated safety mechanisms including max loss limits and position size controls
                </p>
              </div>
            </div>

            {/* Quick start */}
            <div className="mt-12">
              <div className="p-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                  🚀 Get Started
                </h3>
                <p className="text-gray-700 mb-6">
                  Connect your Web3 wallet using the button in the top right corner, then browse our strategy templates
                </p>
                <div className="flex justify-center space-x-4 flex-wrap gap-3">
                  <Link
                    href="/strategies"
                    className="inline-flex items-center px-6 py-3 text-lg font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
                  >
                    📊 Browse Strategies
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center px-6 py-3 text-lg font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    📈 My Dashboard
                  </Link>
                </div>
              </div>
            </div>

            {/* Features introduction */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Web3 Authentication</h3>
                <p className="text-gray-600">Secure identity authentication using Ethereum wallets like MetaMask</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Paper Trading</h3>
                <p className="text-gray-600">Test strategies with simulated funds before risking real capital</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Real-Time Monitoring</h3>
                <p className="text-gray-600">Live dashboard with P&L tracking, trade history, and performance metrics</p>
              </div>
            </div>
          </div>
        </div>
    </Layout>
  );
}
