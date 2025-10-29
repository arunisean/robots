/**
 * Test script for backtest system
 * Tests data download and management functionality
 */

import { Pool } from 'pg';
import { config } from './config';
import { BinanceDataDownloader } from './services/BinanceDataDownloader';
import { HistoricalDataManager } from './services/HistoricalDataManager';

async function main() {
  console.log('🧪 Testing Backtest System\n');

  // Create database connection
  const pool = new Pool({
    connectionString: config.DATABASE_URL
  });

  try {
    // Test database connection
    console.log('1️⃣  Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected\n');

    // Initialize services
    console.log('2️⃣  Initializing services...');
    const downloader = new BinanceDataDownloader(pool);
    const manager = new HistoricalDataManager(pool);
    console.log('✅ Services initialized\n');

    // Test listing available symbols
    console.log('3️⃣  Testing available symbols...');
    const symbols = await downloader.listAvailableSymbols('spot');
    console.log(`✅ Found ${symbols.length} symbols:`, symbols.slice(0, 5).join(', '), '...\n');

    // Test getting unique symbols from database
    console.log('4️⃣  Testing database queries...');
    const dbSymbols = await manager.getUniqueSymbols();
    console.log(`✅ Found ${dbSymbols.length} symbols in database\n`);

    // Test storage stats
    console.log('5️⃣  Testing storage statistics...');
    const stats = await manager.getStorageStats();
    console.log('✅ Storage stats:', {
      totalDatasets: stats.totalDatasets,
      totalSize: `${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`
    });
    console.log('');

    // Example: Start a small download (commented out to avoid actual download)
    console.log('6️⃣  Download example (not executed):');
    console.log(`
    const job = await downloader.downloadHistoricalData({
      marketType: 'spot',
      symbols: ['BTCUSDT'],
      intervals: ['1h'],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      dataType: 'klines',
      options: {
        verifyChecksum: true,
        overwriteExisting: false,
        maxConcurrentDownloads: 2
      }
    });
    `);

    console.log('\n✅ All tests passed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run database migration: npm run db:migrate');
    console.log('   2. Start the server: npm run dev');
    console.log('   3. Access admin API at: http://localhost:3001/api/admin/data');
    console.log('   4. Access public API at: http://localhost:3001/api/data');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
