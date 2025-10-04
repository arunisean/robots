import { WebSocket } from 'ws';

/**
 * Event types for workflow execution monitoring
 */
export enum ExecutionEventType {
  EXECUTION_STARTED = 'execution:started',
  EXECUTION_PROGRESS = 'execution:progress',
  EXECUTION_COMPLETED = 'execution:completed',
  EXECUTION_FAILED = 'execution:failed',
  EXECUTION_CANCELLED = 'execution:cancelled',
  AGENT_STARTED = 'agent:started',
  AGENT_PROGRESS = 'agent:progress',
  AGENT_COMPLETED = 'agent:completed',
  AGENT_FAILED = 'agent:failed',
}

/**
 * Event payload structure
 */
export interface ExecutionEvent {
  type: ExecutionEventType;
  executionId: string;
  workflowId: string;
  timestamp: Date;
  data: any;
}

/**
 * WebSocket connection with metadata
 */
interface Connection {
  socket: WebSocket;
  userId?: string;
  subscriptions: Set<string>; // execution IDs this connection is subscribed to
}

/**
 * EventBroadcaster manages WebSocket connections and broadcasts execution events
 */
export class EventBroadcaster {
  private connections: Map<string, Connection> = new Map();
  private executionSubscribers: Map<string, Set<string>> = new Map(); // executionId -> Set of connectionIds

  /**
   * Register a new WebSocket connection
   */
  public registerConnection(connectionId: string, socket: WebSocket, userId?: string): void {
    const connection: Connection = {
      socket,
      userId,
      subscriptions: new Set(),
    };

    this.connections.set(connectionId, connection);

    // Handle connection close
    socket.on('close', () => {
      this.unregisterConnection(connectionId);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`WebSocket error for connection ${connectionId}:`, error);
      this.unregisterConnection(connectionId);
    });

