import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { UserRole } from './PermissionService';

/**
 * User preferences
 */
export interface UserPreferences {
  theme?: 'light' | 'dark';
  language?: string;
  timezone?: string;
  notifications?: {
    email?: boolean;
    browser?: boolean;
  };
  dashboard?: Record<string, any>;
  privacy?: Record<string, any>;
}

/**
 * User profile
 */
export interface UserProfile {
  displayName?: string;
  bio?: string;
  avatar?: string;
  website?: string;
  twitter?: string;
  github?: string;
}

/**
 * User model
 */
export interface User {
  id: string;
  walletAddress: string;
  role: UserRole;
  isTestUser: boolean;
  preferences: UserPreferences;
  profile: UserProfile;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

/**
 * User Service
 * Handles user management and authentication
 */
export class UserService {
  constructor(private db: Pool) {}

  /**
   * Get user by wallet address
   */
  async getUserByWalletAddress(address: string): Promise<User | null> {
    try {
      const result = await this.db.query(
        `SELECT 
          id, wallet_address, role, is_test_user,
          preferences, profile, created_at, updated_at, last_login_at
         FROM users 
         WHERE wallet_address = $1`,
        [address.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Error getting user by wallet address:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const result = await this.db.query(
        `SELECT 
          id, wallet_address, role, is_test_user,
          preferences, profile, created_at, updated_at, last_login_at
         FROM users 
         WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new user
   */
  async createUser(
    address: string,
    preferences: UserPreferences = {},
    profile: UserProfile = {}
  ): Promise<User> {
    try {
      const result = await this.db.query(
        `INSERT INTO users (wallet_address, role, is_test_user, preferences, profile)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, wallet_address, role, is_test_user, preferences, profile, created_at, updated_at, last_login_at`,
        [
          address.toLowerCase(),
          UserRole.USER, // Default role
          false, // Not a test user by default
          JSON.stringify(preferences),
          JSON.stringify(profile)
        ]
      );

      const user = this.mapRowToUser(result.rows[0]);
      
      logger.info(`Created new user: ${user.id} (${user.walletAddress})`);
      
      return user;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.preferences !== undefined) {
        fields.push(`preferences = $${paramIndex++}`);
        values.push(JSON.stringify(updates.preferences));
      }

      if (updates.profile !== undefined) {
        fields.push(`profile = $${paramIndex++}`);
        values.push(JSON.stringify(updates.profile));
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(userId);

      const query = `
        UPDATE users 
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING id, wallet_address, role, is_test_user, preferences, profile, created_at, updated_at, last_login_at
      `;

      const result = await this.db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      logger.info(`Updated user: ${userId}`);

      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Update last login time
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.db.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [userId]
      );
      
      logger.info(`Updated last login for user: ${userId}`);
    } catch (error) {
      logger.error('Error updating last login:', error);
      throw error;
    }
  }

  /**
   * Set user role (admin only)
   */
  async setUserRole(userId: string, role: UserRole): Promise<void> {
    try {
      await this.db.query(
        'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2',
        [role, userId]
      );
      
      logger.info(`Set user ${userId} role to ${role}`);
    } catch (error) {
      logger.error('Error setting user role:', error);
      throw error;
    }
  }

  /**
   * Check if user is admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        'SELECT role FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      return result.rows[0].role === UserRole.ADMIN;
    } catch (error) {
      logger.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Get users by IDs
   */
  async getUsersByIds(userIds: string[]): Promise<User[]> {
    try {
      if (userIds.length === 0) {
        return [];
      }

      const result = await this.db.query(
        `SELECT 
          id, wallet_address, role, is_test_user,
          preferences, profile, created_at, updated_at, last_login_at
         FROM users 
         WHERE id = ANY($1)`,
        [userIds]
      );

      return result.rows.map(row => this.mapRowToUser(row));
    } catch (error) {
      logger.error('Error getting users by IDs:', error);
      throw error;
    }
  }

  /**
   * Get all admin users
   */
  async getAdminUsers(): Promise<User[]> {
    try {
      const result = await this.db.query(
        `SELECT 
          id, wallet_address, role, is_test_user,
          preferences, profile, created_at, updated_at, last_login_at
         FROM users 
         WHERE role = $1`,
        [UserRole.ADMIN]
      );

      return result.rows.map(row => this.mapRowToUser(row));
    } catch (error) {
      logger.error('Error getting admin users:', error);
      throw error;
    }
  }

  /**
   * Get or create user by wallet address
   * Used during authentication
   */
  async getOrCreateUser(
    address: string,
    preferences: UserPreferences = {},
    profile: UserProfile = {}
  ): Promise<User> {
    try {
      // Try to get existing user
      let user = await this.getUserByWalletAddress(address);

      if (user) {
        // Update last login
        await this.updateLastLogin(user.id);
        return user;
      }

      // Create new user
      user = await this.createUser(address, preferences, profile);
      
      return user;
    } catch (error) {
      logger.error('Error getting or creating user:', error);
      throw error;
    }
  }

  /**
   * Map database row to User object
   */
  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      walletAddress: row.wallet_address,
      role: row.role as UserRole,
      isTestUser: row.is_test_user || false,
      preferences: row.preferences || {},
      profile: row.profile || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at
    };
  }
}
