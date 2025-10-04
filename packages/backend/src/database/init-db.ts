import { Client } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function initDatabase() {
  console.log('🗄️  Initializing database...\n');

  // Connect to postgres database to create our database
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'postgres', // Connect to default postgres database
    user: process.env.DB_USER || process.env.USER,
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL\n');

    // Check if database exists
    const dbName = process.env.DB_NAME || 'multi_agent_platform';
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (result.rows.length === 0) {
      console.log(`📦 Creating database: ${dbName}...`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database ${dbName} created successfully!\n`);
    } else {
      console.log(`✅ Database ${dbName} already exists\n`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

initDatabase();
