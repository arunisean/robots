/**
 * Strategy Card Component
 * Displays a strategy template card with key information
 */

import React from 'react';
import type { StrategyTemplate } from '../types/strategy';

interface StrategyCardProps {
  template: StrategyTemplate;
  onSelect: (template: StrategyTemplate) => void;
}

export function StrategyCard({ template, onSelect }: StrategyCardProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'high':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div
      className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onSelect(template)}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-semibold text-gray-900 flex-1 pr-2">
            {template.name}
          </h3>
          <span
            className={`px-2 py-1 text-xs font-medium rounded whitespace-nowrap ${getDifficultyColor(
              template.difficulty
            )}`}
          >
            {template.difficulty}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-3 mb-4">
          {template.description}
        </p>

        {/* Performance Metrics */}
        {template.performanceMetrics && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <p className="text-xs text-gray-500">Return</p>
              <p
                className={`text-lg font-semibold ${
                  template.performanceMetrics.totalReturn >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {template.performanceMetrics.totalReturn >= 0 ? '+' : ''}
                {template.performanceMetrics.totalReturn}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Win Rate</p>
              <p className="text-lg font-semibold text-blue-600">
                {template.performanceMetrics.winRate}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Max Drawdown</p>
              <p className="text-lg font-semibold text-red-600">
                {template.performanceMetrics.maxDrawdown}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Sharpe Ratio</p>
              <p className="text-lg font-semibold text-purple-600">
                {template.performanceMetrics.sharpeRatio}
              </p>
            </div>
          </div>
        )}

        {/* Risk & Capital */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-500">Risk Level:</span>
            <span
              className={`font-medium ${getRiskColor(
                template.riskProfile.level
              )}`}
            >
              {template.riskProfile.level.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Min Capital:</span>
            <span className="font-medium text-gray-900">
              ${template.riskProfile.requiredCapital.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Usage Stats */}
        {(template.usageCount > 0 || template.activeUsers > 0) && (
          <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
            <span>👥 {template.activeUsers} active users</span>
            <span>📊 {template.usageCount} total uses</span>
          </div>
        )}

        {/* Action Button */}
        <button
          className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(template);
          }}
        >
          Configure & Launch
        </button>
      </div>
    </div>
  );
}
