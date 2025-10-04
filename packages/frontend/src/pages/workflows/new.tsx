import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { workflowAPI } from '../../lib/api';

/**
 * Create new workflow page
 */
export default function NewWorkflowPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'draft',
  });

  const [agents, setAgents] = useState<any[]>([
    {
      id: 'agent-1',
      agentType: 'work',
      agentCategory: 'work',
      config: {},
      order: 0,
    },
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Workflow name is required');
      return;
    }

    if (agents.length === 0) {
      setError('At least one agent is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const workflow = {
        name: formData.name,
        description: formData.description,
        status: formData.status,
        version: '1.0.0',
        definition: {
          nodes: agents,
          connections: agents.slice(0, -1).map((agent, index) => ({
            from: agent.id,
            to: agents[index + 1].id,
          })),
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
          tags: [],
          category: 'general',
        },
      };

      const created = await workflowAPI.create(workflow);
      router.push(`/workflows/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create workflow');
    } finally {
      setSaving(false);
    }
  };

  const addAgent = () => {
    const newAgent = {
      id: `agent-${agents.length + 1}`,
      agentType: 'process',
      agentCategory: 'process',
      config: {},
      order: agents.length,
    };
    setAgents([...agents, newAgent]);
  };

  const removeAgent = (index: number) => {
    if (agents.length === 1) {
      setError('At least one agent is required');
      return;
    }
    setAgents(agents.filter((_, i) => i !== index));
  };

  const updateAgent = (index: number, field: string, value: any) => {
    const updated = [...agents];
    updated[index] = { ...updated[index], [field]: value };
    setAgents(updated);
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
                  Create New Workflow
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Configure your automation workflow
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workflow Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="My Automation Workflow"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe what this workflow does..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
            </div>
          </div>

          {/* Agents Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Agents</h2>
              <button
                type="button"
                onClick={addAgent}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                + Add Agent
              </button>
            </div>

            <div className="space-y-4">
              {agents.map((agent, index) => (
                <div
                  key={agent.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-semibold text-gray-700">
                        {index + 1}.
                      </span>
                      <div className="text-sm text-gray-500">
                        Order: {agent.order}
                      </div>
                    </div>
                    {agents.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAgent(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Agent Type
                      </label>
                      <input
                        type="text"
                        value={agent.agentType}
                        onChange={(e) =>
                          updateAgent(index, 'agentType', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., DataCollector"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <select
                        value={agent.agentCategory}
                        onChange={(e) =>
                          updateAgent(index, 'agentCategory', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="work">Work (Data Collection)</option>
                        <option value="process">Process (Transformation)</option>
                        <option value="publish">Publish (Distribution)</option>
                        <option value="validate">Validate (Quality Check)</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Configuration (JSON)
                    </label>
                    <textarea
                      value={JSON.stringify(agent.config, null, 2)}
                      onChange={(e) => {
                        try {
                          const config = JSON.parse(e.target.value);
                          updateAgent(index, 'config', config);
                        } catch (err) {
                          // Invalid JSON, ignore
                        }
                      }}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder='{"key": "value"}'
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                💡 Agents will be executed in the order shown above. Data flows
                from one agent to the next.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4">
            <Link
              href="/workflows"
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating...' : 'Create Workflow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
