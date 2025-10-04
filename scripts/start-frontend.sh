#!/bin/bash

# Start frontend development server

echo "🚀 Starting Frontend Development Server..."
echo ""

cd packages/frontend

echo "📦 Installing dependencies (if needed)..."
npm install --silent

echo ""
echo "🎨 Starting Next.js development server..."
echo "Frontend will be available at: http://localhost:3000"
echo ""

npm run dev
