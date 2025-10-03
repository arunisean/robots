/**
 * Database utility functions
 */

import { FastifyInstance } from 'fastify';

/**
 * Ensure database connection is available
 */
export function ensureDatabase(fastify: FastifyInstance) {
  if (!fastify.db) {
    throw new Error('Database connection not available');
  }
  return fastify.db;
}

/**
 * Ensure Redis connection is available
 */
export function ensureRedis(fastify: FastifyInstance) {
  if (!fastify.redis) {
    throw new Error('Redis connection not available');
  }
  return fastify.redis;
}

/**
 * Safe database operation with null check
 */
export async function safeDbOperation<T>(
  fastify: FastifyInstance,
  operation: (db: NonNullable<FastifyInstance['db']>) => Promise<T>
): Promise<T> {
  const db = ensureDatabase(fastify);
  return await operation(db);
}

/**
 * Safe Redis operation with null check
 */
export async function safeRedisOperation<T>(
  fastify: FastifyInstance,
  operation: (redis: NonNullable<FastifyInstance['redis']>) => Promise<T>
): Promise<T> {
  const redis = ensureRedis(fastify);
  return await operation(redis);
}