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
}

const CATEGORY_INFO: Omit<CategoryInfo, 'count'>[] = [
  {
    category: AgentCategory.WORK,
    name: 'WORK',
    displayName: {
      zh: 'Data Collection',
      en: 'Data Collection'
    },
    description: 'Collect and gather data from various sources',
    icon: '📥',
    color: 'blue'
  },
  {
    category: AgentCategory.PROCESS,
    name: 'PROCESS',
    displayName: {
      zh: 'Data Processing',
      en: 'Data Processing'
    },
    description: 'Process, transform and analyze data',
    icon: '⚙️',
    color: 'purple'
  },
  {
    category: AgentCategory.PUBLISH,
    name: 'PUBLISH',
    displayName: {
      zh: 'Content Publishing',
      en: 'Content Publishing'
    },
    description: 'Publish and distribute processed content',
    icon: '📤',
    color: 'green'
  },
  {
    category: AgentCategory.VALIDATE,
    name: 'VALIDATE',
    displayName: {
      zh: 'Validation & Monitoring',
      en: 'Validation & Monitoring'
    },
    description: 'Validate quality and monitor performance',
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
  selectedCategory
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
      // Use default values
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
          Select Agent Category
        </h2>
        <p className="text-gray-600">
          Choose a category to view available agent types
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
              aria-label={`Select ${categoryInfo.displayName.en} category`}
              className={`
                relative p-6 rounded-lg border-2 cursor-pointer
                transition-all duration-200 transform hover:scale-105
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                ${isSelected ? colorClass.selected : `${colorClass.bg} ${colorClass.border}`}
              `}
              onClick={() => handleCategoryClick(categoryInfo.category)}
              onKeyDown={(e) => handleKeyDown(e, categoryInfo.category)}
            >
              {/* Available types count badge */}
              <div className={`
                absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-semibold
                ${colorClass.badge}
              `}>
                {categoryInfo.count}
              </div>

              {/* Icon */}
              <div className="text-4xl mb-3">
                {categoryInfo.icon}
              </div>

              {/* Name */}
              <h3 className={`text-lg font-bold mb-2 ${colorClass.text}`}>
                {categoryInfo.displayName.en}
              </h3>

              {/* Category code */}
              <div className="text-xs text-gray-500 mb-3 font-mono">
                {categoryInfo.name}
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 leading-relaxed">
                {categoryInfo.description}
              </p>

              {/* Selected indicator */}
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

      {/* Workflow explanation */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          💡 Workflow
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
          Agents work together in workflows following this sequence
        </p>
      </div>
    </div>
  );
};

export default CategorySelector;
