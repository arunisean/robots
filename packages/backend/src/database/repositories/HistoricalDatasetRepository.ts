import { Pool, PoolClient } from 'pg';
import {
  HistoricalDataset,
  PublicDatasetInfo,
  DatasetFilters,
  MarketType,
  KlineInterval
} from '@multi-agent-platform/shared';
import { Logger } from '../../utils/logger';

/**
 * Repository for managing historical datasets
 */
export class HistoricalDatasetRepository {
  private pool: Pool;
  private logger: Logger;

  constructor(pool: Pool) {
    this.pool = pool;
    this.logger = new Logger('HistoricalDatasetRepository');
  }

  /**
   * Create a new dataset record
   */
  async create(dataset: Omit<HistoricalDataset, 'id' | 'downloadedAt' | 'lastAccessedAt'>): Promise<HistoricalDataset> {
    const query = `
      INSERT INTO historical_datasets (
        market_type, symbol, interval, start_date, end_date,
        data_points, file_size, file_path, checksum,
        source, version, compressed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      dataset.marketType,
      dataset.symbol,
      dataset.interval,
      dataset.startDate,
      dataset.endDate,
      dataset.dataPoints,
      dataset.fileSize,
      dataset.filePath,
      dataset.checksum,
      dataset.source,
      dataset.version,
      dataset.compressed
    ];

    try {
      const result = await this.pool.query(query, values);
      return this.mapRowToDataset(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating dataset:', error);
      throw error;
    }
  }

  /**
   * Find dataset by ID
   */
  async findById(id: string): Promise<HistoricalDataset | null> {
    const query = 'SELECT * FROM historical_datasets WHERE id = $1';

    try {
      const result = await this.pool.query(query, [id]);
      return result.rows.length > 0 ? this.mapRowToDataset(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error finding dataset by ID:', error);
      throw error;
    }
  }

  /**
   * Find all datasets with optional filters
   */
  async findAll(filters?: DatasetFilters): Promise<HistoricalDataset[]> {
    let query = 'SELECT * FROM historical_datasets WHERE 1=1';
    const values: any[] = [];
    let paramCount = 1;

    if (filters?.marketType) {
      query += ` AND market_type = $${paramCount}`;
      values.push(filters.marketType);
      paramCount++;
    }

    if (filters?.symbols && filters.symbols.length > 0) {
      query += ` AND symbol = ANY($${paramCount})`;
      values.push(filters.symbols);
      paramCount++;
    }

    if (filters?.intervals && filters.intervals.length > 0) {
      query += ` AND interval = ANY($${paramCount})`;
      values.push(filters.intervals);
      paramCount++;
    }

    if (filters?.startDate) {
      query += ` AND end_date >= $${paramCount}`;
      values.push(filters.startDate);
      paramCount++;
    }

    if (filters?.endDate) {
      query += ` AND start_date <= $${paramCount}`;
      values.push(filters.endDate);
      paramCount++;
    }

    query += ' ORDER BY downloaded_at DESC';

    try {
      const result = await this.pool.query(query, values);
      return result.rows.map(row => this.mapRowToDataset(row));
    } catch (error) {
      this.logger.error('Error finding datasets:', error);
      throw error;
    }
  }

  /**
   * Find public dataset info (without sensitive data)
   */
  async findAllPublic(filters?: DatasetFilters): Promise<PublicDatasetInfo[]> {
    const datasets = await this.findAll(filters);
    return datasets.map(ds => this.toPublicInfo(ds));
  }

  /**
   * Find datasets for a specific symbol and interval
   */
  async findBySymbolAndInterval(
    symbol: string,
    interval: KlineInterval,
    marketType: MarketType
  ): Promise<HistoricalDataset[]> {
    const query = `
      SELECT * FROM historical_datasets
      WHERE symbol = $1 AND interval = $2 AND market_type = $3
      ORDER BY start_date ASC
    `;

    try {
      const result = await this.pool.query(query, [symbol, interval, marketType]);
      return result.rows.map(row => this.mapRowToDataset(row));
    } catch (error) {
      this.logger.error('Error finding datasets by symbol and interval:', error);
      throw error;
    }
  }

  /**
   * Check if dataset exists
   */
  async exists(
    marketType: MarketType,
    symbol: string,
    interval: KlineInterval,
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM historical_datasets
        WHERE market_type = $1 AND symbol = $2 AND interval = $3
          AND start_date = $4 AND end_date = $5
      ) as exists
    `;

    try {
      const result = await this.pool.query(query, [marketType, symbol, interval, startDate, endDate]);
      return result.rows[0].exists;
    } catch (error) {
      this.logger.error('Error checking dataset existence:', error);
      throw error;
    }
  }

