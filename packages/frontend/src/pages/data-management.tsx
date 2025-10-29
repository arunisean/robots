import { useState, useEffect } from 'react';
import { dataAdminAPI } from '../services/dataAPI';
import type { HistoricalDataset, MarketType } from '@multi-agent-platform/shared';

export default function DataManagementPage() {
  const [datasets, setDatasets] = useState<HistoricalDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMarketType, setFilterMarketType] = useState<MarketType | ''>('');
  const [filterSymbol, setFilterSymbol] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'size' | 'symbol'>('date');

  useEffect(() => {
    loadDatasets();
  }, [filterMarketType]);

  const loadDatasets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dataAdminAPI.listDatasets(
        filterMarketType ? { marketType: filterMarketType as MarketType } : undefined
      );
      setDatasets(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load datasets');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, symbol: string) => {
    if (!confirm(`Delete dataset for ${symbol}?`)) return;

    try {
      await dataAdminAPI.deleteDataset(id);
      setDatasets(prev => prev.filter(d => d.id !== id));
      alert('Dataset deleted successfully');
    } catch (err: any) {
      alert(`Failed to delete: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleVerify = async (id: string) => {
    try {
      const result = await dataAdminAPI.verifyDataset(id);
      alert(`Verification ${result.isValid ? 'passed' : 'failed'}!\n${result.issues.length} issues found.`);
    } catch (err: any) {
      alert(`Verification failed: ${err.response?.data?.message || err.message}`);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  // Filter and sort datasets
  const filteredDatasets = datasets
    .filter(d => !filterSymbol || d.symbol.toLowerCase().includes(filterSymbol.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime();
        case 'size':
          return b.fileSize - a.fileSize;
        case 'symbol':
          return a.symbol.localeCompare(b.symbol);
        default:
          return 0;
      }
    });

  const totalSize = datasets.reduce((sum, d) => sum + d.fileSize, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">Data Management</h1>
              <p className="text-gray-600 mt-1">
                {datasets.length} datasets • {formatBytes(totalSize)} total
              </p>
            </div>
            <button
              onClick={loadDatasets}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Refresh
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Filters */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Market Type
              </label>
              <select
                value={filterMarketType}
                onChange={(e) => setFilterMarketType(e.target.value as MarketType | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="spot">Spot</option>
                <option value="futures-um">Futures-UM</option>
                <option value="futures-cm">Futures-CM</option>
                <option value="options">Options</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Symbol
              </label>
              <input
                type="text"
                value={filterSymbol}
                onChange={(e) => setFilterSymbol(e.target.value)}
                placeholder="Search symbol..."
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Date</option>
                <option value="size">Size</option>
                <option value="symbol">Symbol</option>
              </select>
            </div>
          </div>

          {/* Datasets Table */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading datasets...</div>
          ) : filteredDatasets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No datasets found. Start by downloading some data!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Market</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interval</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Range</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data Points</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Downloaded</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDatasets.map((dataset) => (
                    <tr key={dataset.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{dataset.symbol}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                          {dataset.marketType}
                        </span>
                      </td>
                      <td className="px-4 py-3">{dataset.interval}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(dataset.startDate)} - {formatDate(dataset.endDate)}
                      </td>
                      <td className="px-4 py-3 text-sm">{dataset.dataPoints.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">{formatBytes(dataset.fileSize)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(dataset.downloadedAt)}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => handleVerify(dataset.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Verify
                        </button>
                        <button
                          onClick={() => handleDelete(dataset.id, dataset.symbol)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
