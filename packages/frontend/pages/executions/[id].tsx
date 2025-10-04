import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { executionAPI } from '../../lib/api';

/**
 * Execution detail page
 */
export default function ExecutionDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [execution, setExecution] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadExecution();
      loadResults();
    }
  }, [id]);

  const loadExecution = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await executionAPI.get(id as string);
      setExecution(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load execution');
    } finally {
      setLoading(false);
    }
  };

  const loadResults = async () => {
    try {
      const data = await executionAPI.getResults(id as string);
      setResults(data.results || data || []);
    } catch (err: any) {
      console.error('Failed to load results:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
      case 'skipped':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading execution...</p>
        </div>
      </div>
    );
  }

  if (error || !execution) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Execution not found'}</p>
          <Link
            href="/workflows"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Workflows
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href={`/workflows/${execution.workflowId}`}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Workflow
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Execution Details
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  ID: {execution.id}
                </p>
              </div>
            </div>
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                execution.status
              )}`}
            >
              {execution.status.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Execution Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Overview</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Start Time
                  </label>
                  <p className="text-gray-900">
                    {new Date(execution.startTime).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    End Time
                  </label>
                  <p className="text-gray-900">
                    {execution.endTime
                      ? new Date(execution.endTime).toLocaleString()
                      : 'In progress'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Duration
                  </label>
                  <p className="text-gray-900">
                    {execution.duration
                      ? `${(execution.duration / 1000).toFixed(2)}s`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Trigger Type
                  </label>
                  <p className="text-gray-900">{execution.triggerType}</p>
                </div>
              </div>

              {execution.error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
                  <h3 className="text-sm font-medium text-red-800 mb-2">
                    Error
                  </h3>
                  <p className="text-sm text-red-700">{execution.error}</p>
                </div>
              )}
            </div>

            {/* Agent Results */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Agent Results</h2>

              {results.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No agent results available
                </p>
              ) : (
                <div className="space-y-4">
                  {results.map((result, index) => (
                    <div
                      key={result.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      {/* Agent Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg font-semibold text-gray-700">
                            {index + 1}.
                          </span>
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {result.agentType}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {result.agentCategory}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded ${getStatusColor(
                            result.status
                          )}`}
                        >
                          {result.status}
                        </span>
                      </div>

                      {/* Timing */}
                      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                        <div>
                          <span className="text-gray-600">Duration: </span>
                          <span className="font-medium">
                            {result.duration
                              ? `${(result.duration / 1000).toFixed(2)}s`
                              : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Memory: </span>
                          <span className="font-medium">
                            {result.metrics?.memoryUsed
                              ? `${result.metrics.memoryUsed}MB`
                              : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Error */}
                      {result.error && (
                        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded">
                          <p className="text-sm text-red-700">{result.error}</p>
                        </div>
                      )}

                      {/* Output Data */}
                      {result.outputData && Object.keys(result.outputData).length > 0 && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                            View Output Data
                          </summary>
                          <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                            {JSON.stringify(result.outputData, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Metadata */}
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Summary</h2>
              <div className="space-y-4">
                <div>
                  <div className="text-3xl font-bold text-gray-900">
                    {results.length}
                  </div>
                  <div className="text-sm text-gray-500">Total Agents</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-600">
                    {results.filter((r) => r.status === 'success').length}
                  </div>
                  <div className="text-sm text-gray-500">Successful</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-red-600">
                    {results.filter((r) => r.status === 'failed').length}
                  </div>
                  <div className="text-sm text-gray-500">Failed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-600">
                    {results.filter((r) => r.status === 'skipped').length}
                  </div>
                  <div className="text-sm text-gray-500">Skipped</div>
                </div>
              </div>
            </div>

            {/* Metadata */}
            {execution.metadata && Object.keys(execution.metadata).length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Metadata</h2>
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                  {JSON.stringify(execution.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
