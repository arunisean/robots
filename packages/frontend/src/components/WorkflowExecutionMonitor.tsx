import React, { useEffect } from 'react';
import {
  useWorkflowWebSocket,
  ExecutionEvent,
  ExecutionEventType,
  ConnectionStatus,
} from '../hooks/useWorkflowWebSocket';

interface WorkflowExecutionMonitorProps {
  executionId: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

/**
 * Component for monitoring workflow execution in real-time
 */
export function WorkflowExecutionMonitor({
  executionId,
  onComplete,
  onError,
}: WorkflowExecutionMonitorProps) {
  const { status, connect, disconnect, subscribe, unsubscribe, events } = useWorkflowWebSocket({
    autoConnect: true,
    onEvent: (event: ExecutionEvent) => {
      // Handle completion
      if (event.type === ExecutionEventType.EXECUTION_COMPLETED && onComplete) {
        onComplete();
      }

      // Handle errors
      if (event.type === ExecutionEventType.EXECUTION_FAILED && onError) {
        onError(event.data.error || 'Execution failed');
      }
    },
  });

  // Subscribe to execution on mount
  useEffect(() => {
    if (status === ConnectionStatus.CONNECTED && executionId) {
      subscribe(executionId);
    }

    return () => {
      if (executionId) {
        unsubscribe(executionId);
      }
    };
  }, [status, executionId, subscribe, unsubscribe]);

  // Filter events for this execution
  const executionEvents = events.filter((e) => e.executionId === executionId);

  // Calculate progress
  const progressEvent = executionEvents.find(
    (e) => e.type === ExecutionEventType.EXECUTION_PROGRESS
  );
  const progress = progressEvent?.data?.progress || 0;

  // Get current status
  const getExecutionStatus = () => {
    if (executionEvents.some((e) => e.type === ExecutionEventType.EXECUTION_COMPLETED)) {
      return 'completed';
    }
    if (executionEvents.some((e) => e.type === ExecutionEventType.EXECUTION_FAILED)) {
      return 'failed';
    }
    if (executionEvents.some((e) => e.type === ExecutionEventType.EXECUTION_STARTED)) {
      return 'running';
    }
    return 'pending';
  };

  const executionStatus = getExecutionStatus();

  // Get status color
  const getStatusColor = () => {
    switch (executionStatus) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get event icon
  const getEventIcon = (type: ExecutionEventType) => {
    switch (type) {
      case ExecutionEventType.EXECUTION_STARTED:
        return '🚀';
      case ExecutionEventType.EXECUTION_PROGRESS:
        return '⏳';
      case ExecutionEventType.EXECUTION_COMPLETED:
        return '✅';
      case ExecutionEventType.EXECUTION_FAILED:
        return '❌';
      case ExecutionEventType.AGENT_STARTED:
        return '▶️';
      case ExecutionEventType.AGENT_COMPLETED:
        return '✓';
      case ExecutionEventType.AGENT_FAILED:
        return '✗';
      default:
        return '•';
    }
  };

  // Get event color
  const getEventColor = (type: ExecutionEventType) => {
    switch (type) {
      case ExecutionEventType.EXECUTION_STARTED:
      case ExecutionEventType.AGENT_STARTED:
        return 'border-l-blue-500 bg-blue-50';
      case ExecutionEventType.EXECUTION_PROGRESS:
        return 'border-l-yellow-500 bg-yellow-50';
      case ExecutionEventType.EXECUTION_COMPLETED:
      case ExecutionEventType.AGENT_COMPLETED:
        return 'border-l-green-500 bg-green-50';
      case ExecutionEventType.EXECUTION_FAILED:
      case ExecutionEventType.AGENT_FAILED:
        return 'border-l-red-500 bg-red-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              status === ConnectionStatus.CONNECTED
                ? 'bg-green-500'
                : status === ConnectionStatus.CONNECTING
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-gray-600">
            {status === ConnectionStatus.CONNECTED
              ? 'Connected'
              : status === ConnectionStatus.CONNECTING
              ? 'Connecting...'
              : 'Disconnected'}
          </span>
        </div>

        {status === ConnectionStatus.DISCONNECTED && (
          <button
            onClick={connect}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reconnect
          </button>
        )}
      </div>

      {/* Execution Status */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Execution Status</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
            {executionStatus.toUpperCase()}
          </span>
        </div>

        {/* Progress Bar */}
        {executionStatus === 'running' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Progress</span>
              <span className="text-sm font-medium">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Events Timeline */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {executionEvents.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Waiting for execution events...
            </p>
          ) : (
            executionEvents.map((event, index) => (
              <div
                key={index}
                className={`border-l-4 p-3 rounded ${getEventColor(event.type)}`}
              >
                <div className="flex items-start space-x-2">
                  <span className="text-lg">{getEventIcon(event.type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {event.type.replace(/:/g, ' ').toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Event Details */}
                    {event.type === ExecutionEventType.AGENT_STARTED && (
                      <p className="text-sm text-gray-700 mt-1">
                        Agent: {event.data.agentName} ({event.data.agentId})
                      </p>
                    )}

                    {event.type === ExecutionEventType.AGENT_COMPLETED && (
                      <p className="text-sm text-gray-700 mt-1">
                        Agent: {event.data.agentName} completed successfully
                      </p>
                    )}

                    {event.type === ExecutionEventType.AGENT_FAILED && (
                      <div className="mt-1">
                        <p className="text-sm text-gray-700">
                          Agent: {event.data.agentName}
                        </p>
                        <p className="text-sm text-red-600 mt-1">Error: {event.data.error}</p>
                      </div>
                    )}

                    {event.type === ExecutionEventType.EXECUTION_PROGRESS && (
                      <p className="text-sm text-gray-700 mt-1">
                        Progress: {event.data.progress}%
                        {event.data.currentAgent && ` - Current: ${event.data.currentAgent}`}
                      </p>
                    )}

                    {event.type === ExecutionEventType.EXECUTION_COMPLETED && (
                      <p className="text-sm text-gray-700 mt-1">
                        Completed in {event.data.duration}ms - {event.data.agentsExecuted} agents
                        executed
                      </p>
                    )}

                    {event.type === ExecutionEventType.EXECUTION_FAILED && (
                      <p className="text-sm text-red-600 mt-1">Error: {event.data.error}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
