import { Pool } from 'pg';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  HistoricalDataset,
  PublicDatasetInfo,
  DatasetFilters,
  VerificationResult,
  StorageStats,
  KlineQuery,
  MarketDataPoint,
  MarketType,
  KlineInterval
} from '@multi-agent-platform/shared';
import { Logger } from '../utils/logger';
import { HistoricalDatasetRepository } from '../database/repositories';

/**
 * Historical Data Manager
 * Manages historical datasets and provides query capabilities
 */
export class HistoricalDataManager {
  private logger: Logger;
  private pool: Pool;
  private datasetRepo: HistoricalDatasetRepository;
  private dataDir: string;

  constructor(pool: Pool, dataDir: string = './data/historical') {
    this.pool = pool;
    this.datasetRepo = new HistoricalDatasetRepository(pool);
    this.dataDir = dataDir;
    this.logger = new Logger('HistoricalDataManager');
  }

  /**
   * List all datasets
   */
  async listDatasets(filters?: DatasetFilters): Promise<HistoricalDataset[]> {
    return this.datasetRepo.findAll(filters);
  }

  /**
   * List public dataset info (for regular users)
   */
  async listPublicDatasets(filters?: DatasetFilters): Promise<PublicDatasetInfo[]> {
    return this.datasetRepo.findAllPublic(filters);
  }

  /**
   * Get dataset details
   */
  async getDatasetInfo(datasetId: string): Promise<HistoricalDataset | null> {
    return this.datasetRepo.findById(datasetId);
  }

