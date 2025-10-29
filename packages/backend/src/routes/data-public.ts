import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { HistoricalDataManager } from '../services/HistoricalDataManager';
import { Logger } from '../utils/logger';

const logger = new Logger('DataPublicRoutes');

/**
 * Public routes for data querying (all authenticated users)
 */
export async function dataPublicRoutes(fastify: FastifyInstance) {
  const pool: Pool = (fastify as any).pg.pool;
  const manager = new HistoricalDataManager(pool);

  /**
   * List available datasets (public info only)
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

      const datasets = await manager.listPublicDatasets(filters);
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
   * Check data availability for specific criteria
   */
  fastify.get('/datasets/available', async (request, reply) => {
    const query = request.query as any;

    try {
      const { symbol, interval, marketType, startDate, endDate } = query;

      if (!symbol || !interval || !marketType) {
        return reply.status(400).send({
          error: 'Missing required parameters: symbol, interval, marketType'
        });
      }

      const datasets = await manager.listPublicDatasets({
        marketType,
        symbols: [symbol],
        intervals: [interval],
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      });

      const available = datasets.length > 0;
      const coverage = available ? {
        earliestDate: Math.min(...datasets.map(d => d.startDate.getTime())),
        latestDate: Math.max(...datasets.map(d => d.endDate.getTime())),
        totalDataPoints: datasets.reduce((sum, d) => sum + d.dataPoints, 0)
      } : null;

      return reply.send({
        success: true,
        available,
        coverage,
        datasets
      });
    } catch (error: any) {
      logger.error('Error checking availability:', error);
      return reply.status(500).send({
        error: 'Failed to check availability',
        message: error.message
      });
    }
  });

  /**
   * Get unique symbols
   */
  fastify.get('/symbols', async (request, reply) => {
    const { marketType } = request.query as any;

    try {
      const symbols = await manager.getUniqueSymbols(marketType);
      return reply.send({
        success: true,
        symbols
      });
    } catch (error: any) {
      logger.error('Error getting symbols:', error);
      return reply.status(500).send({
        error: 'Failed to get symbols',
        message: error.message
      });
    }
  });

  /**
   * Get unique intervals
   */
  fastify.get('/intervals', async (request, reply) => {
    const { marketType } = request.query as any;

    try {
      const intervals = await manager.getUniqueIntervals(marketType);
      return reply.send({
        success: true,
        intervals
      });
    } catch (error: any) {
      logger.error('Error getting intervals:', error);
      return reply.status(500).send({
        error: 'Failed to get intervals',
        message: error.message
      });
    }
  });

  /**
   * Query kline data
   */
  fastify.post('/klines/query', async (request, reply) => {
    const body = request.body as any;

    try {
      const { symbol, interval, marketType, startDate, endDate, limit } = body;

      if (!symbol || !interval || !marketType || !startDate || !endDate) {
        return reply.status(400).send({
          error: 'Missing required parameters'
        });
      }

      const data = await manager.queryKlines({
        symbol,
        interval,
        marketType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        limit
      });

      return reply.send({
        success: true,
        data,
        count: data.length
      });
    } catch (error: any) {
      logger.error('Error querying klines:', error);
      return reply.status(500).send({
        error: 'Failed to query klines',
        message: error.message
      });
    }
  });
}
