import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';

async function runMigration006() {
  const pool = new Pool({
    connectionString: config.DATABASE_URL
  });

  try {
    console.log('🗄️  Running migration 006_backtest_system.sql...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '006_backtest_system.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Execute migration
    await pool.query(sql);

    console.log('✅ Migration 006_backtest_system.sql completed successfully!\n');
    console.log('Created tables:');
    console.log('  - historical_datasets');
    console.log('  - data_download_jobs');
    console.log('  - dataset_verifications');
    console.log('  - backtest_jobs');
    console.log('  - backtest_results');
    console.log('  - optimization_jobs');

  } catch (error: any) {
    if (error.code === '42P07') {
      console.log('ℹ️  Tables already exist, skipping migration 006');
    } else {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  } finally {
    await pool.end();
  }
}

runMigration006().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
