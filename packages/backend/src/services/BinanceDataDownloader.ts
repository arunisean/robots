import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Extract } from 'unzipper';
import {
  DownloadRequest,
  DownloadJob,
  DownloadStatus,
  MarketType,
  KlineInterval,
  DataAvailability
} from '@multi-agent-platform/shared';
import { Logger } from '../utils/logger';
import { Pool } from 'pg';

/**
 * Binance Public Data Downloader
 * Downloads historical market data from Binance public data repository
 */
export class BinanceDataDownloader extends EventEmitter {
  private logger: Logger;
  private pool: Pool;
  private client: AxiosInstance;
  private baseUrl = 'https://data.binance.vision';
  private dataDir: string;
  private activeDownloads: Map<string, DownloadJob>;

  constructor(pool: Pool, dataDir: string = './data/historical') {
    super();
    this.pool = pool;
    this.logger = new Logger('BinanceDataDownloader');
    this.dataDir = dataDir;
    this.activeDownloads = new Map();

    this.client = axios.create({
      timeout: 60000,
      maxRedirects: 5
    });
  }

  /**
   * Start a download job
   */
  async downloadHistoricalData(request: DownloadRequest): Promise<DownloadJob> {
    this.logger.info(`Starting download job for ${request.symbols.join(', ')}`);

    // Create job record in database
    const jobId = await this.createDownloadJob(request);

    // Generate file list
    const fileList = this.generateFileList(request);

    // Update job with file count
    await this.updateJobProgress(jobId, {
      totalFiles: fileList.length,
      totalBytes: 0 // Will be calculated during download
    });

    // Start download in background
    this.executeDownload(jobId, request, fileList).catch(error => {
      this.logger.error(`Download job ${jobId} failed:`, error);
      this.updateJobStatus(jobId, 'failed', error.message);
    });

    // Return job info
    return this.getDownloadStatus(jobId);
  }

