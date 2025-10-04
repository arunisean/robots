/**
 * 类型安全的错误处理工具
 */

/**
 * 检查是否是Error对象
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * 从unknown类型的错误中安全地获取错误消息
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  
  return 'Unknown error occurred';
}

/**
 * 从unknown类型的错误中安全地获取错误堆栈
 */
export function getErrorStack(error: unknown): string | undefined {
  if (isError(error)) {
    return error.stack;
  }
  return undefined;
}

/**
 * 将unknown类型的错误转换为Error对象
 */
export function toError(error: unknown): Error {
  if (isError(error)) {
    return error;
  }
  
  return new Error(getErrorMessage(error));
}
