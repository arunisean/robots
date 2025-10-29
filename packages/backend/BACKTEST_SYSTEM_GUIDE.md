# Backtest System Guide

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd packages/backend
npm install unzipper @types/unzipper
```

### 2. Run Database Migration

```bash
npm run db:migrate
```

This will create the following tables:
- `historical_datasets` - Stores historical data metadata
- `data_download_jobs` - Tracks download tasks
- `dataset_verifications` - Data integrity checks
- `backtest_jobs` - Backtest execution tasks
- `backtest_results` - Backtest results and metrics
- `optimization_jobs` - Parameter optimization tasks

### 3. Start the Server

```bash
npm run dev
```

### 4. Test the System

```bash
npx tsx src/test-backtest-system.ts
```

## 📡 API Endpoints

### Admin Endpoints (Localhost Only)

These endpoints are only accessible from `localhost` (127.0.0.1):

#### Download Historical Data
```bash
POST http://localhost:3001/api/admin/data/download
Content-Type: application/json

{
  "marketType": "spot",
  "symbols": ["BTCUSDT", "ETHUSDT"],
  "intervals": ["1h", "1d"],
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "dataType": "klines",
  "options": {
    "verifyChecksum": true,
    "overwriteExisting": false,
    "maxConcurrentDownloads": 3
  }
}
```

#### Get Download Status
```bash
GET http://localhost:3001/api/admin/data/download/:jobId
```

#### Cancel Download
```bash
DELETE http://localhost:3001/api/admin/data/download/:jobId
```

#### List All Datasets (Admin View)
```bash
GET http://localhost:3001/api/admin/data/datasets
GET http://localhost:3001/api/admin/data/datasets?marketType=spot&symbols=BTCUSDT
```

#### Delete Dataset
```bash
DELETE http://localhost:3001/api/admin/data/datasets/:id
```

#### Verify Dataset
```bash
POST http://localhost:3001/api/admin/data/datasets/:id/verify
```

#### Get Storage Statistics
```bash
GET http://localhost:3001/api/admin/data/storage
```

#### Export Metadata
```bash
GET http://localhost:3001/api/admin/data/export?format=json
GET http://localhost:3001/api/admin/data/export?format=csv
```

### Public Endpoints (All Users)

These endpoints are accessible from anywhere:

#### List Available Datasets
```bash
GET http://localhost:3001/api/data/datasets
GET http://localhost:3001/api/data/datasets?marketType=spot&symbols=BTCUSDT
```

#### Check Data Availability
```bash
GET http://localhost:3001/api/data/datasets/available?symbol=BTCUSDT&interval=1h&marketType=spot
```

#### Get Available Symbols
```bash
GET http://localhost:3001/api/data/symbols
GET http://localhost:3001/api/data/symbols?marketType=spot
```

#### Get Available Intervals
```bash
GET http://localhost:3001/api/data/intervals
GET http://localhost:3001/api/data/intervals?marketType=spot
```

#### Query Kline Data
```bash
POST http://localhost:3001/api/data/klines/query
Content-Type: application/json

{
  "symbol": "BTCUSDT",
  "interval": "1h",
  "marketType": "spot",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "limit": 1000
}
```

## 📊 Data Structure

### Market Types
- `spot` - Spot trading
- `futures-um` - USDT-margined futures
- `futures-cm` - Coin-margined futures
- `options` - Options trading

### Intervals
- Minutes: `1m`, `3m`, `5m`, `15m`, `30m`
- Hours: `1h`, `2h`, `4h`, `6h`, `8h`, `12h`
- Days: `1d`, `3d`
- Weeks: `1w`
- Months: `1mo`

### Data Storage

Downloaded data is stored in:
```
data/historical/
├── spot/
│   ├── BTCUSDT/
│   │   ├── 1m/
│   │   │   └── BTCUSDT-1m-2024-01.csv
│   │   ├── 1h/
│   │   └── 1d/
│   └── ETHUSDT/
├── futures-um/
├── futures-cm/
└── options/
```

## 🔒 Security

### Localhost-Only Access

Admin endpoints check the request IP address:
- ✅ Allowed: `127.0.0.1`, `::1`, `::ffff:127.0.0.1`, `localhost`
- ❌ Blocked: All other IPs return `403 Forbidden`

### Data Privacy

Public endpoints return limited information:
- ✅ Included: Symbol, interval, date range, data points count
- ❌ Hidden: File paths, checksums, internal metadata

## 🧪 Testing

### Test Download (Small Dataset)

```bash
curl -X POST http://localhost:3001/api/admin/data/download \
  -H "Content-Type: application/json" \
  -d '{
    "marketType": "spot",
    "symbols": ["BTCUSDT"],
    "intervals": ["1d"],
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "dataType": "klines"
  }'
```

### Check Download Status

```bash
curl http://localhost:3001/api/admin/data/download/{jobId}
```

### List Downloaded Data

```bash
curl http://localhost:3001/api/data/datasets
```

## 📝 Notes

1. **First Download**: The first download may take time depending on the date range and number of symbols
2. **Disk Space**: Ensure you have sufficient disk space (1 month of 1m data ≈ 50MB per symbol)
3. **Network**: Binance public data is hosted on AWS S3, ensure stable internet connection
4. **Checksum**: Enable checksum verification for data integrity (slightly slower)
5. **Concurrent Downloads**: Adjust `maxConcurrentDownloads` based on your network bandwidth

## 🐛 Troubleshooting

### "403 Forbidden" on Admin Endpoints
- Ensure you're accessing from localhost
- Check if you're using `127.0.0.1` or `localhost` in the URL

### Download Fails
- Check internet connection
- Verify the symbol exists on Binance
- Check if the date range has available data
- Review failed files in the download job status

### Database Connection Error
- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Run `npm run db:migrate` to create tables

## 🎯 Next Steps

1. Download some historical data
2. Implement backtest execution engine
3. Create parameter optimization
4. Build frontend UI for data management
5. Add more data sources (OKX, Coinbase, etc.)