  /**
   * Update last accessed time
   */
  async updateLastAccessed(id: string): Promise<void> {
    const query = 'UPDATE historical_datasets SET last_accessed_at = NOW() WHERE id = $1';

    try {
      await this.pool.query(query, [id]);
    } catch (error) {
      this.logger.error('Error updating last accessed time:', error);
      throw error;
    }
  }

  /**
   * Delete dataset
   */
  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM historical_datasets WHERE id = $1';

    try {
      await this.pool.query(query, [id]);
      this.logger.info(`Deleted dataset: ${id}`);
    } catch (error) {
      this.logger.error('Error deleting dataset:', error);
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalDatasets: number;
    totalSize: number;
    byMarketType: Record<string, { datasets: number; size: number }>;
    byInterval: Record<string, { datasets: number; size: number }>;
    oldestDataset: Date | null;
    newestDataset: Date | null;
  }> {
    const queries = {
      total: 'SELECT COUNT(*) as count, COALESCE(SUM(file_size), 0) as size FROM historical_datasets',
      byMarketType: `
        SELECT market_type, COUNT(*) as count, COALESCE(SUM(file_size), 0) as size
        FROM historical_datasets
        GROUP BY market_type
      `,
      byInterval: `
        SELECT interval, COUNT(*) as count, COALESCE(SUM(file_size), 0) as size
        FROM historical_datasets
        GROUP BY interval
      `,
      dates: `
        SELECT MIN(start_date) as oldest, MAX(end_date) as newest
        FROM historical_datasets
      `
    };

    try {
      const [totalResult, marketResult, intervalResult, datesResult] = await Promise.all([
        this.pool.query(queries.total),
        this.pool.query(queries.byMarketType),
        this.pool.query(queries.byInterval),
        this.pool.query(queries.dates)
      ]);

      const byMarketType: Record<string, { datasets: number; size: number }> = {};
      marketResult.rows.forEach(row => {
        byMarketType[row.market_type] = {
          datasets: parseInt(row.count),
          size: parseInt(row.size)
        };
      });

      const byInterval: Record<string, { datasets: number; size: number }> = {};
      intervalResult.rows.forEach(row => {
        byInterval[row.interval] = {
          datasets: parseInt(row.count),
          size: parseInt(row.size)
        };
      });

      return {
        totalDatasets: parseInt(totalResult.rows[0].count),
        totalSize: parseInt(totalResult.rows[0].size),
        byMarketType,
        byInterval,
        oldestDataset: datesResult.rows[0].oldest,
        newestDataset: datesResult.rows[0].newest
      };
    } catch (error) {
      this.logger.error('Error getting storage stats:', error);
      throw error;
    }
  }

  /**
   * Get unique symbols
   */
  async getUniqueSymbols(marketType?: MarketType): Promise<string[]> {
    let query = 'SELECT DISTINCT symbol FROM historical_datasets';
    const values: any[] = [];

    if (marketType) {
      query += ' WHERE market_type = $1';
      values.push(marketType);
    }

    query += ' ORDER BY symbol';

    try {
      const result = await this.pool.query(query, values);
      return result.rows.map(row => row.symbol);
    } catch (error) {
      this.logger.error('Error getting unique symbols:', error);
      throw error;
    }
  }

  /**
   * Get unique intervals
   */
  async getUniqueIntervals(marketType?: MarketType): Promise<KlineInterval[]> {
    let query = 'SELECT DISTINCT interval FROM historical_datasets';
    const values: any[] = [];

    if (marketType) {
      query += ' WHERE market_type = $1';
      values.push(marketType);
    }

    query += ' ORDER BY interval';

    try {
      const result = await this.pool.query(query, values);
      return result.rows.map(row => row.interval as KlineInterval);
    } catch (error) {
      this.logger.error('Error getting unique intervals:', error);
      throw error;
    }
  }

  /**
   * Map database row to HistoricalDataset
   */
  private mapRowToDataset(row: any): HistoricalDataset {
    return {
      id: row.id,
      marketType: row.market_type,
      symbol: row.symbol,
      interval: row.interval,
      startDate: row.start_date,
      endDate: row.end_date,
      dataPoints: row.data_points,
      fileSize: row.file_size,
      filePath: row.file_path,
      checksum: row.checksum,
      source: row.source,
      version: row.version,
      compressed: row.compressed,
      downloadedAt: row.downloaded_at,
      lastAccessedAt: row.last_accessed_at
    };
  }

  /**
   * Convert to public info (remove sensitive data)
   */
  private toPublicInfo(dataset: HistoricalDataset): PublicDatasetInfo {
    return {
      id: dataset.id,
      marketType: dataset.marketType,
      symbol: dataset.symbol,
      interval: dataset.interval,
      startDate: dataset.startDate,
      endDate: dataset.endDate,
      dataPoints: dataset.dataPoints
    };
  }
}
