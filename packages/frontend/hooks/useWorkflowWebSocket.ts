import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Event types from backend
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
  timestamp: string;
  data: any;
}

/**
 * WebSocket connection status
 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

/**
 * Hook options
 */
interface UseWorkflowWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onEvent?: (event: ExecutionEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

/**
 * Hook return value
 */
interface UseWorkflowWebSocketReturn {
  status: ConnectionStatus;
  connectionId: string | null;
  connect: () => void;
  disconnect: () => void;
  subscribe: (executionId: string) => void;
  unsubscribe: (executionId: string) => void;
  sendPing: () => void;
  events: ExecutionEvent[];
  clearEvents: () => void;
}

/**
 * Custom hook for WebSocket connection to workflow execution monitoring
 */
export function useWorkflowWebSocket(
  options: UseWorkflowWebSocketOptions = {}
): UseWorkflowWebSocketReturn {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/api/ws',
    autoConnect = false,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onEvent,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [events, setEvents] = useState<ExecutionEvent[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());

  /**
   * Handle incoming WebSocket messages
   */
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        // Handle system messages
        if (data.type === 'connected') {
          setConnectionId(data.connectionId);
          reconnectAttemptsRef.current = 0;
          return;
        }

        if (data.type === 'subscribed' || data.type === 'unsubscribed' || data.type === 'pong') {
          // System messages, don't add to events
          return;
        }

        // Handle execution events
        if (data.type && data.executionId) {
          const executionEvent: ExecutionEvent = {
            type: data.type as ExecutionEventType,
            executionId: data.executionId,
            workflowId: data.workflowId,
            timestamp: data.timestamp,
            data: data.data,
          };

          setEvents((prev) => [executionEvent, ...prev]);

          if (onEvent) {
            onEvent(executionEvent);
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    },
    [onEvent]
  );

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setStatus(ConnectionStatus.CONNECTING);

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setStatus(ConnectionStatus.CONNECTED);
        reconnectAttemptsRef.current = 0;

        // Resubscribe to previous subscriptions
        subscriptionsRef.current.forEach((executionId) => {
          ws.send(
            JSON.stringify({
              type: 'subscribe',
              executionId,
            })
          );
        });

        if (onConnect) {
          onConnect();
        }
      };

      ws.onmessage = handleMessage;

      ws.onerror = (error) => {
        setStatus(ConnectionStatus.ERROR);
        if (onError) {
          onError(error);
        }
      };

      ws.onclose = () => {
        setStatus(ConnectionStatus.DISCONNECTED);
        setConnectionId(null);
        wsRef.current = null;

        if (onDisconnect) {
          onDisconnect();
        }

        // Attempt reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      setStatus(ConnectionStatus.ERROR);
    }
  }, [url, handleMessage, onConnect, onDisconnect, onError, reconnectInterval, maxReconnectAttempts]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus(ConnectionStatus.DISCONNECTED);
    setConnectionId(null);
    reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent auto-reconnect
  }, [maxReconnectAttempts]);

  /**
   * Subscribe to execution events
   */
  const subscribe = useCallback((executionId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('Cannot subscribe: WebSocket not connected');
      return;
    }

    subscriptionsRef.current.add(executionId);

    wsRef.current.send(
      JSON.stringify({
        type: 'subscribe',
        executionId,
      })
    );
  }, []);

  /**
   * Unsubscribe from execution events
   */
  const unsubscribe = useCallback((executionId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('Cannot unsubscribe: WebSocket not connected');
      return;
    }

    subscriptionsRef.current.delete(executionId);

    wsRef.current.send(
      JSON.stringify({
        type: 'unsubscribe',
        executionId,
      })
    );
  }, []);

  /**
   * Send ping to server
   */
  const sendPing = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send ping: WebSocket not connected');
      return;
    }

    wsRef.current.send(
      JSON.stringify({
        type: 'ping',
      })
    );
  }, []);

  /**
   * Clear events history
   */
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  /**
   * Auto-connect on mount if enabled
   */
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    status,
    connectionId,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    sendPing,
    events,
    clearEvents,
  };
}
