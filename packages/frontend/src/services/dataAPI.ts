import axios from 'axios';
import type {
  DownloadRequest,
  DownloadJob,
  DownloadStatus,
  HistoricalDataset,
  PublicDatasetInfo,
  StorageStats,
  MarketType,
  KlineInterval
} from '@multi-agent-platform/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Admin API (localhost only)
const adminAPI = axios.create({
  baseURL: `${API_BASE}/api/admin/data`,
  timeout: 30000
});

// Public API (all users)
const publicAPI = axios.create({
  baseURL: `${API_BASE}/api/data`,
  timeout: 30000
});

/**
 * Admin Data API (localhost only)
 */
export const dataAdminAPI = {
  /**
   * Start data download
   */
  async startDownload(request: DownloadRequest): Promise<DownloadJob> {
    const response = await adminAPI.post('/download', request);
    return response.data.job;
  },

  /**
   * Get download status
   */
  async getDownloadStatus(jobId: string): Promise<DownloadStatus> {
    const response = await adminAPI.get(`/download/${jobId}`);
    return response.data.status;
  },

  /**
   * Cancel download
   */
  async cancelDownload(jobId: string): Promise<void> {
    await adminAPI.delete(`/download/${jobId}`);
  },

  /**
   * List all datasets (admin view)
   */
  async listDatasets(filters?: {
    marketType?: MarketType;
    symbols?: string[];
    intervals?: KlineInterval[];
  }): Promise<HistoricalDataset[]> {
    const params = new URLSearchParams();
    if (filters?.marketType) params.append('marketType', filters.marketType);
    if (filters?.symbols) params.append('symbols', filters.symbols.join(','));
    if (filters?.intervals) params.append('intervals', filters.intervals.join(','));

    const response = await adminAPI.get('/datasets', { params });
    return response.data.datasets;
  },

  /**
   * Get dataset details
   */
  async getDataset(id: string): Promise<HistoricalDataset> {
    const response = await adminAPI.get(`/datasets/${id}`);
    return response.data.dataset;
  },

  /**
   * Delete dataset
   */
  async deleteDataset(id: string): Promise<void> {
    await adminAPI.delete(`/datasets/${id}`);
  },

  /**
   * Verify dataset
   */
  async verifyDataset(id: string): Promise<any> {
    const response = await adminAPI.post(`/datasets/${id}/verify`);
    return response.data.result;
  },

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    const response = await adminAPI.get('/storage');
    return response.data.stats;
  },

  /**
   * Export metadata
   */
  async exportMetadata(format: 'json' | 'csv'): Promise<string> {
    const response = await adminAPI.get('/export', {
      params: { format },
      responseType: 'text'
    });
    return response.data;
  },

  /**
   * List available symbols
   */
  async listSymbols(marketType?: MarketType): Promise<string[]> {
    const response = await adminAPI.get('/symbols', {
      params: { marketType }
    });
    return response.data.symbols;
  }
};

/**
 * Public Data API (all users)
 */
export const dataPublicAPI = {
  /**
   * List available datasets (public info)
   */
  async listDatasets(filters?: {
    marketType?: MarketType;
    symbols?: string[];
    intervals?: KlineInterval[];
  }): Promise<PublicDatasetInfo[]> {
    const params = new URLSearchParams();
    if (filters?.marketType) params.append('marketType', filters.marketType);
    if (filters?.symbols) params.append('symbols', filters.symbols.join(','));
    if (filters?.intervals) params.append('intervals', filters.intervals.join(','));

    const response = await publicAPI.get('/datasets', { params });
    return response.data.datasets;
  },

  /**
   * Check data availability
   */
  async checkAvailability(
    symbol: string,
    interval: KlineInterval,
    marketType: MarketType,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    available: boolean;
    coverage: any;
    datasets: PublicDatasetInfo[];
  }> {
    const params = new URLSearchParams({
      symbol,
      interval,
      marketType
    });
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());

    const response = await publicAPI.get('/datasets/available', { params });
    return response.data;
  },

  /**
   * Get available symbols
   */
  async getSymbols(marketType?: MarketType): Promise<string[]> {
    const response = await publicAPI.get('/symbols', {
      params: { marketType }
    });
    return response.data.symbols;
  },

  /**
   * Get available intervals
   */
  async getIntervals(marketType?: MarketType): Promise<KlineInterval[]> {
    const response = await publicAPI.get('/intervals', {
      params: { marketType }
    });
    return response.data.intervals;
  },

  /**
   * Query kline data
   */
  async queryKlines(query: {
    symbol: string;
    interval: KlineInterval;
    marketType: MarketType;
    startDate: Date;
    endDate: Date;
    limit?: number;
  }): Promise<any[]> {
    const response = await publicAPI.post('/klines/query', query);
    return response.data.data;
  }
};
