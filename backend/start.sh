#!/bin/bash
cd frontend
npm install
npm run build

cd ../backend
pip install -r requirements.txt

# Copy built frontend to backend/public for FastAPI to serve
mkdir -p app/static
cp -r ../frontend/dist/* app/static/

# Run FastAPI app
uvicorn app.main:app --host 0.0.0.0 --port 8000