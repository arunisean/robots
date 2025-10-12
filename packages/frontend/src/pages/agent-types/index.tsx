import React, { useState } from 'react';
import { AgentCategory } from '@multi-agent-platform/shared';
import CategorySelector from '../../components/agent-types/CategorySelector';

export default function AgentTypesPage() {
  const [selectedCategory, setSelectedCategory] = useState<AgentCategory | undefined>();
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');

  const handleCategorySelect = (category: AgentCategory) => {
    console.log('Selected category:', category);
    setSelectedCategory(category);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面头部 */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {language === 'zh' ? 'Agent类型选择' : 'Agent Type Selection'}
            </h1>
            <p className="mt-2 text-gray-600">
              {language === 'zh' 
                ? '选择Agent类型来创建自动化工作流' 
                : 'Select agent types to create automation workflows'}
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

        {/* Category选择器 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <CategorySelector
            onSelect={handleCategorySelect}
            selectedCategory={selectedCategory}
            language={language}
          />
        </div>

        {/* 选中的Category信息 */}
        {selectedCategory && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {language === 'zh' ? '已选择' : 'Selected'}
            </h3>
            <p className="text-gray-600">
              {language === 'zh' ? '类别：' : 'Category: '}
              <span className="font-semibold text-blue-600">{selectedCategory}</span>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {language === 'zh' 
                ? '下一步：选择具体的Agent类型' 
                : 'Next: Select specific agent type'}
            </p>
          </div>
        )}

        {/* 开发信息 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">
            🚧 {language === 'zh' ? '开发中' : 'In Development'}
          </h4>
          <p className="text-sm text-blue-700">
            {language === 'zh' 
              ? 'CategorySelector组件已完成。下一步将开发TypeSelector组件来显示选中类别下的具体Agent类型。' 
              : 'CategorySelector component is complete. Next step: develop TypeSelector component to show specific agent types.'}
          </p>
        </div>
      </div>
    </div>
  );
}
