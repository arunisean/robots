import { FastifyInstance, FastifyRequest } from 'fastify';
import { eventBroadcaster } from '../services/EventBroadcaster';
import { randomUUID } from 'crypto';

/**
 * WebSocket message types
 */
enum MessageType {
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  PING = 'ping',
  PONG = 'pong',
}

interface WebSocketMessage {
  type: MessageType;
  executionId?: string;
  data?: any;
}

/**
 * Register WebSocket routes
 */
export async function websocketRoutes(fastify: FastifyInstance) {
  // WebSocket endpoint for real-time execution monitoring
  fastify.get(
    '/ws',
    { websocket: true },
    (socket, req: FastifyRequest) => {
      const connectionId = randomUUID();
      
      // Extract user ID from JWT if available
      let userId: string | undefined;
      try {
        // @ts-ignore - JWT is added by authentication plugin
        userId = req.user?.userId;
      } catch (error) {
        // No authentication, allow anonymous connections for now
      }

      // Register the connection
      eventBroadcaster.registerConnection(connectionId, socket, userId);

      // Send welcome message
      socket.send(
        JSON.stringify({
          type: 'connected',
          connectionId,
          timestamp: new Date().toISOString(),
        })
      );

      // Handle incoming messages
      socket.on('message', (rawMessage: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(rawMessage.toString());

          switch (message.type) {
            case MessageType.SUBSCRIBE:
              if (message.executionId) {
                eventBroadcaster.subscribe(connectionId, message.executionId);
                socket.send(
                  JSON.stringify({
                    type: 'subscribed',
                    executionId: message.executionId,
                    timestamp: new Date().toISOString(),
                  })
                );
              }
              break;

            case MessageType.UNSUBSCRIBE:
              if (message.executionId) {
                eventBroadcaster.unsubscribe(connectionId, message.executionId);
                socket.send(
                  JSON.stringify({
                    type: 'unsubscribed',
                    executionId: message.executionId,
                    timestamp: new Date().toISOString(),
                  })
                );
              }
              break;

            case MessageType.PING:
              socket.send(
                JSON.stringify({
                  type: 'pong',
                  timestamp: new Date().toISOString(),
                })
              );
              break;

            default:
              socket.send(
                JSON.stringify({
                  type: 'error',
                  message: `Unknown message type: ${message.type}`,
                  timestamp: new Date().toISOString(),
                })
              );
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
          socket.send(
            JSON.stringify({
              type: 'error',
              message: 'Invalid message format',
              timestamp: new Date().toISOString(),
            })
          );
        }
      });

      // Handle connection close
      socket.on('close', () => {
        eventBroadcaster.unregisterConnection(connectionId);
      });

      // Handle errors
      socket.on('error', (error: Error) => {
        console.error(`WebSocket error for connection ${connectionId}:`, error);
      });
    }
  );

  // Health check endpoint for WebSocket
  fastify.get('/ws/health', async (request, reply) => {
    return {
      status: 'ok',
      connections: eventBroadcaster.getConnectionCount(),
      timestamp: new Date().toISOString(),
    };
  });
}
