import { FastifyRequest, FastifyReply } from 'fastify';
import { Logger } from '../utils/logger';

const logger = new Logger('LocalhostOnlyMiddleware');

/**
 * Middleware to restrict access to localhost only
 * Used for admin/management endpoints
 */
export async function localhostOnly(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const ip = request.ip || request.socket.remoteAddress || '';
  
  // Check if IP is localhost
  const isLocalhost = 
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.startsWith('127.') ||
    ip === 'localhost';

  if (!isLocalhost) {
    logger.warn(`Unauthorized access attempt from ${ip} to ${request.url}`);
    
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'This endpoint is only accessible from localhost',
      statusCode: 403
    });
  }
}
