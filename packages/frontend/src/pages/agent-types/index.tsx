import React, { useState } from 'react';
import { AgentCategory } from '@multi-agent-platform/shared';
import CategorySelector from '../../components/agent-types/CategorySelector';
import TypeSelector from '../../components/agent-types/TypeSelector';
import { Layout } from '../../components/Layout';
import { AuthGuard } from '../../components/WalletProvider';

export default function AgentTypesPage() {
  const [selectedCategory, setSelectedCategory] = useState<AgentCategory | undefined>();
  const [selectedTypeId, setSelectedTypeId] = useState<string | undefined>();

  const handleCategorySelect = (category: AgentCategory) => {
    console.log('Selected category:', category);
    setSelectedCategory(category);
    setSelectedTypeId(undefined); // Reset selected type
  };

  const handleTypeSelect = (typeId: string) => {
    console.log('Selected type:', typeId);
    setSelectedTypeId(typeId);
  };

  const handleBack = () => {
    setSelectedCategory(undefined);
    setSelectedTypeId(undefined);
  };

  return (
    <Layout title="Agent Types - Multi-Agent Platform" requireAuth={true}>
      <AuthGuard requireAuth={true} requireWallet={true}>
        <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Agent Type Selection
            </h1>
            <p className="mt-2 text-gray-600">
              Select agent types to create automation workflows
            </p>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        {selectedCategory && (
          <div className="mb-6 flex items-center text-sm">
            <button
              onClick={handleBack}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Categories
            </button>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-600">{selectedCategory}</span>
            {selectedTypeId && (
              <>
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-gray-900 font-medium">{selectedTypeId}</span>
              </>
            )}
          </div>
        )}

        {/* Category Selector */}
        {!selectedCategory && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <CategorySelector
              onSelect={handleCategorySelect}
              selectedCategory={selectedCategory}
            />
          </div>
        )}

        {/* Type Selector */}
        {selectedCategory && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Select Agent Type
              </h2>
              <p className="text-gray-600">
                Choose an agent type from the {selectedCategory} category
              </p>
            </div>
            
            <TypeSelector
              category={selectedCategory}
              onSelect={handleTypeSelect}
              selectedTypeId={selectedTypeId}
            />
          </div>
        )}

        {/* Selected Type Information */}
        {selectedTypeId && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ✅ Selected
            </h3>
            <div className="space-y-2">
              <p className="text-gray-600">
                Category: <span className="font-semibold text-blue-600">{selectedCategory}</span>
              </p>
              <p className="text-gray-600">
                Agent Type: <span className="font-semibold text-blue-600">{selectedTypeId}</span>
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Configure Agent
              </button>
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                View Details
              </button>
            </div>
          </div>
        )}

        {/* Development Information */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-green-900 mb-2">
            ✅ Completed
          </h4>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• CategorySelector component - Category selection</li>
            <li>• TypeSelector component - Type selection</li>
            <li>• Search and filter functionality</li>
            <li>• Responsive layout</li>
            <li>• Multi-language support</li>
          </ul>
          <p className="text-sm text-green-700 mt-2">
            Next: Develop No-Code configuration panel
          </p>
        </div>
        </div>
      </AuthGuard>
    </Layout>
  );
}
