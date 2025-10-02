import { FastifyPluginAsync } from 'fastify';
import { logger } from '../utils/logger';

interface UpdateUserBody {
  preferences?: any;
  profile?: any;
}

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  // Authentication middleware
  const authenticate = async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ success: false, error: 'Unauthorized' });
    }
  };

  // Get current user profile
  fastify.get('/me', { preHandler: authenticate }, async (request, reply) => {
    try {
      const payload = request.user as any;
      const user = await fastify.db.getUserByWalletAddress(payload.walletAddress);
      
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: 'User not found'
        });
      }

      return reply.send({
        success: true,
        user: {
          id: user.id,
          walletAddress: user.wallet_address,
          preferences: user.preferences,
          profile: user.profile,
          subscription: user.subscription,
          createdAt: user.created_at,
          lastLoginAt: user.last_login_at
        }
      });
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Update user preferences
  fastify.put<{ Body: UpdateUserBody }>('/me', { preHandler: authenticate }, async (request, reply) => {
    try {
      const payload = request.user as any;
      const { preferences, profile } = request.body;

      const updates: any = {};
      if (preferences) updates.preferences = preferences;
      if (profile) updates.profile = profile;

      if (Object.keys(updates).length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'No valid fields to update'
        });
      }

      const updatedUser = await fastify.db.updateUser(payload.userId, updates);

      if (!updatedUser) {
        return reply.status(404).send({
          success: false,
          error: 'User not found'
        });
      }

      // Log user activity
      await fastify.db.query(
        'INSERT INTO user_activities (user_id, type, description, ip_address) VALUES ($1, $2, $3, $4)',
        [payload.userId, 'settings_updated', 'User updated profile settings', request.ip]
      );

      logger.info(`User updated profile: ${payload.walletAddress}`);

      return reply.send({
        success: true,
        user: {
          id: updatedUser.id,
          walletAddress: updatedUser.wallet_address,
          preferences: updatedUser.preferences,
          profile: updatedUser.profile,
          subscription: updatedUser.subscription,
          updatedAt: updatedUser.updated_at
        }
      });
    } catch (error) {
      logger.error('Error updating user profile:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Get user dashboard stats
  fastify.get('/me/stats', { preHandler: authenticate }, async (request, reply) => {
    try {
      const payload = request.user as any;
      
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT a.id) as total_agents,
          COUNT(DISTINCT w.id) as total_workflows,
          COUNT(DISTINCT er.id) as total_executions,
          COALESCE(AVG(CASE WHEN er.status = 'success' THEN 1.0 ELSE 0.0 END) * 100, 0) as success_rate
        FROM users u
        LEFT JOIN agents a ON u.id = a.owner_id
        LEFT JOIN workflows w ON u.id = w.owner_id
        LEFT JOIN execution_records er ON a.id = er.agent_id
        WHERE u.id = $1
        GROUP BY u.id
      `;

      const result = await fastify.db.query(statsQuery, [payload.userId]);
      const stats = result.rows[0] || {
        total_agents: 0,
        total_workflows: 0,
        total_executions: 0,
        success_rate: 0
      };

      // Get recent activities
      const activitiesQuery = `
        SELECT type, description, timestamp
        FROM user_activities
        WHERE user_id = $1
        ORDER BY timestamp DESC
        LIMIT 10
      `;

      const activitiesResult = await fastify.db.query(activitiesQuery, [payload.userId]);

      return reply.send({
        success: true,
        stats: {
          totalAgents: parseInt(stats.total_agents),
          totalWorkflows: parseInt(stats.total_workflows),
          totalExecutions: parseInt(stats.total_executions),
          successRate: parseFloat(stats.success_rate).toFixed(2)
        },
        recentActivities: activitiesResult.rows
      });
    } catch (error) {
      logger.error('Error fetching user stats:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Get user activities
  fastify.get('/me/activities', { preHandler: authenticate }, async (request, reply) => {
    try {
      const payload = request.user as any;
      const { limit = 50, offset = 0 } = request.query as any;

      const query = `
        SELECT type, description, timestamp, metadata
        FROM user_activities
        WHERE user_id = $1
        ORDER BY timestamp DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await fastify.db.query(query, [payload.userId, limit, offset]);

      return reply.send({
        success: true,
        activities: result.rows,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: result.rowCount
        }
      });
    } catch (error) {
      logger.error('Error fetching user activities:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });
};