import React, { useState, useEffect } from 'react';
import { AgentCategory } from '@multi-agent-platform/shared';

interface AgentTypeSummary {
  id: string;
  name: string;
  displayName: {
    zh: string;
    en: string;
  };
  description: string;
  icon: string;
  category: AgentCategory;
  complexity: 'easy' | 'medium' | 'hard';
  rating: number;
  popularity: number;
  status: 'stable' | 'beta' | 'experimental' | 'deprecated';
  isAvailable: boolean;
  tags: string[];
}

interface TypeSelectorProps {
  category: AgentCategory;
  onSelect: (typeId: string) => void;
  selectedTypeId?: string;
  language?: 'zh' | 'en';
}

const COMPLEXITY_INFO = {
  easy: {
    label: { zh: '简单', en: 'Easy' },
    color: 'text-green-600 bg-green-100',
    icon: '🟢'
  },
  medium: {
    label: { zh: '中等', en: 'Medium' },
    color: 'text-yellow-600 bg-yellow-100',
    icon: '🟡'
  },
  hard: {
    label: { zh: '困难', en: 'Hard' },
    color: 'text-red-600 bg-red-100',
    icon: '🔴'
  }
};

const STATUS_INFO = {
  stable: { label: { zh: '稳定', en: 'Stable' }, color: 'text-green-600' },
  beta: { label: { zh: '测试', en: 'Beta' }, color: 'text-blue-600' },
  experimental: { label: { zh: '实验', en: 'Experimental' }, color: 'text-purple-600' },
  deprecated: { label: { zh: '已弃用', en: 'Deprecated' }, color: 'text-gray-600' }
};

export const TypeSelector: React.FC<TypeSelectorProps> = ({
  category,
  onSelect,
  selectedTypeId,
  language = 'en'
}) => {
  const [types, setTypes] = useState<AgentTypeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterComplexity, setFilterComplexity] = useState<string>('all');

  useEffect(() => {
    fetchTypes();
  }, [category]);

  const fetchTypes = async () => {
    setLoading(true);
    try {
      console.log(`Fetching agent types for category: ${category}`);
      const response = await fetch(`/api/agent-types/categories/${category}?summary=true`);
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        console.log(`Found ${data.data.length} agent types`);
        setTypes(data.data);
      } else {
        console.error('API returned success=false:', data);
      }
    } catch (error) {
      console.error('Failed to fetch agent types:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTypes = types.filter(type => {
    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        type.name.toLowerCase().includes(query) ||
        type.displayName.zh.toLowerCase().includes(query) ||
        type.displayName.en.toLowerCase().includes(query) ||
        type.description.toLowerCase().includes(query) ||
        type.tags.some(tag => tag.toLowerCase().includes(query));
      
      if (!matchesSearch) return false;
    }

    // 复杂度过滤
    if (filterComplexity !== 'all' && type.complexity !== filterComplexity) {
      return false;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (types.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📭</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {language === 'zh' ? '暂无可用类型' : 'No Types Available'}
        </h3>
        <p className="text-gray-600">
          {language === 'zh' 
            ? '此类别下暂时没有可用的Agent类型' 
            : 'No agent types available in this category yet'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 搜索和筛选栏 */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* 搜索框 */}
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder={language === 'zh' ? '搜索Agent类型...' : 'Search agent types...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* 复杂度筛选 */}
        <div className="sm:w-48">
          <select
            value={filterComplexity}
            onChange={(e) => setFilterComplexity(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">{language === 'zh' ? '所有难度' : 'All Levels'}</option>
            <option value="easy">{COMPLEXITY_INFO.easy.label[language]}</option>
            <option value="medium">{COMPLEXITY_INFO.medium.label[language]}</option>
            <option value="hard">{COMPLEXITY_INFO.hard.label[language]}</option>
          </select>
        </div>
      </div>

      {/* 结果统计 */}
      <div className="mb-4 text-sm text-gray-600">
        {language === 'zh' 
          ? `找到 ${filteredTypes.length} 个Agent类型` 
          : `Found ${filteredTypes.length} agent types`}
      </div>

      {/* Agent类型网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTypes.map((type) => {
          const isSelected = selectedTypeId === type.id;
          const complexityInfo = COMPLEXITY_INFO[type.complexity];
          const statusInfo = STATUS_INFO[type.status];

          return (
            <div
              key={type.id}
              role="button"
              tabIndex={0}
              className={`
                relative p-5 rounded-lg border-2 cursor-pointer
                transition-all duration-200 hover:shadow-lg
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 bg-white hover:border-blue-300'}
              `}
              onClick={() => onSelect(type.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(type.id);
                }
              }}
            >
              {/* 图标和状态 */}
              <div className="flex items-start justify-between mb-3">
                <div className="text-3xl">{type.icon}</div>
                <div className="flex flex-col items-end gap-1">
                  {/* 复杂度标签 */}
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${complexityInfo.color}`}>
                    {complexityInfo.icon} {complexityInfo.label[language]}
                  </span>
                  {/* 状态标签 */}
                  {type.status !== 'stable' && (
                    <span className={`text-xs font-semibold ${statusInfo.color}`}>
                      {statusInfo.label[language]}
                    </span>
                  )}
                </div>
              </div>

              {/* 名称 */}
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {type.displayName[language]}
              </h3>

              {/* ID */}
              <div className="text-xs text-gray-500 mb-2 font-mono">
                {type.id}
              </div>

              {/* 描述 */}
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {type.description}
              </p>

              {/* 评分和使用量 */}
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <div className="flex items-center">
                  <span className="text-yellow-500 mr-1">⭐</span>
                  <span>{type.rating.toFixed(1)}</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-1">👥</span>
                  <span>{type.popularity}</span>
                </div>
              </div>

              {/* 标签 */}
              {type.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {type.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                  {type.tags.length > 3 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                      +{type.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* 选中指示器 */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <svg 
                    className="w-6 h-6 text-blue-500"
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

              {/* 不可用遮罩 */}
              {!type.isAvailable && (
                <div className="absolute inset-0 bg-gray-900 bg-opacity-50 rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {language === 'zh' ? '暂不可用' : 'Unavailable'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 无搜索结果 */}
      {filteredTypes.length === 0 && types.length > 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {language === 'zh' ? '未找到匹配的类型' : 'No Matching Types'}
          </h3>
          <p className="text-gray-600">
            {language === 'zh' 
              ? '尝试调整搜索条件或筛选器' 
              : 'Try adjusting your search or filters'}
          </p>
        </div>
      )}
    </div>
  );
};

export default TypeSelector;
