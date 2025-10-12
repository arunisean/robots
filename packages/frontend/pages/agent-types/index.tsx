import React, { useState } from 'react';
import { AgentCategory } from '@multi-agent-platform/shared';
import CategorySelector from '../../src/components/agent-types/CategorySelector';
import TypeSelector from '../../src/components/agent-types/TypeSelector';
import Link from 'next/link';

export default function AgentTypesPage() {
  const [selectedCategory, setSelectedCategory] = useState<AgentCategory | undefined>();
  const [selectedTypeId, setSelectedTypeId] = useState<string | undefined>();
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');

  const handleCategorySelect = (category: AgentCategory) => {
    console.log('Selected category:', category);
    setSelectedCategory(category);
    setSelectedTypeId(undefined);
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面头部 */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-2 inline-block">
              ← {language === 'zh' ? '返回首页' : 'Back to Home'}
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              {language === 'zh' ? 'Agent类型库' : 'Agent Type Library'}
            </h1>
            <p className="mt-2 text-gray-600">
              {language === 'zh' 
                ? '浏览和选择Agent类型来构建自动化工作流' 
                : 'Browse and select agent types to build automation workflows'}
            </p>
          </div>

          {/* 语言切换 */}
          <button
            onClick={() => setLanguage(lang => lang === 'zh' ? 'en' : 'zh')}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {language === 'zh' ? 'English' : '中文'}
          </button>
        </div>

        {/* 面包屑导航 */}
        {selectedCategory && (
          <div className="mb-6 flex items-center text-sm">
            <button
              onClick={handleBack}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {language === 'zh' ? '← 返回类别选择' : '← Back to Categories'}
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

        {/* Category选择器 */}
        {!selectedCategory && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <CategorySelector
              onSelect={handleCategorySelect}
              selectedCategory={selectedCategory}
              language={language}
            />
          </div>
        )}

        {/* Type选择器 */}
        {selectedCategory && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {language === 'zh' ? '选择Agent类型' : 'Select Agent Type'}
              </h2>
              <p className="text-gray-600">
                {language === 'zh' 
                  ? `从${selectedCategory}类别中选择一个Agent类型` 
                  : `Choose an agent type from the ${selectedCategory} category`}
              </p>
            </div>
            
            <TypeSelector
              category={selectedCategory}
              onSelect={handleTypeSelect}
              selectedTypeId={selectedTypeId}
              language={language}
            />
          </div>
        )}

        {/* 选中的Type信息 */}
        {selectedTypeId && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {language === 'zh' ? '✅ 已选择' : '✅ Selected'}
            </h3>
            <div className="space-y-2">
              <p className="text-gray-600">
                {language === 'zh' ? '类别：' : 'Category: '}
                <span className="font-semibold text-blue-600">{selectedCategory}</span>
              </p>
              <p className="text-gray-600">
                {language === 'zh' ? 'Agent类型：' : 'Agent Type: '}
                <span className="font-semibold text-blue-600">{selectedTypeId}</span>
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <Link
                href={`/workflows/new?agentType=${selectedTypeId}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {language === 'zh' ? '使用此Agent创建工作流' : 'Create Workflow with this Agent'}
              </Link>
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                {language === 'zh' ? '查看详情' : 'View Details'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
