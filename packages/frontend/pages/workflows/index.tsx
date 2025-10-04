import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { workflowAuthAPI } from '../../lib/api-auth';
import { useWallet } from '../../contexts/WalletContext';
import { WalletConnection, AuthGuard } from '../../components/WalletConnection';

/**
 * Workflow list and dashboard page
 */
export default function WorkflowsPage() {
  const { auth, isAdmin } = useWallet();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Load workflows
  useEffect(() => {
    loadWorkflows();
  }, [statusFilter]);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: any = {};
      
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      
      if (searchTerm) {
        filters.search = searchTerm;
      }

      const response = await workflowAuthAPI.list(filters);
      setWorkflows(response.workflows || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadWorkflows();
  };

  const handleDelete = async (id: string, workflowName: string) => {
    if (!confirm(`Are you sure you want to delete "${workflowName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await workflowAuthAPI.delete(id);
      setWorkflows(workflows.filter(w => w.id !== id));
      // Show success message
      const successDiv = document.createElement('div');
      successDiv.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50';
      successDiv.textContent = 'Workflow deleted successfully';
      document.body.appendChild(successDiv);
      setTimeout(() => document.body.removeChild(successDiv), 3000);
    } catch (err: any) {
      // Show error message
      const errorDiv = document.createElement('div');
      errorDiv.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50';
      errorDiv.textContent = `Failed to delete workflow: ${err.message}`;
      document.body.appendChild(errorDiv);
      setTimeout(() => document.body.removeChild(errorDiv), 5000);
    }
  };

  // Check if user can delete a workflow
  const canDelete = (workflow: any): boolean => {
    // Admin can delete any workflow
    if (isAdmin()) return true;
    
    // User can delete their own workflows
    // Note: We assume the workflow belongs to the current user if it's in their list
    // The backend already filters workflows by ownership
    return true;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Workflows
                {isAdmin() && (
                  <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                    Admin View
                  </span>
                )}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {isAdmin() 
                  ? 'Manage and monitor all automation workflows' 
                  : 'Manage and monitor your automation workflows'
                }
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <WalletConnection showDetails={true} />
              <Link
                href="/workflows/new"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                + Create Workflow
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AuthGuard requireAuth={true} requireWallet={true}>
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search workflows..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading workflows...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <button
              onClick={loadWorkflows}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Workflows List */}
        {!loading && !error && (
          <>
            {workflows.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No workflows yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Get started by creating your first automation workflow
                </p>
                <Link
                  href="/workflows/new"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Create Your First Workflow
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {workflow.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                              workflow.status
                            )}`}
                          >
                            {workflow.status}
                          </span>
                          {isAdmin() && workflow.ownerId && (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                              Owner: {workflow.ownerId.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {workflow.description || 'No description'}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-4 py-4 border-t border-b border-gray-100">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {workflow.executionCount || 0}
                        </div>
                        <div className="text-xs text-gray-500">Executions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {workflow.successCount || 0}
                        </div>
                        <div className="text-xs text-gray-500">Success</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {workflow.failureCount || 0}
                        </div>
                        <div className="text-xs text-gray-500">Failed</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link
                        href={`/workflows/${workflow.id}`}
                        className="flex-1 px-3 py-2 text-center bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
                      >
                        View
                      </Link>
                      <Link
                        href={`/workflows/${workflow.id}/edit`}
                        className="flex-1 px-3 py-2 text-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition text-sm"
                      >
                        Edit
                      </Link>
                      {canDelete(workflow) && (
                        <button
                          onClick={() => handleDelete(workflow.id, workflow.name)}
                          className="px-3 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition text-sm"
                          title="Delete workflow"
                        >
                          Delete
                        </button>
                      )}
                    </div>

                    {/* Last Execution */}
                    {workflow.lastExecutedAt && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          Last run:{' '}
                          {new Date(workflow.lastExecutedAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        </AuthGuard>
      </div>
    </div>
  );
}
