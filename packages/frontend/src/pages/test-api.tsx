import React, { useState, useEffect } from 'react';
import { workflowAPI } from '../lib/api';

/**
 * API Test Page
 * Tests connection to backend API
 */
export default function TestAPIPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [healthData, setHealthData] = useState<any>(null);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      setStatus('loading');
      setError(null);

      // Test health endpoint
      const healthResponse = await fetch('http://localhost:3001/health');
      const health = await healthResponse.json();
      setHealthData(health);

      // Test workflows endpoint
      const workflowsData = await workflowAPI.list();
      setWorkflows(workflowsData.workflows || workflowsData.data?.workflows || []);

      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Failed to connect to backend');
    }
  };

  const createTestWorkflow = async () => {
    try {
      setCreating(true);
      setError(null);

      const workflow = {
        name: `Test Workflow ${Date.now()}`,
        description: 'Created from frontend test page',
        status: 'draft',
        version: '1.0.0',
        definition: {
          nodes: [
            {
              id: 'agent-1',
              agentType: 'work.web_scraper',
              agentCategory: 'work',
              config: {
                url: 'https://example.com',
              },
              order: 0,
            },
          ],
          connections: [],
        },
        settings: {
          maxConcurrentExecutions: 1,
          executionTimeout: 300,
          retryPolicy: {
            enabled: false,
            maxRetries: 3,
            backoffStrategy: 'exponential',
            backoffMs: 1000,
          },
          errorHandling: {
            strategy: 'stop',
            notifyOnError: true,
          },
          logging: {
            level: 'info',
            retention: 30,
            includeData: true,
          },
        },
        metadata: {
          tags: ['test'],
          category: 'general',
        },
      };

      const created = await workflowAPI.create(workflow);
      alert('Workflow created successfully! ID: ' + created.id);
      testConnection(); // Refresh list
    } catch (err: any) {
      setError(err.message || 'Failed to create workflow');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🧪 API Connection Test
        </h1>

        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          <div className="flex items-center space-x-3">
            <div
              className={`w-4 h-4 rounded-full ${
                status === 'loading'
                  ? 'bg-yellow-500 animate-pulse'
                  : status === 'success'
                  ? 'bg-green-500'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-lg font-medium">
              {status === 'loading'
                ? 'Connecting...'
                : status === 'success'
                ? 'Connected to Backend'
                : 'Connection Failed'}
            </span>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={testConnection}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry Connection
          </button>
        </div>

        {/* Health Check */}
        {healthData && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Health Check</h2>
            <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
              {JSON.stringify(healthData, null, 2)}
            </pre>
          </div>
        )}

        {/* Workflows */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Workflows</h2>
            <button
              onClick={createTestWorkflow}
              disabled={creating || status !== 'success'}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : '+ Create Test Workflow'}
            </button>
          </div>

          {workflows.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No workflows found. Create one to test!
            </p>
          ) : (
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="border border-gray-200 rounded p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {workflow.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {workflow.description || 'No description'}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                      {workflow.status}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    ID: {workflow.id}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* API Endpoints */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Available Endpoints</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-mono">
                GET
              </span>
              <code className="text-gray-700">http://localhost:3001/health</code>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-mono">
                GET
              </span>
              <code className="text-gray-700">
                http://localhost:3001/api/public/workflows
              </code>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-mono">
                POST
              </span>
              <code className="text-gray-700">
                http://localhost:3001/api/public/workflows
              </code>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded font-mono">
                WS
              </span>
              <code className="text-gray-700">
                ws://localhost:3001/api/ws
              </code>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 text-center">
          <a
            href="/workflows"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go to Workflows Page →
          </a>
        </div>
      </div>
    </div>
  );
}
