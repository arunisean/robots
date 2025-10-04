import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'multi_agent_platform',
  user: process.env.DB_USER || process.env.USER,
  password: process.env.DB_PASSWORD,
});

async function runMigration003() {
  console.log('🗄️  Running migration 003: Add Permissions and Audit...\n');

  try {
    const sql = readFileSync(
      join(__dirname, 'migrations', '003_add_permissions_and_audit.sql'),
      'utf-8'
    );
    
    await pool.query(sql);
    console.log('✅ Migration 003 completed successfully!\n');
    
    // Run seed data for permissions
    console.log('🌱 Running permissions seed data...\n');
    const seedSql = readFileSync(
      join(__dirname, 'seeds', '002_permissions_setup.sql'),
      'utf-8'
    );
    
    await pool.query(seedSql);
    console.log('✅ Permissions seed data completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration003();
