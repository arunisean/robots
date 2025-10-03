import { Pool } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';

export interface Migration {
  id: string;
  name: string;
  sql: string;
  appliedAt?: Date;
}

export class MigrationManager {
  private pool: Pool;
  private migrationsPath: string;

  constructor(pool: Pool, migrationsPath?: string) {
    this.pool = pool;
    this.migrationsPath = migrationsPath || join(__dirname, 'migrations');
  }

  /**
   * 初始化迁移表
   */
  async initializeMigrationTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW()
      );
    `;

    try {
      await this.pool.query(createTableSQL);
      logger.info('Migration table initialized');
    } catch (error) {
      logger.error('Failed to initialize migration table:', error);
      throw error;
    }
  }

  /**
   * 获取所有迁移文件
   */
  private getMigrationFiles(): Migration[] {
    try {
      const files = readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();

      return files.map(file => {
        const id = file.replace('.sql', '');
        const name = id.replace(/^\d+_/, '').replace(/_/g, ' ');
        const sql = readFileSync(join(this.migrationsPath, file), 'utf8');

        return { id, name, sql };
      });
    } catch (error) {
      logger.error('Failed to read migration files:', error);
      throw error;
    }
  }

  /**
   * 获取已应用的迁移
   */
  private async getAppliedMigrations(): Promise<string[]> {
    try {
      const result = await this.pool.query('SELECT id FROM migrations ORDER BY applied_at');
      return result.rows.map(row => row.id);
    } catch (error) {
      logger.error('Failed to get applied migrations:', error);
      throw error;
    }
  }

  /**
   * 应用单个迁移
   */
  private async applyMigration(migration: Migration): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 执行迁移SQL
      await client.query(migration.sql);
      
      // 记录迁移
      await client.query(
        'INSERT INTO migrations (id, name) VALUES ($1, $2)',
        [migration.id, migration.name]
      );
      
      await client.query('COMMIT');
      logger.info(`Applied migration: ${migration.id} - ${migration.name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Failed to apply migration ${migration.id}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 运行所有待处理的迁移
   */
  async runMigrations(): Promise<void> {
    try {
      await this.initializeMigrationTable();
      
      const allMigrations = this.getMigrationFiles();
      const appliedMigrations = await this.getAppliedMigrations();
      
      const pendingMigrations = allMigrations.filter(
        migration => !appliedMigrations.includes(migration.id)
      );

      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations');
        return;
      }

      logger.info(`Found ${pendingMigrations.length} pending migrations`);

      for (const migration of pendingMigrations) {
        await this.applyMigration(migration);
      }

      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * 获取迁移状态
   */
  async getMigrationStatus(): Promise<{
    total: number;
    applied: number;
    pending: number;
    migrations: Array<Migration & { applied: boolean }>;
  }> {
    try {
      await this.initializeMigrationTable();
      
      const allMigrations = this.getMigrationFiles();
      const appliedMigrations = await this.getAppliedMigrations();
      
      const migrations = allMigrations.map(migration => ({
        ...migration,
        applied: appliedMigrations.includes(migration.id)
      }));

      return {
        total: allMigrations.length,
        applied: appliedMigrations.length,
        pending: allMigrations.length - appliedMigrations.length,
        migrations
      };
    } catch (error) {
      logger.error('Failed to get migration status:', error);
      throw error;
    }
  }

  /**
   * 创建新的迁移文件
   */
  async createMigration(name: string, sql: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
    const filename = `${timestamp}_${name.replace(/\s+/g, '_').toLowerCase()}.sql`;
    const filepath = join(this.migrationsPath, filename);

    try {
      const fs = await import('fs/promises');
      await fs.writeFile(filepath, sql, 'utf8');
      logger.info(`Created migration file: ${filename}`);
      return filename;
    } catch (error) {
      logger.error('Failed to create migration file:', error);
      throw error;
    }
  }

  /**
   * 验证数据库连接
   */
  async validateConnection(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database connection validation failed:', error);
      return false;
    }
  }

  /**
   * 获取数据库版本信息
   */
  async getDatabaseInfo(): Promise<{
    version: string;
    size: string;
    tables: number;
    indexes: number;
  }> {
    try {
      const versionResult = await this.pool.query('SELECT version()');
      const sizeResult = await this.pool.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);
      const tablesResult = await this.pool.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      const indexesResult = await this.pool.query(`
        SELECT COUNT(*) as count 
        FROM pg_indexes 
        WHERE schemaname = 'public'
      `);

      return {
        version: versionResult.rows[0].version,
        size: sizeResult.rows[0].size,
        tables: parseInt(tablesResult.rows[0].count),
        indexes: parseInt(indexesResult.rows[0].count)
      };
    } catch (error) {
      logger.error('Failed to get database info:', error);
      throw error;
    }
  }
}