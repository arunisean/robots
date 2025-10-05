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
    console.log('\n=== Auth Middleware Debug ===');
    console.log('Request URL:', request.url);
    console.log('Request method:', request.method);
    console.log('Authorization header:', request.headers.authorization);
    
    // Get token from Authorization header
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No valid authorization header found');
      return reply.status(401).send({
        success: false,
        error: 'Authentication required. Please provide a valid token.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('Extracted token:', token.substring(0, 20) + '...');

    if (!token) {
      console.log('Token is empty after extraction');
      return reply.status(401).send({
        success: false,
        error: 'Authentication token is missing'
      });
    }

    try {
      // Verify JWT token
      const decoded = await request.server.jwt.verify(token) as JWTPayload;
      console.log('JWT decoded successfully:', decoded);

      // Attach user information to request
      request.currentUser = {
        id: decoded.userId || decoded.sub || '',
        walletAddress: decoded.walletAddress,
        role: decoded.role || 'user'
      };

      console.log('User attached to request:', request.currentUser);
      console.log('=== Auth Middleware Success ===\n');
      logger.debug(`Authenticated user: ${request.currentUser.id}`);
    } catch (jwtError: any) {
      console.log('JWT verification failed:', jwtError.message);
      console.log('JWT error details:', jwtError);
      
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
