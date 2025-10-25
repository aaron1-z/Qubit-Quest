#!/bin/bash
set -e

# Build frontend
cd ../frontend
npm install
npx parcel build public/index.html --dist-dir dist --public-url ./

# Go back to backend
cd ../backend
pip install -r requirements.txt

# Copy built frontend to FastAPI static folder
mkdir -p app/static
cp -r ../frontend/dist/* app/static/

# Run FastAPI app
exec uvicorn app.main:app --host 0.0.0.0 --port 8000