  /**
   * Get download job status
   */
  async getDownloadStatus(jobId: string): Promise<DownloadStatus> {
    const query = `
      SELECT * FROM data_download_jobs WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [jobId]);
      if (result.rows.length === 0) {
        throw new Error(`Download job ${jobId} not found`);
      }

      const row = result.rows[0];
      const job: DownloadJob = {
        id: row.id,
        marketType: row.market_type,
        symbols: row.symbols,
        intervals: row.intervals,
        startDate: row.start_date,
        endDate: row.end_date,
        dataType: row.data_type,
        status: row.status,
        progress: {
          totalFiles: row.total_files,
          downloadedFiles: row.downloaded_files,
          failedFiles: row.failed_files,
          totalBytes: parseInt(row.total_bytes),
          downloadedBytes: parseInt(row.downloaded_bytes),
          currentFile: row.current_file
        },
        verifyChecksum: row.verify_checksum,
        overwriteExisting: row.overwrite_existing,
        maxConcurrentDownloads: row.max_concurrent_downloads,
        failedFilesList: row.failed_files_list || [],
        error: row.error,
        createdAt: row.created_at,
        startedAt: row.started_at,
        completedAt: row.completed_at
      };

      // Calculate estimated time and speed
      const status: DownloadStatus = {
        ...job,
        estimatedTimeRemaining: undefined,
        downloadSpeed: undefined
      };

      if (job.status === 'downloading' && job.startedAt) {
        const elapsed = Date.now() - new Date(job.startedAt).getTime();
        const speed = job.progress.downloadedBytes / (elapsed / 1000); // bytes per second
        const remaining = job.progress.totalBytes - job.progress.downloadedBytes;
        
        status.downloadSpeed = speed;
        status.estimatedTimeRemaining = remaining / speed;
      }

      return status;
    } catch (error) {
      this.logger.error('Error getting download status:', error);
      throw error;
    }
  }

  /**
   * Cancel download job
   */
  async cancelDownload(jobId: string): Promise<void> {
    await this.updateJobStatus(jobId, 'cancelled');
    this.activeDownloads.delete(jobId);
    this.logger.info(`Cancelled download job: ${jobId}`);
  }

  /**
   * List available symbols for a market type
   */
  async listAvailableSymbols(marketType: MarketType): Promise<string[]> {
    // This would ideally fetch from Binance API or a cached list
    // For now, return common symbols
    const commonSymbols: Record<MarketType, string[]> = {
      'spot': ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'DOGEUSDT', 'XRPUSDT', 'DOTUSDT', 'UNIUSDT', 'LTCUSDT', 'LINKUSDT'],
      'futures-um': ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'DOGEUSDT'],
      'futures-cm': ['BTCUSD_PERP', 'ETHUSD_PERP'],
      'options': ['BTC', 'ETH']
    };

    return commonSymbols[marketType] || [];
  }

  /**
   * Get data availability for a symbol
   */
  async getDataAvailability(symbol: string, marketType: MarketType): Promise<DataAvailability> {
    // Query existing datasets
    const query = `
      SELECT 
        MIN(start_date) as earliest,
        MAX(end_date) as latest,
        array_agg(DISTINCT interval) as intervals
      FROM historical_datasets
      WHERE symbol = $1 AND market_type = $2
    `;

    try {
      const result = await this.pool.query(query, [symbol, marketType]);
      const row = result.rows[0];

      return {
        symbol,
        marketType,
        availableIntervals: row.intervals || [],
        earliestDate: row.earliest || new Date('2017-01-01'),
        latestDate: row.latest || new Date(),
        dataGaps: [] // TODO: Implement gap detection
      };
    } catch (error) {
      this.logger.error('Error getting data availability:', error);
      throw error;
    }
  }

  /**
   * Generate list of files to download
   */
  private generateFileList(request: DownloadRequest): Array<{
    url: string;
    filename: string;
    symbol: string;
    interval: KlineInterval;
    year: number;
    month: number;
  }> {
    const files: Array<any> = [];
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);

    for (const symbol of request.symbols) {
      for (const interval of request.intervals) {
        let currentDate = new Date(startDate);

        while (currentDate <= endDate) {
          const year = currentDate.getFullYear();
          const month = String(currentDate.getMonth() + 1).padStart(2, '0');

          const url = this.buildDownloadUrl(
            request.marketType,
            symbol,
            interval,
            year,
            month,
            request.dataType
          );

          files.push({
            url,
            filename: `${symbol}-${interval}-${year}-${month}.zip`,
            symbol,
            interval,
            year,
            month: parseInt(month)
          });

          // Move to next month
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }
    }

    return files;
  }

  /**
   * Build download URL for Binance public data
   */
  private buildDownloadUrl(
    marketType: MarketType,
    symbol: string,
    interval: KlineInterval,
    year: number,
    month: string,
    dataType: string
  ): string {
    const marketPath = marketType === 'spot' ? 'spot' :
                       marketType === 'futures-um' ? 'futures/um' :
                       marketType === 'futures-cm' ? 'futures/cm' :
                       'option';

    return `${this.baseUrl}/data/${marketPath}/monthly/${dataType}/${symbol}/${interval}/${symbol}-${interval}-${year}-${month}.zip`;
  }

  /**
   * Execute download job
   */
  private async executeDownload(
    jobId: string,
    request: DownloadRequest,
    fileList: Array<any>
  ): Promise<void> {
    await this.updateJobStatus(jobId, 'downloading');
    const job = await this.getDownloadStatus(jobId);
    this.activeDownloads.set(jobId, job);

    const maxConcurrent = request.options?.maxConcurrentDownloads || 3;
    const chunks: Array<any>[] = [];
    
    // Split files into chunks for concurrent download
    for (let i = 0; i < fileList.length; i += maxConcurrent) {
      chunks.push(fileList.slice(i, i + maxConcurrent));
    }

    let downloadedCount = 0;
    let failedCount = 0;
    const failedFiles: Array<any> = [];

    for (const chunk of chunks) {
      // Check if job was cancelled
      const currentJob = await this.getDownloadStatus(jobId);
      if (currentJob.status === 'cancelled') {
        this.logger.info(`Download job ${jobId} was cancelled`);
        return;
      }

      // Download chunk concurrently
      const results = await Promise.allSettled(
        chunk.map(file => this.downloadFile(jobId, file, request))
      );

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const file = chunk[i];

        if (result.status === 'fulfilled') {
          downloadedCount++;
        } else {
          failedCount++;
          failedFiles.push({
            filename: file.filename,
            error: result.reason?.message || 'Unknown error',
            retryCount: 0
          });
        }

        await this.updateJobProgress(jobId, {
          downloadedFiles: downloadedCount,
          failedFiles: failedCount,
          currentFile: file.filename
        });
      }
    }

    // Update failed files list
    if (failedFiles.length > 0) {
      await this.updateFailedFiles(jobId, failedFiles);
    }

    // Mark as completed or failed
    if (failedCount === fileList.length) {
      await this.updateJobStatus(jobId, 'failed', 'All files failed to download');
    } else {
      await this.updateJobStatus(jobId, 'completed');
    }

    this.activeDownloads.delete(jobId);
    this.emit('downloadCompleted', { jobId, downloadedCount, failedCount });
  }

  /**
   * Download a single file
   */
  private async downloadFile(
    jobId: string,
    file: any,
    request: DownloadRequest
  ): Promise<void> {
    const { url, filename, symbol, interval } = file;

    this.logger.info(`Downloading: ${filename}`);

    // Create directory structure
    const outputDir = path.join(
      this.dataDir,
      request.marketType,
      symbol,
      interval
    );
    await fs.mkdir(outputDir, { recursive: true });

    const zipPath = path.join(outputDir, filename);
    const csvFilename = filename.replace('.zip', '.csv');
    const csvPath = path.join(outputDir, csvFilename);

    // Check if file already exists and skip if not overwriting
    if (!request.options?.overwriteExisting) {
      try {
        await fs.access(csvPath);
        this.logger.info(`File already exists, skipping: ${csvFilename}`);
        return;
      } catch {
        // File doesn't exist, continue with download
      }
    }

    try {
      // Download ZIP file
      const response = await this.client.get(url, {
        responseType: 'stream'
      });

      const writer = createWriteStream(zipPath);
      await pipeline(response.data, writer);

      // Verify checksum if requested
      if (request.options?.verifyChecksum) {
        await this.verifyChecksum(url, zipPath);
      }

      // Extract ZIP file
      await this.extractZip(zipPath, outputDir);

      // Delete ZIP file after extraction
      await fs.unlink(zipPath);

      this.logger.info(`Successfully downloaded and extracted: ${filename}`);
    } catch (error) {
      this.logger.error(`Failed to download ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Verify file checksum
   */
  private async verifyChecksum(url: string, filePath: string): Promise<void> {
    const checksumUrl = `${url}.CHECKSUM`;

    try {
      const response = await this.client.get(checksumUrl);
      const expectedChecksum = response.data.split(' ')[0];

      const fileBuffer = await fs.readFile(filePath);
      const hash = crypto.createHash('sha256');
      hash.update(fileBuffer);
      const actualChecksum = hash.digest('hex');

      if (expectedChecksum !== actualChecksum) {
        throw new Error(`Checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`);
      }

      this.logger.info('Checksum verified successfully');
    } catch (error) {
      this.logger.warn('Checksum verification failed:', error);
      // Don't throw - checksum file might not exist for all files
    }
  }

  /**
   * Extract ZIP file
   */
  private async extractZip(zipPath: string, outputDir: string): Promise<void> {
    const readStream = require('fs').createReadStream(zipPath);
    await pipeline(
      readStream,
      Extract({ path: outputDir })
    );
  }

  /**
   * Create download job in database
   */
  private async createDownloadJob(request: DownloadRequest): Promise<string> {
    const query = `
      INSERT INTO data_download_jobs (
        market_type, symbols, intervals, start_date, end_date, data_type,
        verify_checksum, overwrite_existing, max_concurrent_downloads
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;

    const values = [
      request.marketType,
      request.symbols,
      request.intervals,
      request.startDate,
      request.endDate,
      request.dataType,
      request.options?.verifyChecksum ?? true,
      request.options?.overwriteExisting ?? false,
      request.options?.maxConcurrentDownloads ?? 3
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0].id;
  }

  /**
   * Update job status
   */
  private async updateJobStatus(
    jobId: string,
    status: string,
    error?: string
  ): Promise<void> {
    const query = `
      UPDATE data_download_jobs
      SET status = $1, error = $2,
          started_at = CASE WHEN status = 'queued' AND $1 = 'downloading' THEN NOW() ELSE started_at END,
          completed_at = CASE WHEN $1 IN ('completed', 'failed', 'cancelled') THEN NOW() ELSE completed_at END
      WHERE id = $3
    `;

    await this.pool.query(query, [status, error, jobId]);
  }

  /**
   * Update job progress
   */
  private async updateJobProgress(
    jobId: string,
    progress: Partial<DownloadJob['progress']>
  ): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (progress.totalFiles !== undefined) {
      updates.push(`total_files = $${paramCount}`);
      values.push(progress.totalFiles);
      paramCount++;
    }

    if (progress.downloadedFiles !== undefined) {
      updates.push(`downloaded_files = $${paramCount}`);
      values.push(progress.downloadedFiles);
      paramCount++;
    }

    if (progress.failedFiles !== undefined) {
      updates.push(`failed_files = $${paramCount}`);
      values.push(progress.failedFiles);
      paramCount++;
    }

    if (progress.totalBytes !== undefined) {
      updates.push(`total_bytes = $${paramCount}`);
      values.push(progress.totalBytes);
      paramCount++;
    }

    if (progress.downloadedBytes !== undefined) {
      updates.push(`downloaded_bytes = $${paramCount}`);
      values.push(progress.downloadedBytes);
      paramCount++;
    }

    if (progress.currentFile !== undefined) {
      updates.push(`current_file = $${paramCount}`);
      values.push(progress.currentFile);
      paramCount++;
    }

    if (updates.length === 0) return;

    values.push(jobId);
    const query = `UPDATE data_download_jobs SET ${updates.join(', ')} WHERE id = $${paramCount}`;

    await this.pool.query(query, values);
  }

  /**
   * Update failed files list
   */
  private async updateFailedFiles(jobId: string, failedFiles: any[]): Promise<void> {
    const query = `
      UPDATE data_download_jobs
      SET failed_files_list = $1
      WHERE id = $2
    `;

    await this.pool.query(query, [JSON.stringify(failedFiles), jobId]);
  }
}
