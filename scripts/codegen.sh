#!/bin/bash

# Script to run Playwright codegen with preview server

URL="http://127.0.0.1:8787"
echo "🚀 Starting preview server and codegen..."
pnpm preview:test &
SERVER_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server to be ready at $URL..."
while ! curl -s "$URL" > /dev/null 2>&1; do
  sleep 1
done

echo "✅ Server is ready!"
echo "🎬 Starting Playwright codegen..."

# Run codegen
playwright codegen "$URL"

# Cleanup: kill the server when codegen exits
echo "🛑 Stopping server..."
kill $SERVER_PID 2>/dev/null

echo "👋 Done!"
