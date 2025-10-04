import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticatedRequest } from './auth';
import { PermissionService, ResourceType, PermissionAction } from '../services/PermissionService';
import { logger } from '../utils/logger';

/**
 * Permission middleware factory
 * Creates middleware that checks if user has permission to perform action on resource
 */
export function permissionMiddleware(
  resourceType: ResourceType,
  action: PermissionAction
) {
  return async (request: AuthenticatedRequest, reply: FastifyReply): Promise<void> => {
    try {
      // Check if user is authenticated
      if (!request.currentUser || !request.currentUser.id) {
        return reply.status(401).send({
          success: false,
          error: 'Authentication required'
        });
      }

      const userId = request.currentUser.id;
      const resourceId = request.params?.id as string;

      if (!resourceId) {
        return reply.status(400).send({
          success: false,
          error: 'Resource ID is required'
        });
      }

      // Get permission service from fastify instance
      const permissionService: PermissionService = (request.server as any).permissionService;

      if (!permissionService) {
        logger.error('Permission service not available');
        return reply.status(500).send({
          success: false,
          error: 'Permission check failed'
        });
      }

      // Check permission
      const result = await permissionService.checkPermission(
        userId,
        resourceType,
        resourceId,
        action
      );

      if (!result.allowed) {
        logger.warn(`Permission denied for user ${userId} to ${action} ${resourceType} ${resourceId}`);
        
        return reply.status(403).send({
          success: false,
          error: result.reason || 'You do not have permission to perform this action',
          requiredRole: result.requiredRole
        });
      }

      logger.debug(`Permission granted for user ${userId} to ${action} ${resourceType} ${resourceId}`);
    } catch (error) {
      logger.error('Permission middleware error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
}

/**
 * Admin-only middleware
 * Checks if user has admin role
 */
export async function adminOnlyMiddleware(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    if (!request.currentUser || !request.currentUser.id) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required'
      });
    }

    const permissionService: PermissionService = (request.server as any).permissionService;

    if (!permissionService) {
      logger.error('Permission service not available');
      return reply.status(500).send({
        success: false,
        error: 'Permission check failed'
      });
    }

    const isAdmin = await permissionService.isAdmin(request.currentUser.id);

    if (!isAdmin) {
      logger.warn(`Admin access denied for user ${request.currentUser.id}`);
      return reply.status(403).send({
        success: false,
        error: 'Admin access required'
      });
    }

    logger.debug(`Admin access granted for user ${request.currentUser.id}`);
  } catch (error) {
    logger.error('Admin middleware error:', error);
    return reply.status(500).send({
      success: false,
      error: 'Permission check failed'
    });
  }
}