    console.log(`WebSocket connection registered: ${connectionId} (user: ${userId || 'anonymous'})`);
  }

  /**
   * Unregister a WebSocket connection
   */
  public unregisterConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Remove from all execution subscriptions
    for (const executionId of connection.subscriptions) {
      const subscribers = this.executionSubscribers.get(executionId);
      if (subscribers) {
        subscribers.delete(connectionId);
        if (subscribers.size === 0) {
          this.executionSubscribers.delete(executionId);
        }
      }
    }

    this.connections.delete(connectionId);
    console.log(`WebSocket connection unregistered: ${connectionId}`);
  }

  /**
   * Subscribe a connection to execution events
   */
  public subscribe(connectionId: string, executionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      console.warn(`Cannot subscribe: connection ${connectionId} not found`);
      return;
    }

    connection.subscriptions.add(executionId);

    if (!this.executionSubscribers.has(executionId)) {
      this.executionSubscribers.set(executionId, new Set());
    }
    this.executionSubscribers.get(executionId)!.add(connectionId);

    console.log(`Connection ${connectionId} subscribed to execution ${executionId}`);
  }

  /**
   * Unsubscribe a connection from execution events
   */
  public unsubscribe(connectionId: string, executionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.subscriptions.delete(executionId);
    }

    const subscribers = this.executionSubscribers.get(executionId);
    if (subscribers) {
      subscribers.delete(connectionId);
      if (subscribers.size === 0) {
        this.executionSubscribers.delete(executionId);
      }
    }

    console.log(`Connection ${connectionId} unsubscribed from execution ${executionId}`);
  }

  /**
   * Broadcast an event to all subscribers of an execution
   */
  public broadcast(event: ExecutionEvent): void {
    const subscribers = this.executionSubscribers.get(event.executionId);
    if (!subscribers || subscribers.size === 0) {
      return; // No subscribers for this execution
    }

    const message = JSON.stringify(event);
    let sentCount = 0;

    for (const connectionId of subscribers) {
      const connection = this.connections.get(connectionId);
      if (!connection) continue;

      try {
        if (connection.socket.readyState === WebSocket.OPEN) {
          connection.socket.send(message);
          sentCount++;
        }
      } catch (error) {
        console.error(`Failed to send event to connection ${connectionId}:`, error);
      }
    }

    console.log(`Broadcasted ${event.type} for execution ${event.executionId} to ${sentCount} clients`);
  }

  /**
   * Emit execution started event
   */
  public emitExecutionStarted(executionId: string, workflowId: string, data?: any): void {
    this.broadcast({
      type: ExecutionEventType.EXECUTION_STARTED,
      executionId,
      workflowId,
      timestamp: new Date(),
      data: data || {},
    });
  }

  /**
   * Emit execution progress event
   */
  public emitExecutionProgress(
    executionId: string,
    workflowId: string,
    progress: number,
    currentAgent?: string,
    data?: any
  ): void {
    this.broadcast({
      type: ExecutionEventType.EXECUTION_PROGRESS,
      executionId,
      workflowId,
      timestamp: new Date(),
      data: {
        progress,
        currentAgent,
        ...data,
      },
    });
  }

  /**
   * Emit execution completed event
   */
  public emitExecutionCompleted(executionId: string, workflowId: string, data?: any): void {
    this.broadcast({
      type: ExecutionEventType.EXECUTION_COMPLETED,
      executionId,
      workflowId,
      timestamp: new Date(),
      data: data || {},
    });
  }

  /**
   * Emit execution failed event
   */
  public emitExecutionFailed(executionId: string, workflowId: string, error: string, data?: any): void {
    this.broadcast({
      type: ExecutionEventType.EXECUTION_FAILED,
      executionId,
      workflowId,
      timestamp: new Date(),
      data: {
        error,
        ...data,
      },
    });
  }

  /**
   * Emit execution cancelled event
   */
  public emitExecutionCancelled(executionId: string, workflowId: string, data?: any): void {
    this.broadcast({
      type: ExecutionEventType.EXECUTION_CANCELLED,
      executionId,
      workflowId,
      timestamp: new Date(),
      data: data || {},
    });
  }

  /**
   * Emit agent started event
   */
  public emitAgentStarted(executionId: string, workflowId: string, agentId: string, agentName: string): void {
    this.broadcast({
      type: ExecutionEventType.AGENT_STARTED,
      executionId,
      workflowId,
      timestamp: new Date(),
      data: {
        agentId,
        agentName,
      },
    });
  }

  /**
   * Emit agent progress event
   */
  public emitAgentProgress(
    executionId: string,
    workflowId: string,
    agentId: string,
    agentName: string,
    progress: number,
    message?: string
  ): void {
    this.broadcast({
      type: ExecutionEventType.AGENT_PROGRESS,
      executionId,
      workflowId,
      timestamp: new Date(),
      data: {
        agentId,
        agentName,
        progress,
        message,
      },
    });
  }

  /**
   * Emit agent completed event
   */
  public emitAgentCompleted(
    executionId: string,
    workflowId: string,
    agentId: string,
    agentName: string,
    result?: any
  ): void {
    this.broadcast({
      type: ExecutionEventType.AGENT_COMPLETED,
      executionId,
      workflowId,
      timestamp: new Date(),
      data: {
        agentId,
        agentName,
        result,
      },
    });
  }

  /**
   * Emit agent failed event
   */
  public emitAgentFailed(
    executionId: string,
    workflowId: string,
    agentId: string,
    agentName: string,
    error: string
  ): void {
    this.broadcast({
      type: ExecutionEventType.AGENT_FAILED,
      executionId,
      workflowId,
      timestamp: new Date(),
      data: {
        agentId,
        agentName,
        error,
      },
    });
  }

  /**
   * Get connection count
   */
  public getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get subscriber count for an execution
   */
  public getSubscriberCount(executionId: string): number {
    return this.executionSubscribers.get(executionId)?.size || 0;
  }
}

// Singleton instance
export const eventBroadcaster = new EventBroadcaster();
