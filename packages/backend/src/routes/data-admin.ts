import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { BinanceDataDownloader } from '../services/BinanceDataDownloader';
import { HistoricalDataManager } from '../services/HistoricalDataManager';
import { localhostOnly } from '../middleware/localhostOnly';
import { Logger } from '../utils/logger';

const logger = new Logger('DataAdminRoutes');

/**
 * Admin routes for data management (localhost only)
 */
export async function dataAdminRoutes(fastify: FastifyInstance) {
  const pool: Pool = (fastify as any).pg.pool;
  const downloader = new BinanceDataDownloader(pool);
  const manager = new HistoricalDataManager(pool);

  // Apply localhost-only middleware to all routes in this plugin
  fastify.addHook('preHandler', localhostOnly);

  /**
   * Start data download
   */
  fastify.post('/download', async (request, reply) => {
    const body = request.body as any;

    try {
      const job = await downloader.downloadHistoricalData({
        marketType: body.marketType,
        symbols: body.symbols,
        intervals: body.intervals,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        dataType: body.dataType || 'klines',
        options: body.options
      });

      return reply.send({
        success: true,
        job
      });
    } catch (error: any) {
      logger.error('Error starting download:', error);
      return reply.status(500).send({
        error: 'Failed to start download',
        message: error.message
      });
    }
  });

  /**
   * Get download job status
   */
  fastify.get('/download/:jobId', async (request, reply) => {
    const { jobId } = request.params as any;

    try {
      const status = await downloader.getDownloadStatus(jobId);
      return reply.send({
        success: true,
        status
      });
    } catch (error: any) {
      logger.error('Error getting download status:', error);
      return reply.status(404).send({
        error: 'Download job not found',
        message: error.message
      });
    }
  });

  /**
   * Cancel download job
   */
  fastify.delete('/download/:jobId', async (request, reply) => {
    const { jobId } = request.params as any;

    try {
      await downloader.cancelDownload(jobId);
      return reply.send({
        success: true,
        message: 'Download cancelled'
      });
    } catch (error: any) {
      logger.error('Error cancelling download:', error);
      return reply.status(500).send({
        error: 'Failed to cancel download',
        message: error.message
      });
    }
  });

  /**
   * List all datasets (admin view with full details)
   */
  fastify.get('/datasets', async (request, reply) => {
    const query = request.query as any;

    try {
      const filters = {
        marketType: query.marketType,
        symbols: query.symbols ? query.symbols.split(',') : undefined,
        intervals: query.intervals ? query.intervals.split(',') : undefined,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined
      };

      const datasets = await manager.listDatasets(filters);
      return reply.send({
        success: true,
        datasets,
        count: datasets.length
      });
    } catch (error: any) {
      logger.error('Error listing datasets:', error);
      return reply.status(500).send({
        error: 'Failed to list datasets',
        message: error.message
      });
    }
  });

  /**
   * Get dataset details
   */
  fastify.get('/datasets/:id', async (request, reply) => {
    const { id } = request.params as any;

    try {
      const dataset = await manager.getDatasetInfo(id);
      if (!dataset) {
        return reply.status(404).send({
          error: 'Dataset not found'
        });
      }

      return reply.send({
        success: true,
        dataset
      });
    } catch (error: any) {
      logger.error('Error getting dataset:', error);
      return reply.status(500).send({
        error: 'Failed to get dataset',
        message: error.message
      });
    }
  });

  /**
   * Delete dataset
   */
  fastify.delete('/datasets/:id', async (request, reply) => {
    const { id } = request.params as any;

    try {
      await manager.deleteDataset(id);
      return reply.send({
        success: true,
        message: 'Dataset deleted'
      });
    } catch (error: any) {
      logger.error('Error deleting dataset:', error);
      return reply.status(500).send({
        error: 'Failed to delete dataset',
        message: error.message
      });
    }
  });

  /**
   * Verify dataset
   */
  fastify.post('/datasets/:id/verify', async (request, reply) => {
    const { id } = request.params as any;

    try {
      const result = await manager.verifyDataset(id);
      return reply.send({
        success: true,
        result
      });
    } catch (error: any) {
      logger.error('Error verifying dataset:', error);
      return reply.status(500).send({
        error: 'Failed to verify dataset',
        message: error.message
      });
    }
  });

  /**
   * Get storage statistics
   */
  fastify.get('/storage', async (request, reply) => {
    try {
      const stats = await manager.getStorageStats();
      return reply.send({
        success: true,
        stats
      });
    } catch (error: any) {
      logger.error('Error getting storage stats:', error);
      return reply.status(500).send({
        error: 'Failed to get storage stats',
        message: error.message
      });
    }
  });

  /**
   * Export metadata
   */
  fastify.get('/export', async (request, reply) => {
    const { format } = request.query as any;

    try {
      const data = await manager.exportMetadata(format || 'json');
      
      if (format === 'csv') {
        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', 'attachment; filename=datasets.csv');
      } else {
        reply.header('Content-Type', 'application/json');
      }

      return reply.send(data);
    } catch (error: any) {
      logger.error('Error exporting metadata:', error);
      return reply.status(500).send({
        error: 'Failed to export metadata',
        message: error.message
      });
    }
  });

  /**
   * List available symbols
   */
  fastify.get('/symbols', async (request, reply) => {
    const { marketType } = request.query as any;

    try {
      const symbols = await downloader.listAvailableSymbols(marketType || 'spot');
      return reply.send({
        success: true,
        symbols
      });
    } catch (error: any) {
      logger.error('Error listing symbols:', error);
      return reply.status(500).send({
        error: 'Failed to list symbols',
        message: error.message
      });
    }
  });
}
