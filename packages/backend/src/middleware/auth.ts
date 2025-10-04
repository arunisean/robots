import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger';

/**
 * User information attached to request
 */
export interface RequestUser {
  id: string;
  walletAddress: string;
  role: string;
}

/**
 * Extended request with user information
 */
export interface AuthenticatedRequest extends FastifyRequest {
  currentUser?: RequestUser;
}

/**
 * JWT payload type
 */
interface JWTPayload {
  userId?: string;
  sub?: string;
  walletAddress: string;
  role?: string;
  iat?: number;
  exp?: number;
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user information to request
 */
export async function authMiddleware(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required. Please provide a valid token.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication token is missing'
      });
    }

    try {
      // Verify JWT token
      const decoded = await request.server.jwt.verify(token) as JWTPayload;

      // Attach user information to request
      request.currentUser = {
        id: decoded.userId || decoded.sub || '',
        walletAddress: decoded.walletAddress,
        role: decoded.role || 'user'
      };

      logger.debug(`Authenticated user: ${request.currentUser.id}`);
    } catch (jwtError: any) {
      if (jwtError.message === 'jwt expired') {
        return reply.status(401).send({
          success: false,
          error: 'Token has expired. Please login again.'
        });
      }

      logger.error('JWT verification failed:', jwtError);
      return reply.status(401).send({
        success: false,
        error: 'Invalid authentication token'
      });
    }
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return reply.status(500).send({
      success: false,
      error: 'Authentication failed'
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is present, but doesn't require it
 */
export async function optionalAuthMiddleware(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        const decoded = await request.server.jwt.verify(token) as JWTPayload;
        request.currentUser = {
          id: decoded.userId || decoded.sub || '',
          walletAddress: decoded.walletAddress,
          role: decoded.role || 'user'
        };
      } catch (jwtError) {
        // Silently fail for optional auth
        logger.debug('Optional auth failed:', jwtError);
      }
    }
  } catch (error) {
    logger.error('Optional authentication middleware error:', error);
  }
}
