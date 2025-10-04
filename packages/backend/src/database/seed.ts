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
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function runSeeds() {
  console.log('🌱 Running database seeds...\n');

  try {
    // Get all seed files
    const seedsDir = join(__dirname, 'seeds');
    const files = readdirSync(seedsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} seed files:\n`);

    for (const file of files) {
      console.log(`  📄 Running ${file}...`);
      const sql = readFileSync(join(seedsDir, file), 'utf-8');
      
      await pool.query(sql);
      console.log(`  ✅ ${file} completed\n`);
    }

    console.log('✅ All seeds completed successfully!\n');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSeeds();
