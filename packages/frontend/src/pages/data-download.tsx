import { useState } from 'react';
import { dataAdminAPI } from '../services/dataAPI';
import type { MarketType, KlineInterval } from '@multi-agent-platform/shared';

const MARKET_TYPES: MarketType[] = ['spot', 'futures-um', 'futures-cm', 'options'];
const INTERVALS: KlineInterval[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

export default function DataDownloadPage() {
  const [marketType, setMarketType] = useState<MarketType>('spot');
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['BTCUSDT']);
  const [selectedIntervals, setSelectedIntervals] = useState<KlineInterval[]>(['1h']);
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-01-31');
  const [verifyChecksum, setVerifyChecksum] = useState(true);
  const [maxConcurrent, setMaxConcurrent] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [loadingSymbols, setLoadingSymbols] = useState(false);

  // Load available symbols when market type changes
  const loadSymbols = async (market: MarketType) => {
    setLoadingSymbols(true);
    try {
      const symbols = await dataAdminAPI.listSymbols(market);
      setAvailableSymbols(symbols);
    } catch (err) {
      console.error('Failed to load symbols:', err);
    } finally {
      setLoadingSymbols(false);
    }
  };

  const handleMarketTypeChange = (market: MarketType) => {
    setMarketType(market);
    loadSymbols(market);
  };

  const toggleSymbol = (symbol: string) => {
    setSelectedSymbols(prev =>
      prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  const toggleInterval = (interval: KlineInterval) => {
    setSelectedIntervals(prev =>
      prev.includes(interval)
        ? prev.filter(i => i !== interval)
        : [...prev, interval]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const job = await dataAdminAPI.startDownload({
        marketType,
        symbols: selectedSymbols,
        intervals: selectedIntervals,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        dataType: 'klines',
        options: {
          verifyChecksum,
          overwriteExisting: false,
          maxConcurrentDownloads: maxConcurrent
        }
      });

      setJobId(job.id);
      alert(`Download started! Job ID: ${job.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to start download');
    } finally {
      setLoading(false);
    }
  };

  // Calculate estimated file count
  const estimateFileCount = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    return selectedSymbols.length * selectedIntervals.length * months;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold mb-2">Download Historical Data</h1>
          <p className="text-gray-600 mb-6">
            Download K-line data from Binance public data repository
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Market Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Market Type
              </label>
              <div className="grid grid-cols-4 gap-2">
                {MARKET_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleMarketTypeChange(type)}
                    className={`px-4 py-2 rounded border ${
                      marketType === type
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Symbols */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trading Pairs ({selectedSymbols.length} selected)
              </label>
              {loadingSymbols ? (
                <div className="text-gray-500">Loading symbols...</div>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded p-2">
                  {availableSymbols.map(symbol => (
                    <label key={symbol} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSymbols.includes(symbol)}
                        onChange={() => toggleSymbol(symbol)}
                        className="rounded"
                      />
                      <span className="text-sm">{symbol}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Intervals */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Intervals ({selectedIntervals.length} selected)
              </label>
              <div className="grid grid-cols-6 gap-2">
                {INTERVALS.map(interval => (
                  <label key={interval} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIntervals.includes(interval)}
                      onChange={() => toggleInterval(interval)}
                      className="rounded"
                    />
                    <span className="text-sm">{interval}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={verifyChecksum}
                  onChange={(e) => setVerifyChecksum(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Verify checksum (recommended)</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Concurrent Downloads: {maxConcurrent}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={maxConcurrent}
                  onChange={(e) => setMaxConcurrent(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Estimate */}
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <h3 className="font-medium text-blue-900 mb-2">Estimated Download</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p>Files: ~{estimateFileCount()}</p>
                <p>Size: ~{(estimateFileCount() * 50).toFixed(0)} MB</p>
                <p>Time: ~{Math.ceil(estimateFileCount() / maxConcurrent / 2)} minutes</p>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || selectedSymbols.length === 0 || selectedIntervals.length === 0}
              className="w-full bg-blue-500 text-white py-3 rounded font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Starting Download...' : 'Start Download'}
            </button>
          </form>

          {jobId && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded p-4">
              <h3 className="font-medium text-green-900 mb-2">Download Started!</h3>
              <p className="text-sm text-green-700">Job ID: {jobId}</p>
              <p className="text-sm text-green-700 mt-2">
                Check progress in the Download Progress page
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