  /**
   * Delete dataset
   */
  async deleteDataset(datasetId: string): Promise<void> {
    const dataset = await this.datasetRepo.findById(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    // Delete file from disk
    try {
      await fs.unlink(dataset.filePath);
      this.logger.info(`Deleted file: ${dataset.filePath}`);
    } catch (error) {
      this.logger.warn(`Failed to delete file ${dataset.filePath}:`, error);
    }

    // Delete from database
    await this.datasetRepo.delete(datasetId);
    this.logger.info(`Deleted dataset: ${datasetId}`);
  }

  /**
   * Verify dataset integrity
   */
  async verifyDataset(datasetId: string): Promise<VerificationResult> {
    const dataset = await this.datasetRepo.findById(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    const issues: VerificationResult['issues'] = [];

    // Check if file exists
    try {
      await fs.access(dataset.filePath);
    } catch {
      issues.push({
        type: 'corrupted_file',
        severity: 'error',
        description: `File not found: ${dataset.filePath}`
      });
    }

    // Check file size
    try {
      const stats = await fs.stat(dataset.filePath);
      if (stats.size !== dataset.fileSize) {
        issues.push({
          type: 'corrupted_file',
          severity: 'warning',
          description: `File size mismatch: expected ${dataset.fileSize}, got ${stats.size}`
        });
      }
    } catch (error) {
      issues.push({
        type: 'corrupted_file',
        severity: 'error',
        description: `Failed to read file stats: ${error}`
      });
    }

    // TODO: Verify data continuity and format

    const result: VerificationResult = {
      datasetId,
      isValid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      checkedAt: new Date()
    };

    // Save verification result
    await this.saveVerificationResult(result);

    return result;
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    const stats = await this.datasetRepo.getStorageStats();

    // Get available disk space
    // Note: This is a simplified version. In production, use a proper disk space library
    const availableSpace = 1000000000000; // 1TB placeholder

    return {
      ...stats,
      availableSpace
    };
  }

  /**
   * Query kline data
   */
  async queryKlines(query: KlineQuery): Promise<MarketDataPoint[]> {
    // Find matching datasets
    const datasets = await this.datasetRepo.findBySymbolAndInterval(
      query.symbol,
      query.interval,
      query.marketType
    );

    if (datasets.length === 0) {
      throw new Error(`No data found for ${query.symbol} ${query.interval}`);
    }

    // Filter datasets by date range
    const relevantDatasets = datasets.filter(ds =>
      ds.startDate <= query.endDate && ds.endDate >= query.startDate
    );

    if (relevantDatasets.length === 0) {
      throw new Error(`No data found for date range ${query.startDate} to ${query.endDate}`);
    }

    // Load and parse data from CSV files
    const allData: MarketDataPoint[] = [];

    for (const dataset of relevantDatasets) {
      const data = await this.loadDataFromFile(dataset.filePath);
      
      // Filter by date range
      const filtered = data.filter(point =>
        point.timestamp >= query.startDate && point.timestamp <= query.endDate
      );

      allData.push(...filtered);

      // Update last accessed time
      await this.datasetRepo.updateLastAccessed(dataset.id);
    }

    // Sort by timestamp
    allData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Apply limit if specified
    if (query.limit && allData.length > query.limit) {
      return allData.slice(0, query.limit);
    }

    return allData;
  }

  /**
   * Get unique symbols
   */
  async getUniqueSymbols(marketType?: MarketType): Promise<string[]> {
    return this.datasetRepo.getUniqueSymbols(marketType);
  }

  /**
   * Get unique intervals
   */
  async getUniqueIntervals(marketType?: MarketType): Promise<KlineInterval[]> {
    return this.datasetRepo.getUniqueIntervals(marketType);
  }

  /**
   * Export metadata
   */
  async exportMetadata(format: 'json' | 'csv'): Promise<string> {
    const datasets = await this.datasetRepo.findAll();

    if (format === 'json') {
      return JSON.stringify(datasets, null, 2);
    } else {
      // CSV format
      const headers = [
        'ID', 'Market Type', 'Symbol', 'Interval', 'Start Date', 'End Date',
        'Data Points', 'File Size', 'Downloaded At'
      ];

      const rows = datasets.map(ds => [
        ds.id,
        ds.marketType,
        ds.symbol,
        ds.interval,
        ds.startDate.toISOString(),
        ds.endDate.toISOString(),
        ds.dataPoints.toString(),
        ds.fileSize.toString(),
        ds.downloadedAt.toISOString()
      ]);

      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }
  }

  /**
   * Register downloaded dataset
   */
  async registerDataset(
    marketType: MarketType,
    symbol: string,
    interval: KlineInterval,
    startDate: Date,
    endDate: Date,
    filePath: string
  ): Promise<HistoricalDataset> {
    // Check if already exists
    const exists = await this.datasetRepo.exists(marketType, symbol, interval, startDate, endDate);
    if (exists) {
      this.logger.info(`Dataset already exists: ${symbol} ${interval} ${startDate} to ${endDate}`);
      const datasets = await this.datasetRepo.findBySymbolAndInterval(symbol, interval, marketType);
      return datasets.find(ds =>
        ds.startDate.getTime() === startDate.getTime() &&
        ds.endDate.getTime() === endDate.getTime()
      )!;
    }

    // Get file stats
    const stats = await fs.stat(filePath);
    
    // Count data points (simplified - count lines in CSV)
    const content = await fs.readFile(filePath, 'utf-8');
    const dataPoints = content.split('\n').filter(line => line.trim()).length;

    // Create dataset record
    const dataset = await this.datasetRepo.create({
      marketType,
      symbol,
      interval,
      startDate,
      endDate,
      dataPoints,
      fileSize: stats.size,
      filePath,
      source: 'binance-public-data',
      compressed: false
    });

    this.logger.info(`Registered dataset: ${dataset.id}`);
    return dataset;
  }

  /**
   * Load data from CSV file
   */
  private async loadDataFromFile(filePath: string): Promise<MarketDataPoint[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    const data: MarketDataPoint[] = [];

    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length < 6) continue;

      data.push({
        timestamp: new Date(parseInt(parts[0])),
        symbol: '', // Will be set by caller
        open: parseFloat(parts[1]),
        high: parseFloat(parts[2]),
        low: parseFloat(parts[3]),
        close: parseFloat(parts[4]),
        volume: parseFloat(parts[5])
      });
    }

    return data;
  }

  /**
   * Save verification result
   */
  private async saveVerificationResult(result: VerificationResult): Promise<void> {
    const query = `
      INSERT INTO dataset_verifications (dataset_id, is_valid, issues)
      VALUES ($1, $2, $3)
    `;

    await this.pool.query(query, [
      result.datasetId,
      result.isValid,
      JSON.stringify(result.issues)
    ]);
  }
}
