import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { workflowAPI, executionAPI } from '../../lib/api';
import { WorkflowExecutionMonitor } from '../../components/WorkflowExecutionMonitor';
import { Layout } from '../../components/Layout';
import { AuthGuard } from '../../components/WalletProvider';

/**
 * Workflow detail page
 */
export default function WorkflowDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [workflow, setWorkflow] = useState<any>(null);
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);

  // Load workflow and executions
  useEffect(() => {
    if (id) {
      loadWorkflow();
      loadExecutions();
    }
  }, [id]);

  const loadWorkflow = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await workflowAPI.get(id as string);
      setWorkflow(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load workflow');
    } finally {
      setLoading(false);
    }
  };

  const loadExecutions = async () => {
    try {
      const data = await executionAPI.list({ workflowId: id as string, limit: 10 });
      setExecutions(data.executions || data || []);
    } catch (err: any) {
      console.error('Failed to load executions:', err);
    }
  };

  const handleExecute = async () => {
    try {
      setExecuting(true);
      const execution = await workflowAPI.execute(id as string);
      setActiveExecutionId(execution.id);
      loadExecutions();
    } catch (err: any) {
      alert('Failed to execute workflow: ' + err.message);
    } finally {
      setExecuting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <Layout title="Loading... - Multi-Agent Platform">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading workflow...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !workflow) {
    return (
      <Layout title="Error - Multi-Agent Platform">
        <div className="flex items-center justify-center py-12">
          <div className="bg-white rounded-lg shadow p-8 max-w-md">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error || 'Workflow not found'}</p>
            <Link
              href="/workflows"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Back to Workflows
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`${workflow.name} - Multi-Agent Platform`} requireAuth={true}>
      <AuthGuard requireAuth={true} requireWallet={true}>
        <div>
          {/* Header */}
          <div className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Link
                    href="/workflows"
                    className="text-gray-600 hover:text-gray-900"
                  >
                    ← Back
                  </Link>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      {workflow.name}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                      {workflow.description || 'No description'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      workflow.status
                    )}`}
                  >
                    {workflow.status}
                  </span>
                  <button
                    onClick={handleExecute}
                    disabled={executing}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {executing ? 'Executing...' : '▶️ Execute'}
                  </button>
                  <Link
                    href={`/workflows/${id}/edit`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Workflow Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Active Execution Monitor */}
                {activeExecutionId && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">
                      Active Execution
                    </h2>
                    <WorkflowExecutionMonitor
                      executionId={activeExecutionId}
                      onComplete={() => {
                        loadExecutions();
                        setActiveExecutionId(null);
                      }}
                      onError={(error) => {
                        alert('Execution failed: ' + error);
                        loadExecutions();
                      }}
                    />
                  </div>
                )}

                {/* Workflow Configuration */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">Configuration</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Version
                      </label>
                      <p className="text-gray-900">{workflow.version || '1.0.0'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Agents
                      </label>
                      <p className="text-gray-900">
                        {workflow.definition?.nodes?.length || 0} agents configured
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Created
                      </label>
                      <p className="text-gray-900">
                        {new Date(workflow.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Last Updated
                      </label>
                      <p className="text-gray-900">
                        {new Date(workflow.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Execution History */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Execution History</h2>
                    <button
                      onClick={loadExecutions}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Refresh
                    </button>
                  </div>

                  {executions.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No executions yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {executions.map((execution) => (
                        <div
                          key={execution.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                                execution.status
                              )}`}
                            >
                              {execution.status}
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(execution.startTime).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">
                              Duration:{' '}
                              {execution.duration
                                ? `${(execution.duration / 1000).toFixed(2)}s`
                                : 'N/A'}
                            </span>
                            <Link
                              href={`/executions/${execution.id}`}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              View Details →
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Stats */}
              <div className="space-y-6">
                {/* Statistics */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">Statistics</h2>
                  <div className="space-y-4">
                    <div className="border-b border-gray-100 pb-4">
                      <div className="text-3xl font-bold text-gray-900">
                        {workflow.executionCount || 0}
                      </div>
                      <div className="text-sm text-gray-500">Total Executions</div>
                    </div>
                    <div className="border-b border-gray-100 pb-4">
                      <div className="text-3xl font-bold text-green-600">
                        {workflow.successCount || 0}
                      </div>
                      <div className="text-sm text-gray-500">Successful</div>
                    </div>
                    <div className="border-b border-gray-100 pb-4">
                      <div className="text-3xl font-bold text-red-600">
                        {workflow.failureCount || 0}
                      </div>
                      <div className="text-sm text-gray-500">Failed</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-blue-600">
                        {workflow.avgExecutionTime
                          ? `${(workflow.avgExecutionTime / 1000).toFixed(2)}s`
                          : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">Avg Duration</div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                  <div className="space-y-2">
                    <button
                      onClick={handleExecute}
                      disabled={executing}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50"
                    >
                      Execute Now
                    </button>
                    <Link
                      href={`/workflows/${id}/edit`}
                      className="block w-full px-4 py-2 text-center bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                      Edit Workflow
                    </Link>
                    <button
                      onClick={() => {
                        if (confirm('Duplicate this workflow?')) {
                          // TODO: Implement duplicate
                          alert('Duplicate feature coming soon!');
                        }
                      }}
                      className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                    >
                      Duplicate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AuthGuard>
    </Layout>
  );
}
