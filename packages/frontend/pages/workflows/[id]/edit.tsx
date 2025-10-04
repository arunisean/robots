import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { workflowAPI } from '../../../lib/api';

/**
 * Edit workflow page
 */
export default function EditWorkflowPage() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'draft',
  });

  const [agents, setAgents] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      loadWorkflow();
    }
  }, [id]);

  const loadWorkflow = async () => {
    try {
      setLoading(true);
      const workflow = await workflowAPI.get(id as string);
      
      setFormData({
        name: workflow.name,
        description: workflow.description || '',
        status: workflow.status,
      });

      setAgents(workflow.definition?.nodes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load workflow');
    } finally {
      setLoading(false);
    }
  };

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

      const updates = {
        name: formData.name,
        description: formData.description,
        status: formData.status,
        definition: {
          nodes: agents,
          connections: agents.slice(0, -1).map((agent, index) => ({
            from: agent.id,
            to: agents[index + 1].id,
          })),
        },
      };

      await workflowAPI.update(id as string, updates);
      router.push(`/workflows/${id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update workflow');
    } finally {
      setSaving(false);
    }
  };

  const addAgent = () => {
    const newAgent = {
      id: `agent-${Date.now()}`,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading workflow...</p>
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
                href={`/workflows/${id}`}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Edit Workflow
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Update your workflow configuration
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
                  <option value="archived">Archived</option>
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
                        ID: {agent.id}
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
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4">
            <Link
              href={`/workflows/${id}`}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
