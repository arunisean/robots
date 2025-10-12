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
}

const COMPLEXITY_INFO = {
  easy: {
    label: { zh: 'Easy', en: 'Easy' },
    color: 'text-green-600 bg-green-100',
    icon: '🟢'
  },
  medium: {
    label: { zh: 'Medium', en: 'Medium' },
    color: 'text-yellow-600 bg-yellow-100',
    icon: '🟡'
  },
  hard: {
    label: { zh: 'Hard', en: 'Hard' },
    color: 'text-red-600 bg-red-100',
    icon: '🔴'
  }
};

const STATUS_INFO = {
  stable: { label: { zh: 'Stable', en: 'Stable' }, color: 'text-green-600' },
  beta: { label: { zh: 'Beta', en: 'Beta' }, color: 'text-blue-600' },
  experimental: { label: { zh: 'Experimental', en: 'Experimental' }, color: 'text-purple-600' },
  deprecated: { label: { zh: 'Deprecated', en: 'Deprecated' }, color: 'text-gray-600' }
};

export const TypeSelector: React.FC<TypeSelectorProps> = ({
  category,
  onSelect,
  selectedTypeId
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
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        type.name.toLowerCase().includes(query) ||
        type.displayName.en.toLowerCase().includes(query) ||
        type.displayName.en.toLowerCase().includes(query) ||
        type.description.toLowerCase().includes(query) ||
        type.tags.some(tag => tag.toLowerCase().includes(query));
      
      if (!matchesSearch) return false;
    }

    // Complexity filter
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
          No Types Available
        </h3>
        <p className="text-gray-600">
          No agent types available in this category yet
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Search and filter bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Search box */}
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search agent types..."
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

        {/* Complexity filter */}
        <div className="sm:w-48">
          <select
            value={filterComplexity}
            onChange={(e) => setFilterComplexity(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Levels</option>
            <option value="easy">{COMPLEXITY_INFO.easy.label.en}</option>
            <option value="medium">{COMPLEXITY_INFO.medium.label.en}</option>
            <option value="hard">{COMPLEXITY_INFO.hard.label.en}</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-gray-600">
        Found {filteredTypes.length} agent types
      </div>

      {/* Agent types grid */}
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
              {/* Icon and status */}
              <div className="flex items-start justify-between mb-3">
                <div className="text-3xl">{type.icon}</div>
                <div className="flex flex-col items-end gap-1">
                  {/* Complexity label */}
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${complexityInfo.color}`}>
                    {complexityInfo.icon} {complexityInfo.label.en}
                  </span>
                  {/* Status label */}
                  {type.status !== 'stable' && (
                    <span className={`text-xs font-semibold ${statusInfo.color}`}>
                      {statusInfo.label.en}
                    </span>
                  )}
                </div>
              </div>

              {/* Name */}
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {type.displayName.en}
              </h3>

              {/* ID */}
              <div className="text-xs text-gray-500 mb-2 font-mono">
                {type.id}
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {type.description}
              </p>

              {/* Rating and popularity */}
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

              {/* Tags */}
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

              {/* Selected indicator */}
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

              {/* Unavailable overlay */}
              {!type.isAvailable && (
                <div className="absolute inset-0 bg-gray-900 bg-opacity-50 rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold">
                    Unavailable
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* No search results */}
      {filteredTypes.length === 0 && types.length > 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Matching Types
          </h3>
          <p className="text-gray-600">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
};

export default TypeSelector;
