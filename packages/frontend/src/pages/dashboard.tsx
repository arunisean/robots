/**
 * Dashboard Page
 * Monitor active trading strategies
 */

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useStrategyInstances, useStopStrategy, useDeleteStrategy } from '../hooks/useStrategyInstances';
import { AuthGuard } from '../components/WalletProvider';

export default function DashboardPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const { data, isLoading, error } = useStrategyInstances(
    statusFilter !== 'all' ? { status: statusFilter } : undefined
  );
  const instances = data?.data || [];
  
  const stopStrategy = useStopStrategy();
  const deleteStrategy = useDeleteStrategy();

  const handleStop = async (id: string) => {
    if (!confirm('Are you sure you want to stop this strategy?')) return;
    try {
      await stopStrategy.mutateAsync(id);
      alert('Strategy stopped successfully');
    } catch (error) {
      alert(`Failed to stop strategy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this strategy? This action cannot be undone.')) return;
    try {
      await deleteStrategy.mutateAsync(id);
      alert('Strategy deleted successfully');
    } catch (error) {
      alert(`Failed to delete strategy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800';
      case 'stopped': return 'bg-gray-100 text-gray-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error instanceof Error ? error.message : 'Failed to load dashboard'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard requireAuth={true} requireWallet={true}>
      <Head>
        <title>My Dashboard | Web3 Trading Platform</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Monitor and manage your active trading strategies
                </p>
              </div>
              <Link
                href="/strategies"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                + New Strategy
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="running">Running</option>
                <option value="stopped">Stopped</option>
                <option value="paused">Paused</option>
                <option value="error">Error</option>
              </select>
            </div>
          </div>

          {/* Strategies Grid */}
          {instances.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No strategies yet
              </h3>
              <p className="text-gray-600 mb-6">
                Get started by launching your first trading strategy
              </p>
              <Link
                href="/strategies"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Browse Strategies
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {instances.map((instance) => (
                <div
                  key={instance.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {instance.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusColor(instance.status)}`}>
                          {instance.status}
                        </span>
                        {instance.paperTrading && (
                          <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                            Paper Trading
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4 py-4 border-t border-b border-gray-100">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {instance.totalTrades}
                      </div>
                      <div className="text-xs text-gray-500">Trades</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {instance.winRate}%
                      </div>
                      <div className="text-xs text-gray-500">Win Rate</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${instance.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {instance.totalProfitLoss >= 0 ? '+' : ''}{instance.totalProfitLoss.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">P&L</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/${instance.id}`}
                      className="flex-1 px-3 py-2 text-center bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
                    >
                      View Details
                    </Link>
                    {instance.status === 'running' && (
                      <button
                        onClick={() => handleStop(instance.id)}
                        className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition text-sm"
                      >
                        Stop
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(instance.id)}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition text-sm"
                    >
                      Delete
                    </button>
                  </div>

                  {/* Last Execution */}
                  {instance.lastExecutedAt && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        Last run: {new Date(instance.lastExecutedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
