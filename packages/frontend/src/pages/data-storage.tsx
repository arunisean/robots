import { useState, useEffect } from 'react';
import { dataAdminAPI } from '../services/dataAPI';
import type { StorageStats } from '@multi-agent-platform/shared';

export default function DataStoragePage() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dataAdminAPI.getStorageStats();
      setStats(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load storage stats');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  const getUsagePercentage = () => {
    if (!stats) return 0;
    const total = stats.totalSize + stats.availableSpace;
    return (stats.totalSize / total) * 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading storage statistics...</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error || 'Failed to load storage statistics'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Storage Statistics</h1>
          <p className="text-gray-600 mt-1">Overview of historical data storage</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Datasets</div>
            <div className="text-3xl font-bold text-blue-600">{stats.totalDatasets}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Size</div>
            <div className="text-3xl font-bold text-green-600">{formatBytes(stats.totalSize)}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Available Space</div>
            <div className="text-3xl font-bold text-purple-600">{formatBytes(stats.availableSpace)}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Usage</div>
            <div className="text-3xl font-bold text-orange-600">{getUsagePercentage().toFixed(1)}%</div>
          </div>
        </div>

        {/* Storage Usage Bar */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Storage Usage</h2>
          <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="absolute h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
              style={{ width: `${getUsagePercentage()}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Used: {formatBytes(stats.totalSize)}</span>
            <span>Available: {formatBytes(stats.availableSpace)}</span>
          </div>
        </div>

        {/* By Market Type */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">By Market Type</h2>
          <div className="space-y-4">
            {Object.entries(stats.byMarketType).map(([marketType, data]) => (
              <div key={marketType}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium capitalize">{marketType}</span>
                  <span className="text-sm text-gray-600">
                    {data.datasets} datasets • {formatBytes(data.size)}
                  </span>
                </div>
                <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="absolute h-full bg-blue-500"
                    style={{ width: `${(data.size / stats.totalSize) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Interval */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">By Time Interval</h2>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(stats.byInterval).map(([interval, data]) => (
              <div key={interval} className="border border-gray-200 rounded p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{interval}</span>
                  <span className="text-sm text-gray-600">{data.datasets} datasets</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">{formatBytes(data.size)}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {((data.size / stats.totalSize) * 100).toFixed(1)}% of total
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Data Coverage</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">Oldest Dataset</div>
              <div className="text-xl font-bold">{formatDate(stats.oldestDataset)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Newest Dataset</div>
              <div className="text-xl font-bold">{formatDate(stats.newestDataset)}</div>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mt-6 text-center">
          <button
            onClick={loadStats}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh Statistics
          </button>
        </div>
      </div>
    </div>
  );
}
