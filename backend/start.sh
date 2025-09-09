#!/bin/bash
set -e

echo "Starting application..."

# Change to backend directory
cd /app/backend

# Run database migrations
echo "Running database migrations..."
alembic upgrade head

# Start the FastAPI application
echo "Starting FastAPI server..."
exec python -m uvicorn backend.main:app --host 0.0.0.0 --port 8001