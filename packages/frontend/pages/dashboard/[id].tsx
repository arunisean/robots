/**
 * Strategy Instance Detail Page
 * View detailed information about a specific strategy instance
 */

import { useRouter } from 'next/router';
import Link from 'next/link';
import { useStrategyInstance, useStopStrategy, useStartStrategy } from '../../src/hooks/useStrategyInstances';
import { Layout } from '../../src/components/Layout';

export default function StrategyDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const { data, isLoading, error } = useStrategyInstance(id as string);
  const instance = data?.data;
  
  const stopStrategy = useStopStrategy();
  const startStrategy = useStartStrategy();

  const handleStop = async () => {
    if (!id || !confirm('Are you sure you want to stop this strategy?')) return;
    try {
      await stopStrategy.mutateAsync(id as string);
    } catch (error) {
      alert(`Failed to stop strategy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleStart = async () => {
    if (!id || !confirm('Are you sure you want to start this strategy?')) return;
    try {
      await startStrategy.mutateAsync(id as string);
    } catch (error) {
      alert(`Failed to start strategy: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      <Layout title="Strategy Details | Web3 Trading Platform">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading strategy details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !instance) {
    return (
      <Layout title="Strategy Not Found | Web3 Trading Platform">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">
              {error instanceof Error ? error.message : 'Strategy not found'}
            </p>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`${instance.name} | Web3 Trading Platform`}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <Link
              href="/dashboard"
              className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
            >
              ← Back to Dashboard
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{instance.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-block px-3 py-1 text-sm font-medium rounded ${getStatusColor(instance.status)}`}>
                    {instance.status}
                  </span>
                  {instance.paperTrading && (
                    <span className="inline-block px-3 py-1 text-sm font-medium rounded bg-blue-100 text-blue-800">
                      Paper Trading
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {instance.status === 'stopped' && (
                  <button
                    onClick={handleStart}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Start Strategy
                  </button>
                )}
                {instance.status === 'running' && (
                  <button
                    onClick={handleStop}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
                  >
                    Stop Strategy
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Performance Overview */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-500">Total Trades</p>
                <p className="text-3xl font-bold text-gray-900">{instance.totalTrades}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Win Rate</p>
                <p className="text-3xl font-bold text-blue-600">{instance.winRate}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total P&L</p>
                <p className={`text-3xl font-bold ${instance.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {instance.totalProfitLoss >= 0 ? '+' : ''}{instance.totalProfitLoss.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Max Drawdown</p>
                <p className="text-3xl font-bold text-red-600">{instance.maxDrawdown}%</p>
              </div>
            </div>
          </div>

          {/* Strategy Parameters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Strategy Parameters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(instance.parameters).map(([key, value]) => (
                <div key={key} className="border-b border-gray-200 pb-2">
                  <p className="text-sm text-gray-500">{key}</p>
                  <p className="text-lg font-medium text-gray-900">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Trade History Placeholder */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Trade History</h2>
            <div className="text-center py-8 text-gray-500">
              <p>No trades yet</p>
              <p className="text-sm mt-2">Trades will appear here once the strategy starts executing</p>
            </div>
          </div>

          {/* Metadata */}
          {instance.lastExecutedAt && (
            <div className="mt-6 text-sm text-gray-500">
              <p>Last executed: {new Date(instance.lastExecutedAt).toLocaleString()}</p>
              <p>Created: {new Date(instance.createdAt).toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
