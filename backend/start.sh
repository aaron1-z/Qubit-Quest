#!/bin/bash
set -e
cd "$(dirname "$0")/.."

# Build frontend
cd frontend
npm install --legacy-peer-deps
npx parcel build public/index.html --dist-dir dist --public-url ./

# Back to backend
cd ../backend
pip install -r requirements.txt

# Copy frontend build into backend static folder
mkdir -p app/static
cp -r ../frontend/dist/* app/static/

# Start FastAPI
exec uvicorn app.main:app --host 0.0.0.0 --port 8000