import { z } from 'zod';

// 通用验证工具

// 验证以太坊地址
export const isValidEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// 验证URL
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// 验证邮箱
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 验证Cron表达式
export const isValidCronExpression = (cron: string): boolean => {
  const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;
  return cronRegex.test(cron);
};

// 验证JSON字符串
export const isValidJson = (jsonString: string): boolean => {
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
};

// 验证CSS选择器 (browser environment only)
export const isValidCssSelector = (selector: string): boolean => {
  if (typeof globalThis === 'undefined' || typeof (globalThis as any).document === 'undefined') {
    return true; // Skip validation in Node.js
  }
  try {
    (globalThis as any).document.querySelector(selector);
    return true;
  } catch {
    return false;
  }
};

// 验证XPath表达式 (browser environment only)
export const isValidXPath = (xpath: string): boolean => {
  if (typeof globalThis === 'undefined' || typeof (globalThis as any).document === 'undefined') {
    return true; // Skip validation in Node.js
  }
  try {
    const doc = (globalThis as any).document;
    const XPathResult = (globalThis as any).XPathResult;
    doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null);
    return true;
  } catch {
    return false;
  }
};

// 验证正则表达式
export const isValidRegex = (pattern: string): boolean => {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
};

// 验证端口号
export const isValidPort = (port: number): boolean => {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
};

// 验证IP地址
export const isValidIpAddress = (ip: string): boolean => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

// 验证文件大小（字节）
export const isValidFileSize = (size: number, maxSizeMB: number): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return size > 0 && size <= maxSizeBytes;
};

// 验证MIME类型
export const isValidMimeType = (mimeType: string, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(mimeType);
};

// 验证时区
export const isValidTimezone = (timezone: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

// 验证语言代码
export const isValidLanguageCode = (code: string): boolean => {
  const languageRegex = /^[a-z]{2}(-[A-Z]{2})?$/;
  return languageRegex.test(code);
};

// 验证颜色代码
export const isValidColorCode = (color: string): boolean => {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  const rgbRegex = /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/;
  const rgbaRegex = /^rgba\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3}),\s*(0|1|0?\.\d+)\)$/;
  
  return hexRegex.test(color) || rgbRegex.test(color) || rgbaRegex.test(color);
};

// 通用验证函数
export const validate = <T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: string[] } => {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
};

// 安全验证函数
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // 移除HTML标签
    .replace(/['"]/g, '') // 移除引号
    .trim();
};

// 验证密码强度
export const validatePasswordStrength = (password: string): { 
  score: number; 
  feedback: string[]; 
  isStrong: boolean 
} => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('密码至少需要8个字符');
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('密码需要包含小写字母');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('密码需要包含大写字母');
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('密码需要包含数字');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('密码需要包含特殊字符');
  }

  return {
    score,
    feedback,
    isStrong: score >= 4
  };
};