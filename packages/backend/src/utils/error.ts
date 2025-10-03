/**
 * Error handling utilities
 */

/**
 * Safely extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  
  return 'Unknown error occurred';
}

/**
 * Safely extract error code from unknown error type
 */
export function getErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String(error.code);
  }
  
  return 'UNKNOWN_ERROR';
}

/**
 * Check if error is retryable based on common patterns
 */
export function isRetryableError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  const code = getErrorCode(error);
  
  // Network errors are usually retryable
  if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
    return true;
  }
  
  // Rate limit errors are retryable after delay
  if (message.includes('rate limit') || code === 'RATE_LIMIT_EXCEEDED') {
    return true;
  }
  
  // Server errors (5xx) are usually retryable
  if (message.includes('server error') || message.includes('internal error')) {
    return true;
  }
  
  // Authentication and permission errors are not retryable
  if (message.includes('auth') || message.includes('permission') || message.includes('forbidden')) {
    return false;
  }
  
  // Default to not retryable for safety
  return false;
}

/**
 * Create a standardized error object
 */
export interface StandardError {
  code: string;
  message: string;
  retryable: boolean;
  originalError?: unknown;
}

export function createStandardError(error: unknown, defaultCode = 'UNKNOWN_ERROR'): StandardError {
  return {
    code: getErrorCode(error) || defaultCode,
    message: getErrorMessage(error),
    retryable: isRetryableError(error),
    originalError: error
  };
}