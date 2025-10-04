import { Pool } from 'pg';
import { readFileSync, readdirSync } from 'fs';
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

async function runMigrations() {
  console.log('🗄️  Running database migrations...\n');

  try {
    // Get all migration files
    const migrationsDir = join(__dirname, 'migrations');
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration files:\n`);

    for (const file of files) {
      console.log(`  📄 Running ${file}...`);
      const sql = readFileSync(join(migrationsDir, file), 'utf-8');
      
      await pool.query(sql);
      console.log(`  ✅ ${file} completed\n`);
    }

    console.log('✅ All migrations completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
