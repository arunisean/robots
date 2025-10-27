/**
 * Strategies Page
 * Browse and configure trading strategy templates
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import { useStrategyTemplates } from '../src/hooks/useStrategyTemplates';
import { strategyTemplateAPI } from '../src/services/strategyAPI';
import { StrategyCard } from '../src/components/StrategyCard';
import { StrategyConfigModal } from '../src/components/StrategyConfigModal';
import { Layout } from '../src/components/Layout';
import type { StrategyTemplate, StrategyConfig } from '../src/types/strategy';

export default function StrategiesPage() {
  const router = useRouter();
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
    setShowConfig(false);
    // Redirect to dashboard
    router.push('/dashboard');
  };

  return (
    <Layout title="Trading Strategies | Web3 Trading Platform">
      <div className="min-h-screen bg-gray-50">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading strategies...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-12">
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
        )}

        {!isLoading && !error && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* UPDATED VERSION - NO DUPLICATE HEADER */}
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

            {/* Configuration Modal */}
            <StrategyConfigModal
              template={selectedTemplate}
              isOpen={showConfig}
              onClose={() => setShowConfig(false)}
              onLaunch={handleLaunchStrategy}
            />
          </div>
        )}
      </div>
    </Layout>
  );
}
