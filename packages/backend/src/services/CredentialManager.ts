import crypto from 'crypto';
import { Logger } from '../utils/logger';

/**
 * Exchange credentials
 */
export interface ExchangeCredentials {
  id: string;
  userId: string;
  exchangeName: string;
  apiKey: string;
  apiSecret: string;
  permissions?: string[];
  isActive: boolean;
  lastValidated?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Encrypted credentials for storage
 */
export interface EncryptedCredentials {
  id: string;
  userId: string;
  exchangeName: string;
  apiKeyEncrypted: string;
  apiSecretEncrypted: string;
  iv: string; // Initialization vector
  permissions?: string[];
  isActive: boolean;
  lastValidated?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Credential Manager
 * Handles secure storage and retrieval of exchange API credentials
 */
export class CredentialManager {
  private logger: Logger;
  private encryptionKey: Buffer;
  private algorithm = 'aes-256-cbc';
  
  // In-memory cache for decrypted credentials (with TTL)
  private credentialCache: Map<string, { credentials: ExchangeCredentials; expiresAt: number }>;
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(encryptionKey?: string) {
    this.logger = new Logger('CredentialManager');
    
    // Use provided key or generate from environment
    const key = encryptionKey || process.env.CREDENTIAL_ENCRYPTION_KEY || this.generateKey();
    this.encryptionKey = Buffer.from(key, 'hex');
    
    if (this.encryptionKey.length !== 32) {
      throw new Error('Encryption key must be 32 bytes (64 hex characters)');
    }

    this.credentialCache = new Map();
    
    this.logger.info('Credential manager initialized');
  }

  /**
   * Generate a new encryption key
   */
  private generateKey(): string {
    const key = crypto.randomBytes(32).toString('hex');
    this.logger.warn('Generated new encryption key - store this securely!');
    this.logger.warn(`CREDENTIAL_ENCRYPTION_KEY=${key}`);
    return key;
  }

  /**
   * Encrypt data
   */
  private encrypt(text: string): { encrypted: string; iv: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex')
    };
  }

  /**
   * Decrypt data
   */
  private decrypt(encrypted: string, ivHex: string): string {
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Encrypt credentials for storage
   */
  encryptCredentials(credentials: ExchangeCredentials): EncryptedCredentials {
    const apiKeyEncryption = this.encrypt(credentials.apiKey);
    const apiSecretEncryption = this.encrypt(credentials.apiSecret);

    // Use the same IV for both (simpler, still secure for this use case)
    const iv = apiKeyEncryption.iv;

    return {
      id: credentials.id,
      userId: credentials.userId,
      exchangeName: credentials.exchangeName,
      apiKeyEncrypted: apiKeyEncryption.encrypted,
      apiSecretEncrypted: apiSecretEncryption.encrypted,
      iv,
      permissions: credentials.permissions,
      isActive: credentials.isActive,
      lastValidated: credentials.lastValidated,
      createdAt: credentials.createdAt,
      updatedAt: credentials.updatedAt
    };
  }

  /**
   * Decrypt credentials from storage
   */
  decryptCredentials(encrypted: EncryptedCredentials): ExchangeCredentials {
    // Check cache first
    const cacheKey = `${encrypted.userId}:${encrypted.exchangeName}`;
    const cached = this.credentialCache.get(cacheKey);
    
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.debug(`Using cached credentials for ${cacheKey}`);
      return cached.credentials;
    }

    // Decrypt
    const apiKey = this.decrypt(encrypted.apiKeyEncrypted, encrypted.iv);
    const apiSecret = this.decrypt(encrypted.apiSecretEncrypted, encrypted.iv);

    const credentials: ExchangeCredentials = {
      id: encrypted.id,
      userId: encrypted.userId,
      exchangeName: encrypted.exchangeName,
      apiKey,
      apiSecret,
      permissions: encrypted.permissions,
      isActive: encrypted.isActive,
      lastValidated: encrypted.lastValidated,
      createdAt: encrypted.createdAt,
      updatedAt: encrypted.updatedAt
    };

    // Cache decrypted credentials
    this.credentialCache.set(cacheKey, {
      credentials,
      expiresAt: Date.now() + this.cacheTTL
    });

    return credentials;
  }

  /**
   * Validate credentials format
   */
  validateCredentialsFormat(apiKey: string, apiSecret: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!apiKey || apiKey.trim().length === 0) {
      errors.push('API key is required');
    }

    if (!apiSecret || apiSecret.trim().length === 0) {
      errors.push('API secret is required');
    }

    // Basic format validation (Binance keys are typically 64 characters)
    if (apiKey && apiKey.length < 32) {
      errors.push('API key appears to be too short');
    }

    if (apiSecret && apiSecret.length < 32) {
      errors.push('API secret appears to be too short');
    }

    // Check for common mistakes
    if (apiKey && apiKey.includes(' ')) {
      errors.push('API key should not contain spaces');
    }

    if (apiSecret && apiSecret.includes(' ')) {
      errors.push('API secret should not contain spaces');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Mask sensitive data for logging
   */
  maskCredentials(credentials: ExchangeCredentials): any {
    return {
      id: credentials.id,
      userId: credentials.userId,
      exchangeName: credentials.exchangeName,
      apiKey: this.maskString(credentials.apiKey),
      apiSecret: '***MASKED***',
      permissions: credentials.permissions,
      isActive: credentials.isActive,
      lastValidated: credentials.lastValidated
    };
  }

  /**
   * Mask string (show first and last 4 characters)
   */
  private maskString(str: string): string {
    if (str.length <= 8) {
      return '***';
    }
    return `${str.substring(0, 4)}...${str.substring(str.length - 4)}`;
  }

  /**
   * Clear credential cache
   */
  clearCache(userId?: string, exchangeName?: string): void {
    if (userId && exchangeName) {
      const cacheKey = `${userId}:${exchangeName}`;
      this.credentialCache.delete(cacheKey);
      this.logger.info(`Cleared cache for ${cacheKey}`);
    } else {
      this.credentialCache.clear();
      this.logger.info('Cleared all credential cache');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    entries: Array<{ key: string; expiresIn: number }>;
  } {
    const now = Date.now();
    const entries: Array<{ key: string; expiresIn: number }> = [];

    for (const [key, value] of this.credentialCache.entries()) {
      entries.push({
        key,
        expiresIn: Math.max(0, value.expiresAt - now)
      });
    }

    return {
      size: this.credentialCache.size,
      entries
    };
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.credentialCache.entries()) {
      if (value.expiresAt <= now) {
        this.credentialCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.info(`Cleaned ${cleaned} expired cache entries`);
    }

    return cleaned;
  }

  /**
   * Generate credential ID
   */
  generateCredentialId(userId: string, exchangeName: string): string {
    const data = `${userId}:${exchangeName}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Hash API key for comparison (without storing plaintext)
   */
  hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }
}

/**
 * Singleton instance
 */
let credentialManagerInstance: CredentialManager | null = null;

/**
 * Get credential manager instance
 */
export function getCredentialManager(encryptionKey?: string): CredentialManager {
  if (!credentialManagerInstance) {
    credentialManagerInstance = new CredentialManager(encryptionKey);
  }
  return credentialManagerInstance;
}
