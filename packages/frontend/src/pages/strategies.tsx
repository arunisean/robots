/**
 * Strategies Page
 * Browse and configure trading strategy templates
 */

import { useState } from 'react';
import Head from 'next/head';
import { useStrategyTemplates } from '../hooks/useStrategyTemplates';
import { strategyTemplateAPI } from '../services/strategyAPI';
import { StrategyCard } from '../components/StrategyCard';
import { StrategyConfigModal } from '../components/StrategyConfigModal';
import type { StrategyTemplate, StrategyConfig } from '../types/strategy';

export default function StrategiesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<StrategyTemplate | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Fetch templates using React Query
  const { data, isLoading, error } = useStrategyTemplates();
  const templates = data?.data || [];

  const handleSelectTemplate = (template: StrategyTemplate) => {
    setSelectedTemplate(template);
    setShowConfig(true);
  };

  const handleLaunchStrategy = async (config: StrategyConfig) => {
    if (!selectedTemplate) return;

    await strategyTemplateAPI.instantiate(selectedTemplate.id, config);
    alert('Strategy launched successfully in paper trading mode!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading strategies...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error instanceof Error ? error.message : 'Failed to load strategies'}</p>
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
    <>
      <Head>
        <title>Trading Strategies | Web3 Trading Platform</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-3xl font-bold text-gray-900">Trading Strategies</h1>
            <p className="mt-2 text-gray-600">
              Choose from pre-built strategy templates and start automated trading
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Strategy Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <StrategyCard
                key={template.id}
                template={template}
                onSelect={handleSelectTemplate}
              />
            ))}
          </div>

          {/* Empty State */}
          {templates.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No strategy templates available</p>
            </div>
          )}
        </div>

        {/* Configuration Modal */}
        <StrategyConfigModal
          template={selectedTemplate}
          isOpen={showConfig}
          onClose={() => setShowConfig(false)}
          onLaunch={handleLaunchStrategy}
        />
      </div>
    </>
  );
}
