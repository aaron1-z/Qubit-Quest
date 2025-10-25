#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "🚀 Starting FastAPI backend..."
uvicorn app.main:app --host 0.0.0.0 --port 8000