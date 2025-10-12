import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { AgentCategory } from '@multi-agent-platform/shared';
import { workflowAuthAPI } from '../../lib/api-auth';
import { useWallet } from '../../contexts/WalletContext';
import { WalletConnection, AuthGuard } from '../../components/WalletConnection';
import CategorySelector from '../src/components/agent-types/CategorySelector';
import TypeSelector from '../src/components/agent-types/TypeSelector';
import { NoCodeConfigPanel } from '../src/components/agent-config';

/**
 * Create new workflow page
 */
export default function NewWorkflowPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'basic' | 'agents'>('basic');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'draft',
  });

  const [agents, setAgents] = useState<any[]>([]);
  
  // Agent selection state
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AgentCategory | undefined>();
  const [editingAgentIndex, setEditingAgentIndex] = useState<number | null>(null);
  
  // Agent configuration state
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [configuringAgentIndex, setConfiguringAgentIndex] = useState<number | null>(null);
  const [agentTypeDetails, setAgentTypeDetails] = useState<any>(null);

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

      const created = await workflowAuthAPI.create(workflow);
      router.push(`/workflows/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create workflow');
    } finally {
      setSaving(false);
    }
  };

  const openAgentSelector = (index: number | null = null) => {
    setEditingAgentIndex(index);
    setSelectedCategory(undefined);
    setShowAgentSelector(true);
  };

  const handleAgentTypeSelect = async (typeId: string) => {
    try {
      // Fetch agent type details
      const response = await fetch(`/api/agent-types/${typeId}`);
      const data = await response.json();
      
      if (data.success) {
        const agentType = data.data;
        const newAgent = {
          id: `agent-${Date.now()}`,
          agentType: typeId,
          agentCategory: agentType.category.toLowerCase(),
          name: agentType.displayName.zh,
          config: agentType.defaultConfig || {},
          order: editingAgentIndex !== null ? editingAgentIndex : agents.length,
        };

        if (editingAgentIndex !== null) {
          // Update existing agent
          const updated = [...agents];
          updated[editingAgentIndex] = newAgent;
          setAgents(updated);
        } else {
          // Add new agent
          setAgents([...agents, newAgent]);
        }

        setShowAgentSelector(false);
        setSelectedCategory(undefined);
        setEditingAgentIndex(null);
      }
    } catch (err) {
      console.error('Failed to fetch agent type:', err);
      setError('Failed to load agent type details');
    }
  };

  const removeAgent = (index: number) => {
    setAgents(agents.filter((_, i) => i !== index));
  };

  const updateAgent = (index: number, field: string, value: any) => {
    const updated = [...agents];
    updated[index] = { ...updated[index], [field]: value };
    setAgents(updated);
  };

  const moveAgent = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === agents.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...agents];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    updated.forEach((agent, i) => {
      agent.order = i;
    });
    setAgents(updated);
  };

  // Open config panel for agent
  const openConfigPanel = async (index: number) => {
    const agent = agents[index];
    try {
      // Fetch agent type details including schema
      const response = await fetch(`/api/agent-types/${agent.agentType}`);
      const data = await response.json();
      
      if (data.success) {
        setAgentTypeDetails(data.data);
        setConfiguringAgentIndex(index);
        setShowConfigPanel(true);
      } else {
        setError('Failed to load agent type details');
      }
    } catch (err) {
      console.error('Failed to fetch agent type details:', err);
      setError('Failed to load agent type details');
    }
  };

  // Save agent configuration
  const handleConfigSave = (config: Record<string, any>) => {
    if (configuringAgentIndex !== null) {
      const updated = [...agents];
      updated[configuringAgentIndex] = {
        ...updated[configuringAgentIndex],
        config,
      };
      setAgents(updated);
    }
    setShowConfigPanel(false);
    setConfiguringAgentIndex(null);
    setAgentTypeDetails(null);
  };

  // Cancel agent configuration
  const handleConfigCancel = () => {
    setShowConfigPanel(false);
    setConfiguringAgentIndex(null);
    setAgentTypeDetails(null);
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
            
            {/* 钱包连接状态 */}
            <WalletConnection showDetails={true} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AuthGuard requireAuth={true} requireWallet={true}>
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
                onClick={() => openAgentSelector(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                + Add Agent
              </button>
            </div>

            {agents.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Agents Yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Add agents to build your automation workflow
                </p>
                <button
                  type="button"
                  onClick={() => openAgentSelector(null)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Add First Agent
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {agents.map((agent, index) => (
                  <div
                    key={agent.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full font-semibold">
                          {index + 1}
                        </span>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {agent.name || agent.agentType}
                          </h4>
                          <p className="text-sm text-gray-500 font-mono">
                            {agent.agentType}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Move buttons */}
                        <button
                          type="button"
                          onClick={() => moveAgent(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveAgent(index, 'down')}
                          disabled={index === agents.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          title="Move down"
                        >
                          ↓
                        </button>
                        {/* Configure button */}
                        <button
                          type="button"
                          onClick={() => openConfigPanel(index)}
                          className="px-3 py-1 text-sm text-green-600 hover:text-green-800 font-medium"
                        >
                          ⚙️ Configure
                        </button>
                        {/* Edit button */}
                        <button
                          type="button"
                          onClick={() => openAgentSelector(index)}
                          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                          Change
                        </button>
                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => removeAgent(index)}
                          className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Category badge */}
                    <div className="mb-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {agent.agentCategory.toUpperCase()}
                      </span>
                    </div>

                    {/* Config preview */}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                        View Configuration
                      </summary>
                      <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                        {JSON.stringify(agent.config, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            )}

            {agents.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  💡 Agents will be executed in the order shown above (1 → {agents.length}). 
                  Data flows from one agent to the next.
                </p>
              </div>
            )}
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
              disabled={saving || agents.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating...' : 'Create Workflow'}
            </button>
          </div>
        </form>
        </AuthGuard>
      </div>

      {/* Agent Selector Modal */}
      {showAgentSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingAgentIndex !== null ? 'Change Agent Type' : 'Select Agent Type'}
              </h2>
              <button
                onClick={() => {
                  setShowAgentSelector(false);
                  setSelectedCategory(undefined);
                  setEditingAgentIndex(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {!selectedCategory ? (
                <>
                  <CategorySelector
                    onSelect={setSelectedCategory}
                    selectedCategory={selectedCategory}
                    language="zh"
                  />
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => {
                        setShowAgentSelector(false);
                        setSelectedCategory(undefined);
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <button
                      onClick={() => setSelectedCategory(undefined)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      ← Back to Categories
                    </button>
                  </div>
                  <TypeSelector
                    category={selectedCategory}
                    onSelect={handleAgentTypeSelect}
                    language="zh"
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Agent Config Panel */}
      {showConfigPanel && agentTypeDetails && configuringAgentIndex !== null && (
        <NoCodeConfigPanel
          agentTypeId={agentTypeDetails.id}
          agentTypeName={agentTypeDetails.displayName.zh}
          configSchema={agentTypeDetails.configSchema}
          initialConfig={agents[configuringAgentIndex].config}
          onSave={handleConfigSave}
          onCancel={handleConfigCancel}
          language="zh"
        />
      )}
    </div>
  );
}
