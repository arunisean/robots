import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useWallet } from '../contexts/WalletContext';
import { WalletConnection, WalletStatus, AuthGuard } from '../components/WalletConnection';

interface AgentStats {
  total: number;
  byCategory: {
    work: number;
    process: number;
    publish: number;
    validate: number;
  };
}

interface AgentTypeSummary {
  id: string;
  name: string;
  displayName: { zh: string; en: string };
  icon: string;
  category: string;
  complexity: string;
  rating: number;
  popularity: number;
}

export default function Home() {
  const { wallet, auth } = useWallet();
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [featuredAgents, setFeaturedAgents] = useState<AgentTypeSummary[]>([]);

  useEffect(() => {
    fetchStats();
    fetchFeaturedAgents();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/agent-types/statistics');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchFeaturedAgents = async () => {
    try {
      const response = await fetch('/api/agent-types?summary=true');
      const data = await response.json();
      if (data.success) {
        // Get top 6 agents by popularity
        const sorted = data.data.sort((a: AgentTypeSummary, b: AgentTypeSummary) => b.popularity - a.popularity);
        setFeaturedAgents(sorted.slice(0, 6));
      }
    } catch (error) {
      console.error('Failed to fetch featured agents:', error);
    }
  };

  return (
    <div>
      <Head>
        <title>Multi-Agent Automation Platform</title>
        <meta name="description" content="Decentralized agent orchestration system with Web3 identity authentication" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gray-50">
        {/* Top status bar */}
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-bold text-gray-900">
                  🤖 Multi-Agent Automation Platform
                </h1>
                <WalletStatus showDetails />
              </div>
              <WalletConnection showBalance showDetails />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Intelligent Agent Automation Platform
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              {stats ? `${stats.total} Agent Types` : 'Multiple Agent Types'} to build powerful automation workflows
            </p>
            
            {/* Platform statistics */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-4xl mx-auto">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-3xl font-bold text-blue-600">{stats.byCategory.work}</div>
                  <div className="text-sm text-blue-700 font-medium">Data Collection</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="text-3xl font-bold text-purple-600">{stats.byCategory.process}</div>
                  <div className="text-sm text-purple-700 font-medium">Data Processing</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-3xl font-bold text-green-600">{stats.byCategory.publish}</div>
                  <div className="text-sm text-green-700 font-medium">Content Publishing</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <div className="text-3xl font-bold text-orange-600">{stats.byCategory.validate}</div>
                  <div className="text-sm text-orange-700 font-medium">Quality Validation</div>
                </div>
              </div>
            )}

            {/* Featured agents showcase */}
            {featuredAgents.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">🔥 Popular Agents</h3>
                  <Link href="/agent-types" className="text-blue-600 hover:text-blue-800 font-medium">
                    View All →
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featuredAgents.map((agent) => (
                    <div key={agent.id} className="bg-white p-5 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-3xl">{agent.icon}</div>
                        <div className="flex items-center text-sm text-gray-500">
                          <span className="text-yellow-500 mr-1">⭐</span>
                          <span>{agent.rating}</span>
                        </div>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{agent.displayName.en}</h4>
                      <p className="text-xs text-gray-500 font-mono mb-2">{agent.id}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {agent.category.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">👥 {agent.popularity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick start */}
            <div className="mt-12">
              <AuthGuard 
                requireWallet={true} 
                requireAuth={true}
                fallback={
                  <div className="p-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                    <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                      🚀 Get Started
                    </h3>
                    <p className="text-gray-700 mb-6">
                      Connect your Web3 wallet to experience intelligent agent automation
                    </p>
                    <div className="flex justify-center space-x-4 flex-wrap gap-3">
                      <WalletConnection size="lg" />
                      <Link
                        href="/agent-types"
                        className="inline-flex items-center px-6 py-3 text-lg font-medium text-blue-600 bg-white border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        🤖 Browse Agents
                      </Link>
                      <Link
                        href="/workflows"
                        className="inline-flex items-center px-6 py-3 text-lg font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        📋 View Workflows
                      </Link>
                    </div>
                  </div>
                }
              >
                <div className="p-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                    ✨ Start Creating Your Automation Workflows
                  </h3>
                  <p className="text-gray-700 mb-6">
                    Select agent types, configure parameters, and build powerful automation processes
                  </p>
                  <div className="flex justify-center space-x-4 flex-wrap gap-3">
                    <Link href="/workflows/new" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg">
                      ➕ Create Workflow
                    </Link>
                    <Link href="/agent-types" className="bg-white hover:bg-gray-50 text-blue-600 border-2 border-blue-600 font-bold py-3 px-8 rounded-lg transition-colors">
                      🤖 Browse Agents
                    </Link>
                    <Link href="/workflows" className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-bold py-3 px-8 rounded-lg transition-colors">
                      📋 My Workflows
                    </Link>
                  </div>
                </div>
              </AuthGuard>
            </div>

            {/* Features introduction */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Decentralized Identity</h3>
                <p className="text-gray-600">Secure identity authentication based on Web3 wallets, no traditional username/password required</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Automated Workflows</h3>
                <p className="text-gray-600">Visual orchestration of agent workflows to achieve complex automation tasks</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Agent Marketplace</h3>
                <p className="text-gray-600">Rich collection of pre-built agent templates for quick deployment of various automation features</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}