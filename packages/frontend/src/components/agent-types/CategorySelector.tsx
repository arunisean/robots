import React, { useState, useEffect } from 'react';
import { AgentCategory } from '@multi-agent-platform/shared';

interface CategoryInfo {
  category: AgentCategory;
  name: string;
  displayName: {
    zh: string;
    en: string;
  };
  description: string;
  icon: string;
  color: string;
  count: number;
}

interface CategorySelectorProps {
  onSelect: (category: AgentCategory) => void;
  selectedCategory?: AgentCategory;
  language?: 'zh' | 'en';
}

const CATEGORY_INFO: Omit<CategoryInfo, 'count'>[] = [
  {
    category: AgentCategory.WORK,
    name: 'WORK',
    displayName: {
      zh: '数据收集',
      en: 'Data Collection'
    },
    description: '从各种数据源收集和采集数据',
    icon: '📥',
    color: 'blue'
  },
  {
    category: AgentCategory.PROCESS,
    name: 'PROCESS',
    displayName: {
      zh: '数据处理',
      en: 'Data Processing'
    },
    description: '处理、转换和分析数据',
    icon: '⚙️',
    color: 'purple'
  },
  {
    category: AgentCategory.PUBLISH,
    name: 'PUBLISH',
    displayName: {
      zh: '内容发布',
      en: 'Content Publishing'
    },
    description: '发布和分发处理后的内容',
    icon: '📤',
    color: 'green'
  },
  {
    category: AgentCategory.VALIDATE,
    name: 'VALIDATE',
    displayName: {
      zh: '验证监控',
      en: 'Validation & Monitoring'
    },
    description: '验证质量和监控性能',
    icon: '✅',
    color: 'orange'
  }
];

const COLOR_CLASSES = {
  blue: {
    bg: 'bg-blue-50 hover:bg-blue-100',
    border: 'border-blue-200 hover:border-blue-300',
    selected: 'border-blue-500 bg-blue-100',
    text: 'text-blue-700',
    badge: 'bg-blue-500 text-white'
  },
  purple: {
    bg: 'bg-purple-50 hover:bg-purple-100',
    border: 'border-purple-200 hover:border-purple-300',
    selected: 'border-purple-500 bg-purple-100',
    text: 'text-purple-700',
    badge: 'bg-purple-500 text-white'
  },
  green: {
    bg: 'bg-green-50 hover:bg-green-100',
    border: 'border-green-200 hover:border-green-300',
    selected: 'border-green-500 bg-green-100',
    text: 'text-green-700',
    badge: 'bg-green-500 text-white'
  },
  orange: {
    bg: 'bg-orange-50 hover:bg-orange-100',
    border: 'border-orange-200 hover:border-orange-300',
    selected: 'border-orange-500 bg-orange-100',
    text: 'text-orange-700',
    badge: 'bg-orange-500 text-white'
  }
};

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  onSelect,
  selectedCategory,
  language = 'zh'
}) => {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategoryCounts();
  }, []);

  const fetchCategoryCounts = async () => {
    try {
      const response = await fetch('/api/agent-types/statistics');
      const data = await response.json();
      
      if (data.success) {
        const stats = data.data;
        const categoriesWithCounts = CATEGORY_INFO.map(info => ({
          ...info,
          count: stats.byCategory[info.name.toLowerCase()] || 0
        }));
        setCategories(categoriesWithCounts);
      }
    } catch (error) {
      console.error('Failed to fetch category counts:', error);
      // 使用默认值
      setCategories(CATEGORY_INFO.map(info => ({ ...info, count: 0 })));
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (category: AgentCategory) => {
    onSelect(category);
  };

  const handleKeyDown = (e: React.KeyboardEvent, category: AgentCategory) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(category);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {language === 'zh' ? '选择Agent类型' : 'Select Agent Category'}
        </h2>
        <p className="text-gray-600">
          {language === 'zh' 
            ? '选择一个类别以查看可用的Agent类型' 
            : 'Choose a category to view available agent types'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((categoryInfo) => {
          const isSelected = selectedCategory === categoryInfo.category;
          const colorClass = COLOR_CLASSES[categoryInfo.color as keyof typeof COLOR_CLASSES];

          return (
            <div
              key={categoryInfo.category}
              role="button"
              tabIndex={0}
              aria-label={`Select ${categoryInfo.displayName[language]} category`}
              className={`
                relative p-6 rounded-lg border-2 cursor-pointer
                transition-all duration-200 transform hover:scale-105
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                ${isSelected ? colorClass.selected : `${colorClass.bg} ${colorClass.border}`}
              `}
              onClick={() => handleCategoryClick(categoryInfo.category)}
              onKeyDown={(e) => handleKeyDown(e, categoryInfo.category)}
            >
              {/* 可用类型数量徽章 */}
              <div className={`
                absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-semibold
                ${colorClass.badge}
              `}>
                {categoryInfo.count}
              </div>

              {/* 图标 */}
              <div className="text-4xl mb-3">
                {categoryInfo.icon}
              </div>

              {/* 名称 */}
              <h3 className={`text-lg font-bold mb-2 ${colorClass.text}`}>
                {categoryInfo.displayName[language]}
              </h3>

              {/* 英文名称 */}
              <div className="text-xs text-gray-500 mb-3 font-mono">
                {categoryInfo.name}
              </div>

              {/* 描述 */}
              <p className="text-sm text-gray-600 leading-relaxed">
                {categoryInfo.description}
              </p>

              {/* 选中指示器 */}
              {isSelected && (
                <div className="absolute bottom-3 right-3">
                  <svg 
                    className={`w-6 h-6 ${colorClass.text}`}
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 工作流程说明 */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          {language === 'zh' ? '💡 工作流程' : '💡 Workflow'}
        </h4>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span className="flex items-center">
            <span className="text-blue-500 font-semibold">WORK</span>
            <span className="mx-2">→</span>
          </span>
          <span className="flex items-center">
            <span className="text-purple-500 font-semibold">PROCESS</span>
            <span className="mx-2">→</span>
          </span>
          <span className="flex items-center">
            <span className="text-green-500 font-semibold">PUBLISH</span>
            <span className="mx-2">→</span>
          </span>
          <span className="text-orange-500 font-semibold">VALIDATE</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {language === 'zh' 
            ? 'Agent按照此顺序在工作流中协同工作' 
            : 'Agents work together in workflows following this sequence'}
        </p>
      </div>
    </div>
  );
};

export default CategorySelector;
